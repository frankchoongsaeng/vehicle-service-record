import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { createRequestHandler } from '@remix-run/express'
import authRouter from './routes/auth.js'
import vehiclesRouter from './routes/vehicles.js'
import recordsRouter from './routes/records.js'
import { attachAuthUser } from './middleware/auth.js'
import { logger } from './logging/logger.js'
import { errorLoggingMiddleware, requestLoggingMiddleware } from './middleware/requestLogging.js'

const app = express()
const PORT = Number(process.env.PORT) || 3001

process.on('unhandledRejection', reason => {
    logger.error('process.unhandled_rejection', { reason })
})

process.on('uncaughtException', error => {
    logger.error('process.uncaught_exception', { error })
})

app.set('trust proxy', 1)
app.use(cors())
app.use(express.json())
app.use(requestLoggingMiddleware)
app.use(attachAuthUser)

// Rate limiting: max 200 requests per minute per IP for all API routes
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
    handler: (req, res, _next, options) => {
        logger.warn('request.rate_limited', {
            requestId: req.requestId,
            method: req.method,
            path: req.originalUrl,
            ip: req.ip,
            userId: req.authUser?.id ?? undefined,
            limit: options.limit,
            windowMs: options.windowMs
        })

        res.status(options.statusCode).json(options.message)
    }
})
app.use('/api', apiLimiter)

// Routes
app.use('/api/auth', authRouter)
app.use('/api/vehicles', vehiclesRouter)
app.use('/api/vehicles/:vehicleId/records', recordsRouter)

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// In development, use Vite's middleware for hot reloading. In production, serve the built client.
const viteDevServer =
    process.env.NODE_ENV === 'production'
        ? null
        : await import('vite').then(vite =>
              vite.createServer({
                  server: { middlewareMode: true }
              })
          )

app.use(viteDevServer ? viteDevServer.middlewares : express.static('./dist/ui/client'))

const build = viteDevServer
    ? () => viteDevServer.ssrLoadModule('virtual:remix/server-build')
    : await import('../dist/ui/server/index.js' as string)

// All other requests are handled by Remix
app.all('*', createRequestHandler({ build }))
app.use(errorLoggingMiddleware)

app.listen(PORT, '0.0.0.0', () => {
    logger.info('server.started', {
        port: PORT,
        nodeEnv: process.env.NODE_ENV ?? 'development',
        logLevel: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
        prismaQueryLogging: process.env.LOG_PRISMA_QUERIES === 'true',
        readRequestSampleRate: process.env.LOG_READ_REQUEST_SAMPLE_RATE ?? (process.env.NODE_ENV === 'production' ? '0.1' : '1'),
        logFilePath: process.env.LOG_FILE_PATH ?? undefined
    })
})

import './monitoring/server.js'
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import * as Sentry from '@sentry/node'
import { createRequestHandler } from '@remix-run/express'
import authRouter from './routes/auth.js'
import billingRouter, { stripeWebhookHandler, stripeWebhookRawParser } from './routes/billing.js'
import maintenancePlansRouter from './routes/maintenancePlans.js'
import remindersRouter from './routes/reminders.js'
import settingsRouter from './routes/settings.js'
import vehiclesRouter from './routes/vehicles.js'
import recordsRouter from './routes/records.js'
import workshopsRouter from './routes/workshops.js'
import { attachAuthUser } from './middleware/auth.js'
import { logger } from './logging/logger.js'
import { errorLoggingMiddleware, requestLoggingMiddleware } from './middleware/requestLogging.js'
import { bindRequestMonitoringContext, captureServerException } from './monitoring/server.js'

const app = express()
const PORT = Number(process.env.PORT) || 3001

function normalizeOrigin(value: string | undefined | null): string | null {
    const trimmed = value?.trim()

    if (!trimmed) {
        return null
    }

    return trimmed.replace(/\/+$/, '')
}

const configuredCorsOrigin = normalizeOrigin(process.env.APP_ORIGIN)
const corsOptions: cors.CorsOptions = {
    origin(origin, callback) {
        if (!origin) {
            callback(null, true)
            return
        }

        const normalizedOrigin = normalizeOrigin(origin)

        if (!configuredCorsOrigin || !normalizedOrigin) {
            logger.warn('cors.origin_blocked', {
                origin,
                configuredOrigin: configuredCorsOrigin ?? undefined,
                reason: configuredCorsOrigin ? 'invalid_origin' : 'missing_app_origin'
            })
            callback(null, false)
            return
        }

        if (normalizedOrigin === configuredCorsOrigin) {
            callback(null, true)
            return
        }

        logger.warn('cors.origin_blocked', {
            origin: normalizedOrigin,
            configuredOrigin: configuredCorsOrigin,
            reason: 'origin_mismatch'
        })
        callback(null, false)
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    optionsSuccessStatus: 204
}

process.on('unhandledRejection', reason => {
    captureServerException(reason, { lifecycle: 'process.unhandledRejection' })
    logger.error('process.unhandled_rejection', { reason })
})

process.on('uncaughtException', error => {
    captureServerException(error, { lifecycle: 'process.uncaughtException' })
    logger.error('process.uncaught_exception', { error })
})

app.set('trust proxy', 1)
app.use(cors(corsOptions))
app.post('/api/billing/webhooks/stripe', stripeWebhookRawParser, stripeWebhookHandler)
app.use(express.json())
app.use(requestLoggingMiddleware)
app.use(attachAuthUser)
app.use(bindRequestMonitoringContext)

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
app.use('/api/billing', billingRouter)
app.use('/api/reminders', remindersRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/vehicles', vehiclesRouter)
app.use('/api/workshops', workshopsRouter)
app.use('/api/vehicles/:vehicleId/maintenance-plans', maintenancePlansRouter)
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
Sentry.setupExpressErrorHandler(app)
app.use(errorLoggingMiddleware)

app.listen(PORT, '0.0.0.0', () => {
    logger.info('server.started', {
        processRole: 'web',
        port: PORT,
        nodeEnv: process.env.NODE_ENV ?? 'development',
        logLevel: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
        prismaQueryLogging: process.env.LOG_PRISMA_QUERIES === 'true',
        readRequestSampleRate:
            process.env.LOG_READ_REQUEST_SAMPLE_RATE ?? (process.env.NODE_ENV === 'production' ? '0.1' : '1'),
        logFilePath: process.env.LOG_FILE_PATH ?? undefined
    })
})

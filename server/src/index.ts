import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import authRouter from './routes/auth.js'
import vehiclesRouter from './routes/vehicles.js'
import recordsRouter from './routes/records.js'
import { attachAuthUser } from './middleware/auth.js'

const app = express()
const PORT = Number(process.env.PORT) || 3001

app.set('trust proxy', 1)
app.use(cors())
app.use(express.json())
app.use(attachAuthUser)

// Rate limiting: max 200 requests per minute per IP for all API routes
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express API server running on http://0.0.0.0:${PORT}`)
})

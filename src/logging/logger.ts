import { appendFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { inspect } from 'node:util'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'
type LogContext = Record<string, unknown>

const LOG_LEVEL_RANK: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40
}

const SENSITIVE_KEYS = new Set([
    'authorization',
    'cookie',
    'password',
    'password_hash',
    'set-cookie',
    'token',
    'secret'
])

const configuredLogLevel = resolveLogLevel(
    process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'development' ? 'debug' : 'info')
)
const configuredLogFilePath = process.env.LOG_FILE_PATH?.trim() || null

let fileTransportReady: Promise<void> | null = null
let fileTransportWriteChain: Promise<void> = Promise.resolve()
let fileTransportFailureReported = false

function resolveLogLevel(value: string): LogLevel {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'debug' || normalized === 'info' || normalized === 'warn' || normalized === 'error') {
        return normalized
    }

    return 'info'
}

function shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_RANK[level] >= LOG_LEVEL_RANK[configuredLogLevel]
}

function reportFileTransportFailure(error: unknown): void {
    if (fileTransportFailureReported) {
        return
    }

    fileTransportFailureReported = true
    console.error(
        JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'logger.file_transport_failed',
            logFilePath: configuredLogFilePath,
            error: sanitizeValue(error)
        })
    )
}

async function ensureFileTransportReady(): Promise<void> {
    if (!configuredLogFilePath) {
        return
    }

    if (!fileTransportReady) {
        fileTransportReady = mkdir(dirname(configuredLogFilePath), { recursive: true })
            .then(() => undefined)
            .catch(error => {
                reportFileTransportFailure(error)
                throw error
            })
    }

    await fileTransportReady
}

function writeToFileTransport(serialized: string): void {
    if (!configuredLogFilePath) {
        return
    }

    fileTransportWriteChain = fileTransportWriteChain
        .then(async () => {
            await ensureFileTransportReady()
            await appendFile(configuredLogFilePath, `${serialized}\n`, 'utf8')
        })
        .catch(error => {
            reportFileTransportFailure(error)
        })
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Object.prototype.toString.call(value) === '[object Object]'
}

function sanitizeValue(value: unknown, key?: string): unknown {
    if (key && SENSITIVE_KEYS.has(key.toLowerCase())) {
        return '[REDACTED]'
    }

    if (value instanceof Error) {
        return {
            name: value.name,
            message: value.message,
            stack: value.stack
        }
    }

    if (value instanceof Date) {
        return value.toISOString()
    }

    if (typeof value === 'bigint') {
        return value.toString()
    }

    if (typeof value === 'function') {
        return `[Function ${value.name || 'anonymous'}]`
    }

    if (typeof value === 'symbol') {
        return value.toString()
    }

    if (Buffer.isBuffer(value)) {
        return `[Buffer ${value.length} bytes]`
    }

    if (Array.isArray(value)) {
        return value.map(item => sanitizeValue(item))
    }

    if (isPlainObject(value)) {
        return Object.fromEntries(
            Object.entries(value).map(([entryKey, entryValue]) => [entryKey, sanitizeValue(entryValue, entryKey)])
        )
    }

    return value
}

function writeLog(level: LogLevel, message: string, context: LogContext = {}): void {
    if (!shouldLog(level)) {
        return
    }

    const payload = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...(sanitizeValue(context) as LogContext)
    }

    const serialized = JSON.stringify(payload, (_key, value) => {
        if (typeof value === 'undefined') {
            return null
        }

        return value
    })

    writeToFileTransport(serialized)

    if (level === 'error') {
        console.error(serialized)
        return
    }

    if (level === 'warn') {
        console.warn(serialized)
        return
    }

    if (level === 'debug') {
        console.debug(serialized)
        return
    }

    console.info(serialized)
}

function mergeContext(baseContext: LogContext, context?: LogContext): LogContext {
    if (!context) {
        return baseContext
    }

    return {
        ...baseContext,
        ...context
    }
}

export function createLogger(baseContext: LogContext = {}) {
    return {
        debug(message: string, context?: LogContext): void {
            writeLog('debug', message, mergeContext(baseContext, context))
        },
        info(message: string, context?: LogContext): void {
            writeLog('info', message, mergeContext(baseContext, context))
        },
        warn(message: string, context?: LogContext): void {
            writeLog('warn', message, mergeContext(baseContext, context))
        },
        error(message: string, context?: LogContext): void {
            writeLog('error', message, mergeContext(baseContext, context))
        }
    }
}

export function formatForLog(value: unknown): string {
    return inspect(sanitizeValue(value), { depth: 5, breakLength: 120, compact: true })
}

export const logger = createLogger({ service: 'vehicle-service-record-backend' })

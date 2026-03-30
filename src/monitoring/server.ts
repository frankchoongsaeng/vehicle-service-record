import 'dotenv/config'
import type { NextFunction, Request, Response } from 'express'
import * as Sentry from '@sentry/node'
import type { SeverityLevel } from '@sentry/node'

type MonitoringContext = Record<string, unknown>

const SENSITIVE_KEYS = new Set([
    'authorization',
    'cookie',
    'password',
    'password_hash',
    'set-cookie',
    'token',
    'secret'
])

function parseSampleRate(rawValue: string | undefined, fallback: number): number {
    const parsed = Number(rawValue)
    if (!Number.isFinite(parsed)) {
        return fallback
    }

    return Math.min(1, Math.max(0, parsed))
}

function sanitizeMonitoringValue(value: unknown, key?: string): unknown {
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

    if (Array.isArray(value)) {
        return value.map(item => sanitizeMonitoringValue(item))
    }

    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [
                entryKey,
                sanitizeMonitoringValue(entryValue, entryKey)
            ])
        )
    }

    return value
}

function sanitizeMonitoringContext(context: MonitoringContext): Record<string, unknown> {
    return sanitizeMonitoringValue(context) as Record<string, unknown>
}

function toSeverityLevel(level: 'debug' | 'info' | 'warn' | 'error'): SeverityLevel {
    switch (level) {
        case 'warn':
            return 'warning'
        case 'error':
            return 'error'
        case 'debug':
            return 'debug'
        default:
            return 'info'
    }
}

function toSpanAttributes(context: MonitoringContext): Record<string, string | number | boolean | undefined> {
    const sanitizedContext = sanitizeMonitoringContext(context)

    return Object.fromEntries(
        Object.entries(sanitizedContext).map(([key, value]) => {
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                return [key, value]
            }

            if (value == null) {
                return [key, undefined]
            }

            return [key, JSON.stringify(value)]
        })
    )
}

function resolveMonitoringDsn(): string | null {
    const configuredDsn = process.env.BUGSINK_DSN?.trim() || process.env.SENTRY_DSN?.trim()
    return configuredDsn || null
}

const monitoringDsn = resolveMonitoringDsn()
const monitoringEnabled = Boolean(monitoringDsn) && process.env.BUGSINK_ENABLED !== 'false'

if (monitoringEnabled) {
    Sentry.init({
        dsn: monitoringDsn ?? undefined,
        environment: process.env.BUGSINK_ENVIRONMENT?.trim() || process.env.NODE_ENV || 'development',
        tracesSampleRate: parseSampleRate(process.env.BUGSINK_TRACES_SAMPLE_RATE, 0.15),
        profilesSampleRate: parseSampleRate(process.env.BUGSINK_PROFILES_SAMPLE_RATE, 0),
        sendDefaultPii: false,
        normalizeDepth: 6,
        integrations: [Sentry.expressIntegration(), Sentry.prismaIntegration(), Sentry.extraErrorDataIntegration()]
    })
}

export function isServerMonitoringEnabled(): boolean {
    return monitoringEnabled
}

export function bindRequestMonitoringContext(req: Request, _res: Response, next: NextFunction): void {
    if (!monitoringEnabled) {
        next()
        return
    }

    const path = req.originalUrl || req.path
    Sentry.setTag('request_id', req.requestId ?? 'unknown')
    Sentry.setTag('http.method', req.method)
    Sentry.setTag('http.route', path)
    Sentry.setContext('request', {
        requestId: req.requestId,
        method: req.method,
        path,
        query: Object.keys(req.query).length > 0 ? sanitizeMonitoringContext(req.query as MonitoringContext) : undefined
    })

    if (req.authUser) {
        Sentry.setUser({
            id: req.authUser.id,
            email: req.authUser.email
        })
    } else {
        Sentry.setUser(null)
    }

    next()
}

export function addServerMonitoringBreadcrumb(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    context: MonitoringContext = {}
): void {
    if (!monitoringEnabled) {
        return
    }

    Sentry.addBreadcrumb({
        type: 'default',
        category: 'log',
        level: toSeverityLevel(level),
        message,
        data: sanitizeMonitoringContext(context)
    })
}

export function captureServerException(error: unknown, context: MonitoringContext = {}): string | null {
    if (!monitoringEnabled) {
        return null
    }

    return Sentry.withScope(scope => {
        const sanitizedContext = sanitizeMonitoringContext(context)

        for (const [key, value] of Object.entries(sanitizedContext)) {
            scope.setExtra(key, value)
        }

        return Sentry.captureException(error)
    })
}

export function captureServerMessage(
    message: string,
    level: 'debug' | 'info' | 'warn' | 'error' = 'info',
    context: MonitoringContext = {}
): string | null {
    if (!monitoringEnabled) {
        return null
    }

    return Sentry.withScope(scope => {
        const sanitizedContext = sanitizeMonitoringContext(context)

        for (const [key, value] of Object.entries(sanitizedContext)) {
            scope.setExtra(key, value)
        }

        return Sentry.captureMessage(message, toSeverityLevel(level))
    })
}

export function withServerMonitoringSpan<T>(
    name: string,
    attributes: MonitoringContext,
    callback: () => T | Promise<T>
): T | Promise<T> {
    if (!monitoringEnabled) {
        return callback()
    }

    return Sentry.startSpan(
        {
            name,
            op: 'task',
            attributes: toSpanAttributes(attributes)
        },
        callback
    )
}

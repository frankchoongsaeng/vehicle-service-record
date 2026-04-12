import * as Sentry from '@sentry/react'

type MonitoringContext = Record<string, unknown>

type MonitoringUser = {
    id?: string | null
    email?: string | null
}

const SENSITIVE_KEYS = new Set(['authorization', 'cookie', 'password', 'set-cookie', 'token', 'secret'])

let initialized = false

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

function getMonitoringDsn(): string | null {
    const configuredDsn = import.meta.env.VITE_BUGSINK_DSN?.trim()
    return configuredDsn || null
}

export function isClientMonitoringEnabled(): boolean {
    return Boolean(getMonitoringDsn()) && import.meta.env.VITE_BUGSINK_ENABLED !== 'false'
}

export function initClientMonitoring(): void {
    if (initialized || !isClientMonitoringEnabled()) {
        return
    }

    initialized = true

    const replaySessionSampleRate = parseSampleRate(import.meta.env.VITE_BUGSINK_REPLAYS_SESSION_SAMPLE_RATE, 0)
    const replayOnErrorSampleRate = parseSampleRate(import.meta.env.VITE_BUGSINK_REPLAYS_ON_ERROR_SAMPLE_RATE, 1)
    const integrations = [Sentry.browserTracingIntegration()]

    if (replaySessionSampleRate > 0 || replayOnErrorSampleRate > 0) {
        integrations.push(
            Sentry.replayIntegration({
                maskAllText: true,
                blockAllMedia: true
            })
        )
    }

    Sentry.init({
        dsn: getMonitoringDsn(),
        environment: import.meta.env.VITE_BUGSINK_ENVIRONMENT?.trim() || import.meta.env.MODE,
        integrations,
        tracesSampleRate: parseSampleRate(import.meta.env.VITE_BUGSINK_TRACES_SAMPLE_RATE, 0.15),
        replaysSessionSampleRate: replaySessionSampleRate,
        replaysOnErrorSampleRate: replayOnErrorSampleRate,
        sendDefaultPii: false,
        tracePropagationTargets: [/^\//, /^https?:\/\/localhost(?::\d+)?\//]
    })
}

export function addClientMonitoringBreadcrumb(
    category: string,
    message: string,
    data: MonitoringContext = {},
    level: 'debug' | 'info' | 'warning' | 'error' = 'info'
): void {
    if (!isClientMonitoringEnabled()) {
        return
    }

    Sentry.addBreadcrumb({
        category,
        message,
        level,
        data: sanitizeMonitoringContext(data)
    })
}

export function captureClientException(error: unknown, context: MonitoringContext = {}): string | null {
    if (!isClientMonitoringEnabled()) {
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

export function setClientMonitoringUser(user: MonitoringUser | null): void {
    if (!isClientMonitoringEnabled()) {
        return
    }

    if (!user?.id && !user?.email) {
        Sentry.setUser(null)
        return
    }

    Sentry.setUser({
        id: user.id ?? undefined,
        email: user.email ?? undefined
    })
}

export function trackClientRouteChange(pathname: string, search: string, hash: string, navigationType: string): void {
    if (!isClientMonitoringEnabled()) {
        return
    }

    const route = `${pathname}${search}${hash}`
    Sentry.setTag('route', pathname)
    Sentry.setContext('navigation', {
        pathname,
        search,
        hash,
        navigationType
    })

    addClientMonitoringBreadcrumb('navigation', 'route.changed', {
        route,
        navigationType
    })
}

export function getClientTraceHeaders(): Record<string, string> {
    if (!isClientMonitoringEnabled()) {
        return {}
    }

    return Object.fromEntries(
        Object.entries(Sentry.getTraceData()).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    )
}

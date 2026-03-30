import { randomUUID } from 'node:crypto'
import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express'
import { logger } from '../logging/logger.js'
import { captureServerException } from '../monitoring/server.js'

const DEFAULT_READ_REQUEST_SAMPLE_RATE = process.env.NODE_ENV === 'production' ? 0.1 : 1

function resolveReadRequestSampleRate(): number {
    const rawValue = process.env.LOG_READ_REQUEST_SAMPLE_RATE
    if (!rawValue) {
        return DEFAULT_READ_REQUEST_SAMPLE_RATE
    }

    const parsed = Number(rawValue)
    if (!Number.isFinite(parsed)) {
        return DEFAULT_READ_REQUEST_SAMPLE_RATE
    }

    return Math.min(1, Math.max(0, parsed))
}

const readRequestSampleRate = resolveReadRequestSampleRate()

function summarizeValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        return {
            type: 'array',
            length: value.length
        }
    }

    if (value && typeof value === 'object') {
        return {
            type: 'object',
            keys: Object.keys(value as Record<string, unknown>).sort()
        }
    }

    if (typeof value === 'string') {
        return {
            type: 'string',
            length: value.length
        }
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return value
    }

    if (value == null) {
        return value
    }

    return typeof value
}

function getClientIp(req: Request): string | undefined {
    const forwardedFor = req.headers['x-forwarded-for']

    if (typeof forwardedFor === 'string') {
        return forwardedFor.split(',')[0]?.trim()
    }

    if (Array.isArray(forwardedFor)) {
        return forwardedFor[0]?.trim()
    }

    return req.ip
}

function getRequestContext(req: Request) {
    return {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        routeParams: Object.keys(req.params).length > 0 ? req.params : undefined,
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
        ip: getClientIp(req),
        userAgent: req.get('user-agent') ?? undefined,
        contentLength: req.get('content-length') ?? undefined,
        userId: req.authUser?.id ?? undefined
    }
}

function isReadRequest(req: Request): boolean {
    return req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS'
}

function shouldLogReadLifecycle(req: Request): boolean {
    if (process.env.NODE_ENV !== 'production') {
        return true
    }

    if (!isReadRequest(req)) {
        return true
    }

    return Math.random() <= readRequestSampleRate
}

export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
    const startedAt = process.hrtime.bigint()
    req.requestId = req.get('x-request-id')?.trim() || randomUUID()
    res.setHeader('x-request-id', req.requestId)
    const logReadLifecycle = shouldLogReadLifecycle(req)

    if (logReadLifecycle) {
        logger.info('request.started', {
            ...getRequestContext(req),
            body: summarizeValue(req.body),
            sampled: isReadRequest(req) && process.env.NODE_ENV === 'production' ? true : undefined
        })
    }

    let completed = false

    res.on('finish', () => {
        completed = true
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000
        const shouldAlwaysLog = res.statusCode >= 400 || !isReadRequest(req)
        if (!shouldAlwaysLog && !logReadLifecycle) {
            return
        }

        const logMethod = res.statusCode >= 500 ? logger.error : res.statusCode >= 400 ? logger.warn : logger.info

        logMethod('request.completed', {
            ...getRequestContext(req),
            statusCode: res.statusCode,
            durationMs: Number(durationMs.toFixed(2)),
            responseLength: res.getHeader('content-length') ?? undefined,
            sampled: !shouldAlwaysLog && process.env.NODE_ENV === 'production' ? true : undefined
        })
    })

    res.on('close', () => {
        if (completed) {
            return
        }

        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000
        logger.warn('request.aborted', {
            ...getRequestContext(req),
            durationMs: Number(durationMs.toFixed(2))
        })
    })

    next()
}

export const errorLoggingMiddleware: ErrorRequestHandler = (error, req, res, next) => {
    captureServerException(error, {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        userId: req.authUser?.id ?? undefined,
        statusCode: res.statusCode >= 400 ? res.statusCode : 500
    })

    logger.error('request.failed', {
        ...getRequestContext(req),
        statusCode: res.statusCode >= 400 ? res.statusCode : 500,
        error
    })

    if (res.headersSent) {
        next(error)
        return
    }

    res.status(500).json({
        error: 'Internal server error',
        requestId: req.requestId
    })
}

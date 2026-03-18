import type { NextFunction, Request, Response } from 'express'
import { getAuthenticatedUser } from '../auth/session.js'
import { createLogger } from '../logging/logger.js'

const authLogger = createLogger({ component: 'auth-middleware' })

export async function attachAuthUser(req: Request, _res: Response, next: NextFunction) {
    try {
        req.authUser = await getAuthenticatedUser(req)

        if (req.authUser) {
            authLogger.debug('auth.user_attached', {
                requestId: req.requestId,
                userId: req.authUser.id,
                path: req.originalUrl
            })
        }

        next()
    } catch (error) {
        next(error)
    }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.authUser) {
        authLogger.warn('auth.required_missing_user', {
            requestId: req.requestId,
            method: req.method,
            path: req.originalUrl,
            ip: req.ip
        })
        res.status(401).json({ error: 'Authentication required' })
        return
    }

    next()
}

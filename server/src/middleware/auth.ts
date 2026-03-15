import type { NextFunction, Request, Response } from 'express'
import { getAuthenticatedUser } from '../auth/session'

export async function attachAuthUser(req: Request, _res: Response, next: NextFunction) {
    try {
        req.authUser = await getAuthenticatedUser(req)
        next()
    } catch (error) {
        next(error)
    }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.authUser) {
        res.status(401).json({ error: 'Authentication required' })
        return
    }

    next()
}

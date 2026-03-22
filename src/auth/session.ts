import type { Request } from 'express'
import { prisma } from '../db.js'
import { createLogger } from '../logging/logger.js'
import { verifyOpenAuthToken } from '../openauth/token.js'
import { authUserSelect, serializeAuthUser } from './authUser.js'
import type { AuthUser } from '../types/auth.js'
import { readSessionToken } from './cookie.js'

const sessionLogger = createLogger({ component: 'session-auth' })

export async function getAuthenticatedUser(request: Request): Promise<AuthUser | null> {
    const token = readSessionToken(request.headers.cookie)
    if (!token) {
        return null
    }

    const claims = verifyOpenAuthToken(token)
    if (!claims) {
        sessionLogger.warn('auth.invalid_session_token', {
            requestId: request.requestId,
            path: request.originalUrl
        })
        return null
    }

    const user = await prisma.user.findUnique({
        where: { id: claims.sub },
        select: authUserSelect
    })

    if (!user) {
        sessionLogger.warn('auth.session_user_not_found', {
            requestId: request.requestId,
            userId: claims.sub,
            path: request.originalUrl
        })
        return null
    }

    sessionLogger.debug('auth.session_resolved', {
        requestId: request.requestId,
        userId: user.id,
        path: request.originalUrl
    })

    return serializeAuthUser(user)
}

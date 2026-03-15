import type { Request } from 'express'
import { prisma } from '../db'
import { verifyOpenAuthToken } from '../openauth/token'
import type { AuthUser } from '../types/auth'
import { readSessionToken } from './cookie'

export async function getAuthenticatedUser(request: Request): Promise<AuthUser | null> {
    const token = readSessionToken(request.headers.cookie)
    if (!token) {
        return null
    }

    const claims = verifyOpenAuthToken(token)
    if (!claims) {
        return null
    }

    const user = await prisma.user.findUnique({
        where: { id: claims.sub },
        select: {
            id: true,
            email: true
        }
    })

    if (!user) {
        return null
    }

    return user
}

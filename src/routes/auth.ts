import { Router, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../db.js'
import { createLogger } from '../logging/logger.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { hashPassword, verifyPassword } from '../openauth/password.js'
import { issueOpenAuthToken } from '../openauth/token.js'
import { clearSessionCookie, serializeSessionCookie } from '../auth/cookie.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const MIN_PASSWORD_LENGTH = 8
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const authLogger = createLogger({ component: 'auth-routes' })

function normalizeCredentials(body: unknown): { email: string; password: string } | null {
    const { email, password } = (body ?? {}) as {
        email?: string
        password?: string
    }

    const normalizedEmail = email?.trim().toLowerCase()
    if (!normalizedEmail || !password) {
        return null
    }

    return {
        email: normalizedEmail,
        password
    }
}

router.post(
    '/login',
    asyncHandler(async (req: Request, res: Response) => {
        const credentials = normalizeCredentials(req.body)
        if (!credentials) {
            authLogger.warn('auth.login_invalid_payload', {
                requestId: req.requestId,
                bodyKeys: Object.keys((req.body ?? {}) as Record<string, unknown>)
            })
            res.status(400).json({ error: 'email and password are required' })
            return
        }

        authLogger.info('auth.login_attempt', {
            requestId: req.requestId,
            email: credentials.email
        })

        const user = await prisma.user.findUnique({
            where: { email: credentials.email }
        })

        if (!user || !verifyPassword(credentials.password, user.password_hash)) {
            authLogger.warn('auth.login_failed', {
                requestId: req.requestId,
                email: credentials.email
            })
            res.status(401).json({ error: 'Invalid email or password' })
            return
        }

        const token = issueOpenAuthToken({ id: user.id, email: user.email })
        res.setHeader('Set-Cookie', serializeSessionCookie(token))
        authLogger.info('auth.login_succeeded', {
            requestId: req.requestId,
            userId: user.id,
            email: user.email
        })
        res.json({
            user: {
                id: user.id,
                email: user.email
            }
        })
    })
)

router.post(
    '/signup',
    asyncHandler(async (req: Request, res: Response) => {
        const credentials = normalizeCredentials(req.body)
        if (!credentials) {
            authLogger.warn('auth.signup_invalid_payload', {
                requestId: req.requestId,
                bodyKeys: Object.keys((req.body ?? {}) as Record<string, unknown>)
            })
            res.status(400).json({ error: 'email and password are required' })
            return
        }

        if (!EMAIL_PATTERN.test(credentials.email)) {
            authLogger.warn('auth.signup_invalid_email', {
                requestId: req.requestId,
                email: credentials.email
            })
            res.status(400).json({ error: 'Please provide a valid email address.' })
            return
        }

        if (credentials.password.length < MIN_PASSWORD_LENGTH) {
            authLogger.warn('auth.signup_password_too_short', {
                requestId: req.requestId,
                email: credentials.email,
                passwordLength: credentials.password.length
            })
            res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` })
            return
        }

        authLogger.info('auth.signup_attempt', {
            requestId: req.requestId,
            email: credentials.email
        })

        const existingUser = await prisma.user.findUnique({
            where: { email: credentials.email },
            select: { id: true }
        })

        if (existingUser) {
            authLogger.warn('auth.signup_duplicate_email', {
                requestId: req.requestId,
                email: credentials.email,
                userId: existingUser.id
            })
            res.status(409).json({ error: 'An account with this email already exists.' })
            return
        }

        try {
            const user = await prisma.user.create({
                data: {
                    email: credentials.email,
                    password_hash: hashPassword(credentials.password)
                },
                select: {
                    id: true,
                    email: true
                }
            })

            const token = issueOpenAuthToken({ id: user.id, email: user.email })
            res.setHeader('Set-Cookie', serializeSessionCookie(token))
            authLogger.info('auth.signup_succeeded', {
                requestId: req.requestId,
                userId: user.id,
                email: user.email
            })
            res.status(201).json({ user })
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002' &&
                Array.isArray(error.meta?.target) &&
                error.meta.target.includes('email')
            ) {
                authLogger.warn('auth.signup_duplicate_email_race', {
                    requestId: req.requestId,
                    email: credentials.email
                })
                res.status(409).json({ error: 'An account with this email already exists.' })
                return
            }

            throw error
        }
    })
)

router.post('/logout', (req: Request, res: Response) => {
    authLogger.info('auth.logout', {
        requestId: req.requestId,
        userId: req.authUser?.id ?? undefined
    })
    res.setHeader('Set-Cookie', clearSessionCookie())
    res.status(204).send()
})

router.get('/session', requireAuth, (req: Request, res: Response) => {
    authLogger.debug('auth.session_requested', {
        requestId: req.requestId,
        userId: req.authUser?.id ?? undefined
    })
    res.json({ user: req.authUser })
})

export default router

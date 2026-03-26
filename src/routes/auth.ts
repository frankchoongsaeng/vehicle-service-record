import { Router, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../db.js'
import { createLogger } from '../logging/logger.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { hashPassword, verifyPassword } from '../openauth/password.js'
import { issueOpenAuthToken } from '../openauth/token.js'
import { clearSessionCookie, serializeSessionCookie } from '../auth/cookie.js'
import { authUserSelect, serializeAuthUser } from '../auth/authUser.js'
import { requireAuth } from '../middleware/auth.js'
import {
    buildEmailVerificationUrl,
    createEmailVerificationChallenge,
    hashEmailVerificationToken,
    sendEmailVerificationEmail
} from '../services/emailVerification.js'
import {
    buildPasswordResetUrl,
    createPasswordResetChallenge,
    hashPasswordResetToken,
    sendPasswordResetEmail
} from '../services/passwordReset.js'

const router = Router()
const MIN_PASSWORD_LENGTH = 8
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const authLogger = createLogger({ component: 'auth-routes' })
const DEFAULT_EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS = 60
const DEFAULT_PASSWORD_RESET_RESEND_COOLDOWN_SECONDS = 60

function getEmailVerificationResendCooldownSeconds(): number {
    const configured = Number(
        process.env.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS ?? DEFAULT_EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS
    )

    return Number.isFinite(configured) && configured > 0
        ? configured
        : DEFAULT_EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS
}

function getPasswordResetResendCooldownSeconds(): number {
    const configured = Number(
        process.env.PASSWORD_RESET_RESEND_COOLDOWN_SECONDS ?? DEFAULT_PASSWORD_RESET_RESEND_COOLDOWN_SECONDS
    )

    return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_PASSWORD_RESET_RESEND_COOLDOWN_SECONDS
}

function resolveAppOrigin(req: Request): string {
    const configuredOrigin = process.env.APP_ORIGIN?.trim()

    if (configuredOrigin) {
        return configuredOrigin.replace(/\/+$/, '')
    }

    return `${req.protocol}://${req.get('host')}`
}

async function issueVerificationEmailForUser(params: {
    userId: string
    email: string
    origin: string
    requestId?: string
}): Promise<{ sentAt: Date | null }> {
    const challenge = createEmailVerificationChallenge()

    await prisma.user.update({
        where: { id: params.userId },
        data: {
            email_verification_token_hash: challenge.tokenHash,
            email_verification_expires_at: challenge.expiresAt,
            email_verification_sent_at: null
        }
    })

    try {
        await sendEmailVerificationEmail({
            to: params.email,
            verificationUrl: buildEmailVerificationUrl(params.origin, challenge.token)
        })

        const sentAt = new Date()
        await prisma.user.update({
            where: { id: params.userId },
            data: {
                email_verification_sent_at: sentAt
            }
        })

        authLogger.info('auth.email_verification_issued', {
            requestId: params.requestId,
            userId: params.userId,
            email: params.email,
            expiresAt: challenge.expiresAt.toISOString()
        })

        return { sentAt }
    } catch (error) {
        authLogger.error('auth.email_verification_issue_failed', {
            requestId: params.requestId,
            userId: params.userId,
            email: params.email,
            error
        })

        return { sentAt: null }
    }
}

async function issuePasswordResetEmailForUser(params: {
    userId: string
    email: string
    origin: string
    requestId?: string
}): Promise<{ sentAt: Date | null }> {
    const challenge = createPasswordResetChallenge()

    await prisma.user.update({
        where: { id: params.userId },
        data: {
            password_reset_token_hash: challenge.tokenHash,
            password_reset_expires_at: challenge.expiresAt,
            password_reset_sent_at: null
        }
    })

    try {
        await sendPasswordResetEmail({
            to: params.email,
            resetUrl: buildPasswordResetUrl(params.origin, challenge.token)
        })

        const sentAt = new Date()
        await prisma.user.update({
            where: { id: params.userId },
            data: {
                password_reset_sent_at: sentAt
            }
        })

        authLogger.info('auth.password_reset_issued', {
            requestId: params.requestId,
            userId: params.userId,
            email: params.email,
            expiresAt: challenge.expiresAt.toISOString()
        })

        return { sentAt }
    } catch (error) {
        authLogger.error('auth.password_reset_issue_failed', {
            requestId: params.requestId,
            userId: params.userId,
            email: params.email,
            error
        })

        return { sentAt: null }
    }
}

function normalizeEmailAddress(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null
    }

    const normalizedEmail = value.trim().toLowerCase()
    return normalizedEmail || null
}

function normalizeCredentials(body: unknown): { email: string; password: string } | null {
    const { email, password } = (body ?? {}) as {
        email?: string
        password?: string
    }

    const normalizedEmail = normalizeEmailAddress(email)
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
            where: { email: credentials.email },
            select: {
                ...authUserSelect,
                password_hash: true
            }
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
            user: serializeAuthUser(user)
        })
    })
)

router.post(
    '/password-reset/request',
    asyncHandler(async (req: Request, res: Response) => {
        const email = normalizeEmailAddress(req.body?.email)

        if (!email) {
            res.status(400).json({ error: 'Email is required.' })
            return
        }

        if (!EMAIL_PATTERN.test(email)) {
            res.status(400).json({ error: 'Please provide a valid email address.' })
            return
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                password_reset_sent_at: true
            }
        })

        if (!user) {
            authLogger.info('auth.password_reset_requested_for_unknown_email', {
                requestId: req.requestId,
                email
            })
            res.status(202).json({ accepted: true })
            return
        }

        const resendCooldownMs = getPasswordResetResendCooldownSeconds() * 1000
        const lastSentAt = user.password_reset_sent_at

        if (lastSentAt && Date.now() - lastSentAt.getTime() < resendCooldownMs) {
            authLogger.info('auth.password_reset_request_cooled_down', {
                requestId: req.requestId,
                userId: user.id,
                email
            })
            res.status(202).json({ accepted: true })
            return
        }

        const result = await issuePasswordResetEmailForUser({
            userId: user.id,
            email: user.email,
            origin: resolveAppOrigin(req),
            requestId: req.requestId
        })

        if (result.sentAt == null && req.authUser?.id === user.id) {
            res.status(500).json({ error: 'Unable to send a password reset email right now.' })
            return
        }

        res.status(202).json({ accepted: true })
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
                select: authUserSelect
            })

            const verificationResult = await issueVerificationEmailForUser({
                userId: user.id,
                email: user.email,
                origin: resolveAppOrigin(req),
                requestId: req.requestId
            })

            const responseUser =
                verificationResult.sentAt == null
                    ? user
                    : await prisma.user.findUniqueOrThrow({
                          where: { id: user.id },
                          select: authUserSelect
                      })

            const token = issueOpenAuthToken({ id: user.id, email: user.email })
            res.setHeader('Set-Cookie', serializeSessionCookie(token))
            authLogger.info('auth.signup_succeeded', {
                requestId: req.requestId,
                userId: user.id,
                email: user.email,
                verificationEmailSent: Boolean(verificationResult.sentAt)
            })
            res.status(201).json({ user: serializeAuthUser(responseUser) })
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

router.post(
    '/password-reset/confirm',
    asyncHandler(async (req: Request, res: Response) => {
        const token = typeof req.body?.token === 'string' ? req.body.token.trim() : ''
        const password = typeof req.body?.password === 'string' ? req.body.password : ''

        if (!token) {
            res.status(400).json({ error: 'Password reset token is required.' })
            return
        }

        if (password.length < MIN_PASSWORD_LENGTH) {
            res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` })
            return
        }

        const tokenHash = hashPasswordResetToken(token)
        const now = new Date()
        const matchingUser = await prisma.user.findFirst({
            where: {
                password_reset_token_hash: tokenHash
            },
            select: {
                id: true,
                email: true,
                password_reset_expires_at: true
            }
        })

        if (!matchingUser || !matchingUser.password_reset_expires_at || matchingUser.password_reset_expires_at <= now) {
            authLogger.warn('auth.password_reset_invalid_token', {
                requestId: req.requestId,
                userId: req.authUser?.id ?? undefined
            })
            res.status(400).json({ error: 'This password reset link is invalid or has expired.' })
            return
        }

        const updatedUser = await prisma.user.update({
            where: { id: matchingUser.id },
            data: {
                password_hash: hashPassword(password),
                password_reset_token_hash: null,
                password_reset_expires_at: null,
                password_reset_sent_at: null
            },
            select: authUserSelect
        })

        const sessionUpdated = req.authUser?.id === updatedUser.id

        if (sessionUpdated) {
            const token = issueOpenAuthToken({ id: updatedUser.id, email: updatedUser.email })
            res.setHeader('Set-Cookie', serializeSessionCookie(token))
        }

        authLogger.info('auth.password_reset_completed', {
            requestId: req.requestId,
            userId: updatedUser.id,
            email: updatedUser.email,
            sessionUpdated
        })

        res.json({
            reset: true,
            email: updatedUser.email,
            sessionUpdated,
            user: sessionUpdated ? serializeAuthUser(updatedUser) : null
        })
    })
)

router.post(
    '/verify-email',
    asyncHandler(async (req: Request, res: Response) => {
        const token = typeof req.body?.token === 'string' ? req.body.token.trim() : ''

        if (!token) {
            res.status(400).json({ error: 'Verification token is required.' })
            return
        }

        const tokenHash = hashEmailVerificationToken(token)
        const now = new Date()
        const matchingUser = await prisma.user.findFirst({
            where: {
                email_verification_token_hash: tokenHash
            },
            select: {
                id: true,
                email: true,
                email_verified_at: true,
                email_verification_expires_at: true
            }
        })

        if (
            !matchingUser ||
            matchingUser.email_verified_at ||
            !matchingUser.email_verification_expires_at ||
            matchingUser.email_verification_expires_at <= now
        ) {
            authLogger.warn('auth.email_verification_invalid_token', {
                requestId: req.requestId,
                userId: req.authUser?.id ?? undefined
            })
            res.status(400).json({ error: 'This verification link is invalid or has expired.' })
            return
        }

        const verifiedUser = await prisma.user.update({
            where: { id: matchingUser.id },
            data: {
                email_verified_at: now,
                email_verification_token_hash: null,
                email_verification_expires_at: null
            },
            select: authUserSelect
        })

        const sessionUpdated = req.authUser?.id === verifiedUser.id

        authLogger.info('auth.email_verified', {
            requestId: req.requestId,
            userId: verifiedUser.id,
            email: verifiedUser.email,
            sessionUpdated
        })

        res.json({
            verified: true,
            email: verifiedUser.email,
            sessionUpdated,
            user: sessionUpdated ? serializeAuthUser(verifiedUser) : null
        })
    })
)

router.post(
    '/verification/resend',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const user = await prisma.user.findUnique({
            where: { id: authUser.id },
            select: {
                id: true,
                email: true,
                email_verified_at: true,
                email_verification_sent_at: true
            }
        })

        if (!user) {
            res.status(404).json({ error: 'User not found' })
            return
        }

        if (user.email_verified_at) {
            res.status(409).json({ error: 'Your email address is already verified.' })
            return
        }

        const resendCooldownMs = getEmailVerificationResendCooldownSeconds() * 1000
        const lastSentAt = user.email_verification_sent_at

        if (lastSentAt && Date.now() - lastSentAt.getTime() < resendCooldownMs) {
            res.status(429).json({
                error: 'A verification email was sent recently. Please wait a minute before trying again.'
            })
            return
        }

        await issueVerificationEmailForUser({
            userId: user.id,
            email: user.email,
            origin: resolveAppOrigin(req),
            requestId: req.requestId
        })

        const refreshedUser = await prisma.user.findUniqueOrThrow({
            where: { id: user.id },
            select: authUserSelect
        })

        res.status(202).json({ user: serializeAuthUser(refreshedUser) })
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

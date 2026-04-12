import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { Router, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import rateLimit from 'express-rate-limit'
import { prisma } from '../db.js'
import type { BillingInterval, PlanCode } from '../types/billing.js'
import { isBillingInterval, isPlanCode } from '../types/billing.js'
import { createLogger } from '../logging/logger.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { hashPassword, verifyPassword } from '../openauth/password.js'
import { issueOpenAuthToken } from '../openauth/token.js'
import { captureServerMessage } from '../monitoring/server.js'
import {
    clearCookie,
    clearSessionCookie,
    getGoogleAuthStateCookieName,
    readCookieValue,
    serializeCookie,
    serializeSessionCookie
} from '../auth/cookie.js'
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
import {
    buildGoogleAuthorizationUrl,
    exchangeGoogleCodeForAccessToken,
    fetchGoogleUserProfile,
    isGoogleAuthConfigured,
    type GoogleUserProfile
} from '../services/googleAuth.js'

const router = Router()
const MIN_PASSWORD_LENGTH = 8
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const authLogger = createLogger({ component: 'auth-routes' })
const DEFAULT_EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS = 60
const DEFAULT_PASSWORD_RESET_RESEND_COOLDOWN_SECONDS = 60
const GOOGLE_AUTH_STATE_COOKIE_NAME = getGoogleAuthStateCookieName()
const GOOGLE_AUTH_STATE_TTL_SECONDS = 10 * 60
const GOOGLE_AUTH_STATE_MAX_AGE_MS = GOOGLE_AUTH_STATE_TTL_SECONDS * 1000
const LOGIN_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 8
const SIGNUP_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const SIGNUP_RATE_LIMIT_MAX_ATTEMPTS = 5
const PASSWORD_RESET_REQUEST_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const PASSWORD_RESET_REQUEST_RATE_LIMIT_MAX_ATTEMPTS = 5
const VERIFICATION_RESEND_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const VERIFICATION_RESEND_RATE_LIMIT_MAX_ATTEMPTS = 5

type GoogleAuthState = {
    authPath: '/login' | '/signup'
    nonce: string
    redirectTo: string
    issuedAt: number
    planCode?: Exclude<PlanCode, 'free'>
    billingInterval?: BillingInterval
}

type BillingSignupIntent = {
    planCode: Exclude<PlanCode, 'free'>
    billingInterval: BillingInterval
} | null

type GoogleAuthUserRecord = Prisma.UserGetPayload<{ select: typeof authUserSelect }>
type AuthRateLimitConfig = {
    action: string
    windowMs: number
    max: number
    message: string
    skipSuccessfulRequests?: boolean
    keySelector?: (req: Request) => string
}

function getOpenAuthSecret(): string {
    const secret = process.env.OPENAUTH_SECRET?.trim()

    if (!secret) {
        throw new Error('OPENAUTH_SECRET is not configured')
    }

    return secret
}

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

function getSafeRedirectTarget(value: string | null | undefined): string {
    if (!value || !value.startsWith('/') || value.startsWith('//')) {
        return '/garage'
    }

    if (value === '/login' || value.startsWith('/login?') || value === '/signup' || value.startsWith('/signup?')) {
        return '/garage'
    }

    return value
}

function buildOnboardingUrl(redirectTo: string): string {
    const nextTarget = getSafeRedirectTarget(redirectTo)

    if (nextTarget === '/garage') {
        return '/onboarding'
    }

    return `/onboarding?redirectTo=${encodeURIComponent(nextTarget)}`
}

function normalizePostBillingRedirectTarget(value: string): string {
    const nextTarget = getSafeRedirectTarget(value)

    if (
        nextTarget === '/garage' ||
        nextTarget === '/onboarding' ||
        nextTarget.startsWith('/onboarding?') ||
        nextTarget === '/pricing' ||
        nextTarget.startsWith('/pricing?')
    ) {
        return '/garage'
    }

    return nextTarget
}

function resolveBillingSignupIntent(planCode: unknown, billingInterval: unknown): BillingSignupIntent {
    if (
        typeof planCode === 'string' &&
        (planCode === 'plus' || planCode === 'garage') &&
        isPlanCode(planCode) &&
        typeof billingInterval === 'string' &&
        isBillingInterval(billingInterval)
    ) {
        return {
            planCode,
            billingInterval
        }
    }

    return null
}

function buildBillingSetupUrl(billingIntent: Exclude<BillingSignupIntent, null>, redirectTo: string): string {
    const params = new URLSearchParams({
        billing: billingIntent.billingInterval,
        checkoutPlan: billingIntent.planCode,
        postAuthSetup: '1'
    })
    const returnTo = normalizePostBillingRedirectTarget(redirectTo)

    if (returnTo !== '/garage') {
        params.set('returnTo', returnTo)
    }

    return `/pricing?${params.toString()}`
}

function getPostAuthenticationDestination(
    user: { onboarding_completed_at: Date | null },
    redirectTo: string,
    billingIntent: BillingSignupIntent = null
): string {
    if (billingIntent) {
        return buildBillingSetupUrl(billingIntent, redirectTo)
    }

    return user.onboarding_completed_at ? getSafeRedirectTarget(redirectTo) : buildOnboardingUrl(redirectTo)
}

function resolveGoogleAuthEntryPath(value: string | null | undefined): '/login' | '/signup' {
    return value === '/signup' ? '/signup' : '/login'
}

function toBase64Url(value: string): string {
    return Buffer.from(value, 'utf8').toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function fromBase64Url(value: string): string {
    const padding = value.length % 4 === 0 ? '' : '='.repeat(4 - (value.length % 4))
    return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/') + padding, 'base64').toString('utf8')
}

function buildAuthRateLimitKey(req: Request, identity?: string | null): string {
    return `${req.ip}:${identity?.trim().toLowerCase() || 'anonymous'}`
}

function emitBruteForceAlert(req: Request, config: AuthRateLimitConfig): void {
    const alertContext = {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
        userId: req.authUser?.id ?? undefined,
        action: config.action,
        limit: config.max,
        windowMs: config.windowMs
    }

    authLogger.warn('auth.brute_force_detected', alertContext)
    captureServerMessage('auth.brute_force_detected', 'warn', alertContext)
}

function createAuthRateLimiter(config: AuthRateLimitConfig) {
    return rateLimit({
        windowMs: config.windowMs,
        max: config.max,
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: config.skipSuccessfulRequests ?? false,
        keyGenerator: req => config.keySelector?.(req) ?? buildAuthRateLimitKey(req),
        message: { error: config.message },
        handler: (req, res, _next, options) => {
            emitBruteForceAlert(req, config)
            res.status(options.statusCode).json(options.message)
        }
    })
}

const loginRateLimiter = createAuthRateLimiter({
    action: 'login',
    windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
    max: LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
    skipSuccessfulRequests: true,
    message: 'Too many failed login attempts. Please wait 10 minutes before trying again.',
    keySelector: req => buildAuthRateLimitKey(req, normalizeEmailAddress(req.body?.email))
})

const signupRateLimiter = createAuthRateLimiter({
    action: 'signup',
    windowMs: SIGNUP_RATE_LIMIT_WINDOW_MS,
    max: SIGNUP_RATE_LIMIT_MAX_ATTEMPTS,
    message: 'Too many signup attempts. Please wait an hour before trying again.',
    keySelector: req => buildAuthRateLimitKey(req, normalizeEmailAddress(req.body?.email))
})

const passwordResetRequestRateLimiter = createAuthRateLimiter({
    action: 'password_reset_request',
    windowMs: PASSWORD_RESET_REQUEST_RATE_LIMIT_WINDOW_MS,
    max: PASSWORD_RESET_REQUEST_RATE_LIMIT_MAX_ATTEMPTS,
    message: 'Too many password reset requests. Please wait 15 minutes before trying again.',
    keySelector: req => buildAuthRateLimitKey(req, normalizeEmailAddress(req.body?.email))
})

const verificationResendRateLimiter = createAuthRateLimiter({
    action: 'verification_resend',
    windowMs: VERIFICATION_RESEND_RATE_LIMIT_WINDOW_MS,
    max: VERIFICATION_RESEND_RATE_LIMIT_MAX_ATTEMPTS,
    message: 'Too many verification email resend attempts. Please wait 15 minutes before trying again.',
    keySelector: req => buildAuthRateLimitKey(req, req.authUser?.id)
})

function signGoogleAuthState(state: GoogleAuthState): string {
    const payload = toBase64Url(JSON.stringify(state))
    const signature = createHmac('sha256', getOpenAuthSecret())
        .update(payload)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')

    return `${payload}.${signature}`
}

function parseGoogleAuthState(token: string): GoogleAuthState | null {
    const [payload, providedSignature] = token.split('.')
    if (!payload || !providedSignature) {
        return null
    }

    const expectedSignature = createHmac('sha256', getOpenAuthSecret()).update(payload).digest()
    const actualSignature = Buffer.from(
        providedSignature.replace(/-/g, '+').replace(/_/g, '/') +
            (providedSignature.length % 4 === 0 ? '' : '='.repeat(4 - (providedSignature.length % 4))),
        'base64'
    )

    if (expectedSignature.length !== actualSignature.length || !timingSafeEqual(expectedSignature, actualSignature)) {
        return null
    }

    try {
        const parsed = JSON.parse(fromBase64Url(payload)) as Partial<GoogleAuthState>
        if (
            (parsed.authPath !== '/login' && parsed.authPath !== '/signup') ||
            typeof parsed.nonce !== 'string' ||
            typeof parsed.redirectTo !== 'string' ||
            typeof parsed.issuedAt !== 'number'
        ) {
            return null
        }

        const billingIntent = resolveBillingSignupIntent(parsed.planCode, parsed.billingInterval)

        return {
            authPath: parsed.authPath,
            nonce: parsed.nonce,
            redirectTo: getSafeRedirectTarget(parsed.redirectTo),
            issuedAt: parsed.issuedAt,
            ...(billingIntent
                ? {
                      planCode: billingIntent.planCode,
                      billingInterval: billingIntent.billingInterval
                  }
                : {})
        }
    } catch {
        return null
    }
}

function serializeGoogleAuthStateCookie(nonce: string): string {
    return serializeCookie(GOOGLE_AUTH_STATE_COOKIE_NAME, nonce, GOOGLE_AUTH_STATE_TTL_SECONDS)
}

function clearGoogleAuthStateCookie(): string {
    return clearCookie(GOOGLE_AUTH_STATE_COOKIE_NAME)
}

function buildGoogleRedirectUri(req: Request): string {
    return `${resolveAppOrigin(req)}/api/auth/google/callback`
}

function buildAuthErrorRedirectPath(
    authPath: '/login' | '/signup',
    redirectTo: string,
    authError: string,
    billingIntent: BillingSignupIntent = null
): string {
    const params = new URLSearchParams({ authError })
    const nextTarget = getSafeRedirectTarget(redirectTo)

    if (nextTarget !== '/garage') {
        params.set('redirectTo', nextTarget)
    }

    if (billingIntent) {
        params.set('plan', billingIntent.planCode)
        params.set('billing', billingIntent.billingInterval)
    }

    return `${authPath}?${params.toString()}`
}

async function resolveGoogleAuthUser(profile: GoogleUserProfile): Promise<GoogleAuthUserRecord> {
    const now = new Date()

    return prisma.$transaction(async transaction => {
        const matchingGoogleUser = await transaction.user.findUnique({
            where: { google_subject: profile.subject },
            select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                profile_image_url: true,
                email_verified_at: true
            }
        })

        if (matchingGoogleUser) {
            return transaction.user.update({
                where: { id: matchingGoogleUser.id },
                data: {
                    email: profile.email,
                    email_verified_at: matchingGoogleUser.email_verified_at ?? now,
                    email_verification_token_hash: null,
                    email_verification_expires_at: null,
                    email_verification_sent_at: null,
                    first_name: matchingGoogleUser.first_name ?? profile.givenName,
                    last_name: matchingGoogleUser.last_name ?? profile.familyName,
                    profile_image_url: matchingGoogleUser.profile_image_url ?? profile.picture
                },
                select: authUserSelect
            })
        }

        const matchingEmailUser = await transaction.user.findUnique({
            where: { email: profile.email },
            select: {
                id: true,
                google_subject: true,
                first_name: true,
                last_name: true,
                profile_image_url: true,
                email_verified_at: true
            }
        })

        if (matchingEmailUser) {
            if (matchingEmailUser.google_subject && matchingEmailUser.google_subject !== profile.subject) {
                throw new Error('Google account conflict for the requested email address.')
            }

            return transaction.user.update({
                where: { id: matchingEmailUser.id },
                data: {
                    google_subject: profile.subject,
                    email_verified_at: matchingEmailUser.email_verified_at ?? now,
                    email_verification_token_hash: null,
                    email_verification_expires_at: null,
                    email_verification_sent_at: null,
                    first_name: matchingEmailUser.first_name ?? profile.givenName,
                    last_name: matchingEmailUser.last_name ?? profile.familyName,
                    profile_image_url: matchingEmailUser.profile_image_url ?? profile.picture
                },
                select: authUserSelect
            })
        }

        return transaction.user.create({
            data: {
                email: profile.email,
                password_hash: null,
                google_subject: profile.subject,
                email_verified_at: now,
                email_verification_token_hash: null,
                email_verification_expires_at: null,
                email_verification_sent_at: null,
                first_name: profile.givenName,
                last_name: profile.familyName,
                profile_image_url: profile.picture
            },
            select: authUserSelect
        })
    })
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
    loginRateLimiter,
    asyncHandler(async (req: Request, res: Response) => {
        const credentials = normalizeCredentials(req.body)
        if (!credentials) {
            authLogger.warn('auth.login_invalid_payload', {
                requestId: req.requestId,
                bodyKeys: Object.keys((req.body ?? {}) as Record<string, unknown>)
            })
            res.status(400).json({ error: 'Enter both your email address and password.' })
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

        if (!user || !user.password_hash || !verifyPassword(credentials.password, user.password_hash)) {
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

router.get(
    '/google/start',
    asyncHandler(async (req: Request, res: Response) => {
        const redirectTo = getSafeRedirectTarget(
            typeof req.query.redirectTo === 'string' ? req.query.redirectTo : undefined
        )
        const authPath = resolveGoogleAuthEntryPath(typeof req.query.authPath === 'string' ? req.query.authPath : null)
        const billingIntent = resolveBillingSignupIntent(req.query.plan, req.query.billing)

        if (!isGoogleAuthConfigured()) {
            authLogger.warn('auth.google_unavailable', {
                requestId: req.requestId,
                redirectTo,
                authPath,
                billingIntent
            })
            res.redirect(buildAuthErrorRedirectPath(authPath, redirectTo, 'google_unavailable', billingIntent))
            return
        }

        const nonce = randomBytes(24).toString('hex')
        const state = signGoogleAuthState({
            authPath,
            nonce,
            redirectTo,
            issuedAt: Date.now(),
            ...(billingIntent
                ? {
                      planCode: billingIntent.planCode,
                      billingInterval: billingIntent.billingInterval
                  }
                : {})
        })

        authLogger.info('auth.google_start', {
            requestId: req.requestId,
            authPath,
            redirectTo
        })

        res.setHeader('Set-Cookie', serializeGoogleAuthStateCookie(nonce))
        res.redirect(
            buildGoogleAuthorizationUrl({
                redirectUri: buildGoogleRedirectUri(req),
                state
            })
        )
    })
)

router.get(
    '/google/callback',
    asyncHandler(async (req: Request, res: Response) => {
        const state = typeof req.query.state === 'string' ? parseGoogleAuthState(req.query.state) : null
        const authPath = state?.authPath ?? '/login'
        const redirectTo = state?.redirectTo ?? '/garage'
        const billingIntent = resolveBillingSignupIntent(state?.planCode, state?.billingInterval)
        const callbackError = typeof req.query.error === 'string' ? req.query.error : null
        const stateCookieNonce = readCookieValue(req.headers.cookie, GOOGLE_AUTH_STATE_COOKIE_NAME)
        const clearStateCookieHeader = clearGoogleAuthStateCookie()

        if (callbackError) {
            authLogger.warn('auth.google_cancelled', {
                requestId: req.requestId,
                authPath,
                redirectTo,
                error: callbackError
            })
            res.setHeader('Set-Cookie', clearStateCookieHeader)
            res.redirect(buildAuthErrorRedirectPath(authPath, redirectTo, 'google_cancelled', billingIntent))
            return
        }

        const isStateExpired = state == null || Date.now() - state.issuedAt > GOOGLE_AUTH_STATE_MAX_AGE_MS
        const hasMatchingNonce =
            state != null &&
            typeof stateCookieNonce === 'string' &&
            Buffer.byteLength(state.nonce) === Buffer.byteLength(stateCookieNonce) &&
            timingSafeEqual(Buffer.from(state.nonce), Buffer.from(stateCookieNonce))

        if (isStateExpired || !hasMatchingNonce) {
            authLogger.warn('auth.google_invalid_state', {
                requestId: req.requestId,
                authPath,
                redirectTo,
                hasCookieNonce: Boolean(stateCookieNonce)
            })
            res.setHeader('Set-Cookie', clearStateCookieHeader)
            res.redirect(buildAuthErrorRedirectPath(authPath, redirectTo, 'google_state_invalid', billingIntent))
            return
        }

        const code = typeof req.query.code === 'string' ? req.query.code.trim() : ''
        if (!code || !isGoogleAuthConfigured()) {
            authLogger.warn('auth.google_failed_precondition', {
                requestId: req.requestId,
                authPath,
                redirectTo,
                hasCode: Boolean(code),
                configured: isGoogleAuthConfigured()
            })
            res.setHeader('Set-Cookie', clearStateCookieHeader)
            res.redirect(
                buildAuthErrorRedirectPath(
                    authPath,
                    redirectTo,
                    code ? 'google_unavailable' : 'google_failed',
                    billingIntent
                )
            )
            return
        }

        try {
            const accessToken = await exchangeGoogleCodeForAccessToken({
                code,
                redirectUri: buildGoogleRedirectUri(req)
            })
            const profile = await fetchGoogleUserProfile(accessToken)

            if (!profile.emailVerified) {
                authLogger.warn('auth.google_unverified_email', {
                    requestId: req.requestId,
                    authPath,
                    redirectTo,
                    email: profile.email
                })
                res.setHeader('Set-Cookie', clearStateCookieHeader)
                res.redirect(buildAuthErrorRedirectPath(authPath, redirectTo, 'google_unverified_email', billingIntent))
                return
            }

            const user = await resolveGoogleAuthUser(profile)
            const sessionToken = issueOpenAuthToken({ id: user.id, email: user.email })

            authLogger.info('auth.google_succeeded', {
                requestId: req.requestId,
                userId: user.id,
                email: user.email,
                redirectTo
            })

            res.setHeader('Set-Cookie', [clearStateCookieHeader, serializeSessionCookie(sessionToken)])
            res.redirect(getPostAuthenticationDestination(user, redirectTo, billingIntent))
        } catch (error) {
            authLogger.error('auth.google_failed', {
                requestId: req.requestId,
                authPath,
                redirectTo,
                error
            })
            res.setHeader('Set-Cookie', clearStateCookieHeader)
            res.redirect(buildAuthErrorRedirectPath(authPath, redirectTo, 'google_failed', billingIntent))
        }
    })
)

router.post(
    '/password-reset/request',
    passwordResetRequestRateLimiter,
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
    signupRateLimiter,
    asyncHandler(async (req: Request, res: Response) => {
        const credentials = normalizeCredentials(req.body)
        if (!credentials) {
            authLogger.warn('auth.signup_invalid_payload', {
                requestId: req.requestId,
                bodyKeys: Object.keys((req.body ?? {}) as Record<string, unknown>)
            })
            res.status(400).json({ error: 'Enter both your email address and password.' })
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
    verificationResendRateLimiter,
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

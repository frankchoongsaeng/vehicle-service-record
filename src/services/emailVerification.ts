import { createHash, randomBytes } from 'node:crypto'
import nodemailer from 'nodemailer'

import { getSmtpConfig } from './emailConfig.js'
import { createLogger } from '../logging/logger.js'

const verificationLogger = createLogger({ component: 'email-verification' })
const DEFAULT_TOKEN_TTL_HOURS = 24

type SendVerificationEmailInput = {
    to: string
    verificationUrl: string
}

function getTokenTtlHours(): number {
    const configured = Number(process.env.EMAIL_VERIFICATION_TTL_HOURS ?? DEFAULT_TOKEN_TTL_HOURS)

    return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TOKEN_TTL_HOURS
}

export function createEmailVerificationChallenge(now = new Date()): {
    token: string
    tokenHash: string
    expiresAt: Date
} {
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(now.getTime() + getTokenTtlHours() * 60 * 60 * 1000)

    return {
        token,
        tokenHash: hashEmailVerificationToken(token),
        expiresAt
    }
}

export function hashEmailVerificationToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
}

export function buildEmailVerificationUrl(origin: string, token: string): string {
    const normalizedOrigin = origin.replace(/\/+$/, '')
    return `${normalizedOrigin}/verify-email?token=${encodeURIComponent(token)}`
}

export async function sendEmailVerificationEmail(input: SendVerificationEmailInput): Promise<{
    provider: 'log' | 'smtp'
    response: string
}> {
    const { host, port, secure, user, pass, from } = getSmtpConfig('welcome')

    const subject = 'Verify your Duralog email address'
    const text = [
        'Welcome to Duralog.',
        '',
        'Verify your email address to unlock reminder emails and other email-based features:',
        input.verificationUrl,
        '',
        `If you did not create this account, you can ignore this email.`
    ].join('\n')
    const html = [
        '<p>Welcome to <strong>Duralog</strong>.</p>',
        '<p>Verify your email address to unlock reminder emails and other email-based features.</p>',
        `<p><a href="${input.verificationUrl}">Verify your email</a></p>`,
        `<p>If the button does not work, copy this URL into your browser:<br /><a href="${input.verificationUrl}">${input.verificationUrl}</a></p>`,
        '<p>If you did not create this account, you can ignore this email.</p>'
    ].join('')

    if (!host || !from) {
        verificationLogger.info('email_verification.logged', {
            provider: 'log',
            to: input.to,
            subject,
            verificationUrl: input.verificationUrl
        })

        return {
            provider: 'log',
            response: 'logged-locally'
        }
    }

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        ...(user || pass
            ? {
                  auth: {
                      user,
                      pass
                  }
              }
            : {})
    })

    const info = await transporter.sendMail({
        from,
        to: input.to,
        subject,
        text,
        html
    })

    verificationLogger.info('email_verification.sent', {
        provider: 'smtp',
        to: input.to,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected
    })

    return {
        provider: 'smtp',
        response: info.messageId
    }
}

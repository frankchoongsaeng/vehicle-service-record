import { createHash, randomBytes } from 'node:crypto'
import nodemailer from 'nodemailer'

import { createLogger } from '../logging/logger.js'

const passwordResetLogger = createLogger({ component: 'password-reset' })
const DEFAULT_PASSWORD_RESET_TTL_HOURS = 2

type SendPasswordResetEmailInput = {
    to: string
    resetUrl: string
}

function getPasswordResetTtlHours(): number {
    const configured = Number(process.env.PASSWORD_RESET_TTL_HOURS ?? DEFAULT_PASSWORD_RESET_TTL_HOURS)

    return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_PASSWORD_RESET_TTL_HOURS
}

export function createPasswordResetChallenge(now = new Date()): {
    token: string
    tokenHash: string
    expiresAt: Date
} {
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(now.getTime() + getPasswordResetTtlHours() * 60 * 60 * 1000)

    return {
        token,
        tokenHash: hashPasswordResetToken(token),
        expiresAt
    }
}

export function hashPasswordResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
}

export function buildPasswordResetUrl(origin: string, token: string): string {
    const normalizedOrigin = origin.replace(/\/+$/, '')
    return `${normalizedOrigin}/reset-password?token=${encodeURIComponent(token)}`
}

export async function sendPasswordResetEmail(input: SendPasswordResetEmailInput): Promise<{
    provider: 'log' | 'smtp'
    response: string
}> {
    const host = process.env.SMTP_HOST?.trim()
    const port = Number(process.env.SMTP_PORT ?? '587')
    const secure = process.env.SMTP_SECURE === 'true'
    const user = process.env.SMTP_USER?.trim()
    const pass = process.env.SMTP_PASS?.trim()
    const from = process.env.SMTP_FROM?.trim()

    const subject = 'Reset your Duralog password'
    const text = [
        'We received a request to reset your Duralog password.',
        '',
        'Choose a new password with this link:',
        input.resetUrl,
        '',
        'If you did not request a password reset, you can ignore this email.'
    ].join('\n')
    const html = [
        '<p>We received a request to reset your <strong>Duralog</strong> password.</p>',
        `<p><a href="${input.resetUrl}">Choose a new password</a></p>`,
        `<p>If the button does not work, copy this URL into your browser:<br /><a href="${input.resetUrl}">${input.resetUrl}</a></p>`,
        '<p>If you did not request a password reset, you can ignore this email.</p>'
    ].join('')

    if (!host || !from) {
        passwordResetLogger.info('password_reset.logged', {
            provider: 'log',
            to: input.to,
            subject,
            resetUrl: input.resetUrl
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

    passwordResetLogger.info('password_reset.sent', {
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

import { createHash, randomBytes } from 'node:crypto'
import nodemailer from 'nodemailer'

import { getSmtpConfig } from './emailConfig.js'
import { buildCalloutCard, buildParagraphBlock, renderEmailLayout } from './emailLayout.js'
import { createLogger } from '../logging/logger.js'
import { withServerMonitoringSpan } from '../monitoring/server.js'

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
    return withServerMonitoringSpan(
        'email.send_password_reset',
        {
            to: input.to,
            channel: 'security'
        },
        async () => {
            const { host, port, secure, user, pass, from } = getSmtpConfig('security')

            const subject = 'Reset your Duralog password'
            const text = [
                'We received a request to reset your Duralog password.',
                '',
                `This reset link expires in ${getPasswordResetTtlHours()} hours.`,
                '',
                'Choose a new password with this link:',
                input.resetUrl,
                '',
                'If you did not request a password reset, you can ignore this email.'
            ].join('\n')
            const html = renderEmailLayout({
                previewText: 'Choose a new Duralog password with this secure reset link.',
                categoryLabel: 'Security',
                title: 'Reset your password',
                intro: 'A request was made to reset the password for your Duralog account.',
                bodyHtml:
                    buildParagraphBlock([
                        'Use the secure link below to choose a new password.',
                        'For your protection, this email only gives access to the reset flow and does not change anything until you submit a new password.'
                    ]) +
                    buildCalloutCard('Security details', [
                        `This reset link expires in ${getPasswordResetTtlHours()} hours.`,
                        'If you did not request a password reset, no further action is required.',
                        'You can keep using your current password unless you complete the reset.'
                    ]),
                action: {
                    label: 'Choose a new password',
                    url: input.resetUrl
                },
                actionHint: 'Open the secure reset link above to set a new password.',
                footerNote:
                    'This message was sent because a password reset request was submitted for your Duralog account.'
            })

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
    )
}

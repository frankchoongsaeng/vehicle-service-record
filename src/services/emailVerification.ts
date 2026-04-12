import { createHash, randomBytes } from 'node:crypto'
import nodemailer from 'nodemailer'

import { getSmtpConfig } from './emailConfig.js'
import { buildCalloutCard, buildParagraphBlock, renderEmailLayout } from './emailLayout.js'
import { createLogger } from '../logging/logger.js'
import { withServerMonitoringSpan } from '../monitoring/server.js'

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
    return withServerMonitoringSpan(
        'email.send_verification',
        {
            to: input.to,
            channel: 'welcome'
        },
        async () => {
            const { host, port, secure, user, pass, from } = getSmtpConfig('welcome')

            const subject = 'Verify your Duralog email address'
            const text = [
                'Welcome to Duralog.',
                '',
                'Verify your email address to unlock reminder emails and other email-based features.',
                '',
                `This verification link expires in ${getTokenTtlHours()} hours.`,
                '',
                'Open this link to verify your email:',
                input.verificationUrl,
                '',
                `If you did not create this account, you can ignore this email.`
            ].join('\n')
            const html = renderEmailLayout({
                previewText: 'Verify your email to enable reminders and secure your Duralog account.',
                categoryLabel: 'Welcome',
                title: 'Verify your email',
                intro: 'Finish setting up your Duralog account so reminders and account updates can reach you.',
                bodyHtml:
                    buildParagraphBlock([
                        'Welcome to Duralog.',
                        'Confirm your email address to unlock reminder emails and other email-based features.'
                    ]) +
                    buildCalloutCard('What happens next', [
                        `This verification link expires in ${getTokenTtlHours()} hours.`,
                        'Once verified, your account can receive maintenance reminders and security notices.',
                        'If you did not create this account, you can safely ignore this message.'
                    ]),
                action: {
                    label: 'Verify your email',
                    url: input.verificationUrl
                },
                actionHint: 'Use the button above to confirm your address in one step.',
                footerNote: 'This message was sent because a Duralog account was created with this email address.'
            })

            if (!host || !from) {
                verificationLogger.info('email_verification.logged', {
                    provider: 'log',
                    to: input.to,
                    subject
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
    )
}

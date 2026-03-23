import nodemailer from 'nodemailer'

import { createLogger } from '../../logging/logger.js'

const emailLogger = createLogger({ component: 'reminder-email-transport' })

type SendEmailInput = {
    to: string
    subject: string
    text: string
    html: string
}

type SendEmailResult = {
    provider: string
    response: string
}

export type ReminderEmailTransport = {
    provider: string
    send(input: SendEmailInput): Promise<SendEmailResult>
}

export function createReminderEmailTransport(): ReminderEmailTransport {
    const host = process.env.SMTP_HOST?.trim()
    const port = Number(process.env.SMTP_PORT ?? '587')
    const secure = process.env.SMTP_SECURE === 'true'
    const user = process.env.SMTP_USER?.trim()
    const pass = process.env.SMTP_PASS?.trim()
    const from = process.env.SMTP_FROM?.trim()

    if (!host || !from) {
        return {
            provider: 'logger',
            async send(input) {
                emailLogger.info('reminders.email_logged', {
                    to: input.to,
                    subject: input.subject,
                    preview: input.text
                })

                return {
                    provider: 'logger',
                    response: 'logged-to-application-output'
                }
            }
        }
    }

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user && pass ? { user, pass } : undefined
    })

    return {
        provider: 'smtp',
        async send(input) {
            const info = await transporter.sendMail({
                from,
                to: input.to,
                subject: input.subject,
                text: input.text,
                html: input.html
            })

            return {
                provider: 'smtp',
                response: typeof info.response === 'string' ? info.response : JSON.stringify(info)
            }
        }
    }
}

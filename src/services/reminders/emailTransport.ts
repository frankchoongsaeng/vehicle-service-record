import nodemailer from 'nodemailer'

import { createLogger } from '../../logging/logger.js'
import { withServerMonitoringSpan } from '../../monitoring/server.js'
import { getSmtpConfig } from '../emailConfig.js'

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
    const { host, port, secure, user, pass, from } = getSmtpConfig('alerts')

    if (!host || !from) {
        return {
            provider: 'logger',
            async send(input) {
                return withServerMonitoringSpan(
                    'email.send_reminder',
                    {
                        provider: 'logger',
                        to: input.to,
                        subject: input.subject
                    },
                    async () => {
                        emailLogger.info('reminders.email_logged', {
                            to: input.to,
                            subject: input.subject,
                            textLength: input.text.length
                        })

                        return {
                            provider: 'logger',
                            response: 'logged-to-application-output'
                        }
                    }
                )
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
            return withServerMonitoringSpan(
                'email.send_reminder',
                {
                    provider: 'smtp',
                    to: input.to,
                    subject: input.subject
                },
                async () => {
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
            )
        }
    }
}

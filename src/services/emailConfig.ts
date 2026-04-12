type EmailSenderCategory = 'alerts' | 'security' | 'welcome'

type SmtpConfig = {
    host?: string
    port: number
    secure: boolean
    user?: string
    pass?: string
    from?: string
}

function getSenderAddress(category: EmailSenderCategory): string | undefined {
    const envKeyByCategory = {
        alerts: 'SMTP_FROM_ALERTS',
        security: 'SMTP_FROM_SECURITY',
        welcome: 'SMTP_FROM_WELCOME'
    } satisfies Record<EmailSenderCategory, string>

    const senderFromCategory = process.env[envKeyByCategory[category]]?.trim()
    if (senderFromCategory) {
        return senderFromCategory
    }

    const fallbackSender = process.env.SMTP_FROM?.trim()
    return fallbackSender || undefined
}

export function getSmtpConfig(category: EmailSenderCategory): SmtpConfig {
    return {
        host: process.env.SMTP_HOST?.trim() || undefined,
        port: Number(process.env.SMTP_PORT ?? '587'),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER?.trim() || undefined,
        pass: process.env.SMTP_PASS?.trim() || undefined,
        from: getSenderAddress(category)
    }
}

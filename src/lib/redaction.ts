const REDACTED = '[REDACTED]'
const SENSITIVE_QUERY_KEYS = new Set(['access_token', 'code', 'password', 'refresh_token', 'secret', 'state', 'token'])
const SENSITIVE_KEYS = new Set([
    'accepted',
    'authorization',
    'code',
    'cookie',
    'email',
    'password',
    'password_hash',
    'rejected',
    'reseturl',
    'secret',
    'set-cookie',
    'state',
    'to',
    'token',
    'verificationurl'
])

function isAbsoluteUrl(value: string): boolean {
    return /^[a-z][a-z\d+.-]*:\/\//i.test(value)
}

export function isSensitiveKey(key: string): boolean {
    return SENSITIVE_KEYS.has(key.toLowerCase())
}

export function redactValue(): string {
    return REDACTED
}

export function sanitizeSensitiveUrl(value: string): string {
    if (!/[?&](access_token|code|password|refresh_token|secret|state|token)=/i.test(value)) {
        return value
    }

    try {
        const absolute = isAbsoluteUrl(value)
        const url = new URL(value, 'http://redaction.local')
        let redacted = false

        for (const key of Array.from(url.searchParams.keys())) {
            if (!SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
                continue
            }

            url.searchParams.set(key, REDACTED)
            redacted = true
        }

        if (!redacted) {
            return value
        }

        if (absolute) {
            return `${url.origin}${url.pathname}${url.search}${url.hash}`
        }

        return `${url.pathname}${url.search}${url.hash}`
    } catch {
        return value
    }
}

export function sanitizeSensitiveString(value: string, key?: string): string {
    if (key && isSensitiveKey(key)) {
        return REDACTED
    }

    return sanitizeSensitiveUrl(value)
}

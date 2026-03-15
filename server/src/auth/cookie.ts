const SESSION_COOKIE_NAME = 'vsr_session'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

function buildAttributes(maxAge?: number): string[] {
    const attributes = [`Path=/`, `HttpOnly`, `SameSite=Lax`]

    if (typeof maxAge === 'number') {
        attributes.push(`Max-Age=${maxAge}`)
    }

    if (process.env.NODE_ENV === 'production') {
        attributes.push('Secure')
    }

    return attributes
}

export function getSessionCookieName(): string {
    return SESSION_COOKIE_NAME
}

export function getSessionCookieMaxAge(): number {
    return SESSION_MAX_AGE_SECONDS
}

export function serializeSessionCookie(token: string): string {
    return [`${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`, ...buildAttributes(SESSION_MAX_AGE_SECONDS)].join(
        '; '
    )
}

export function clearSessionCookie(): string {
    return [`${SESSION_COOKIE_NAME}=`, ...buildAttributes(0), 'Expires=Thu, 01 Jan 1970 00:00:00 GMT'].join('; ')
}

export function readSessionToken(headerValue?: string): string | null {
    if (!headerValue) {
        return null
    }

    for (const cookie of headerValue.split(';')) {
        const [rawName, ...rest] = cookie.trim().split('=')
        if (rawName !== SESSION_COOKIE_NAME) {
            continue
        }

        const rawValue = rest.join('=')
        if (!rawValue) {
            return null
        }

        return decodeURIComponent(rawValue)
    }

    return null
}

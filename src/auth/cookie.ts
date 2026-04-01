function buildCookieName(baseName: string): string {
    return process.env.NODE_ENV === 'production' ? `__Host-${baseName}` : baseName
}

const SESSION_COOKIE_NAME = buildCookieName('vsr_session')
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

export function getGoogleAuthStateCookieName(): string {
    return buildCookieName('vsr_google_oauth_state')
}

export function getSessionCookieMaxAge(): number {
    return SESSION_MAX_AGE_SECONDS
}

export function serializeCookie(name: string, value: string, maxAge?: number): string {
    return [`${name}=${encodeURIComponent(value)}`, ...buildAttributes(maxAge)].join('; ')
}

export function clearCookie(name: string): string {
    return [`${name}=`, ...buildAttributes(0), 'Expires=Thu, 01 Jan 1970 00:00:00 GMT'].join('; ')
}

export function serializeSessionCookie(token: string): string {
    return serializeCookie(SESSION_COOKIE_NAME, token, SESSION_MAX_AGE_SECONDS)
}

export function clearSessionCookie(): string {
    return clearCookie(SESSION_COOKIE_NAME)
}

export function readCookieValue(headerValue: string | undefined, cookieName: string): string | null {
    if (!headerValue) {
        return null
    }

    for (const cookie of headerValue.split(';')) {
        const [rawName, ...rest] = cookie.trim().split('=')
        if (rawName !== cookieName) {
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

export function readSessionToken(headerValue?: string): string | null {
    return readCookieValue(headerValue, SESSION_COOKIE_NAME)
}

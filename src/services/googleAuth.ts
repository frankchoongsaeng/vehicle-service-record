type GoogleAuthConfig = {
    clientId: string
    clientSecret: string
}

type GoogleTokenResponse = {
    access_token?: string
    error?: string
    error_description?: string
}

type GoogleUserInfoResponse = {
    sub?: string
    email?: string
    email_verified?: boolean
    given_name?: string
    family_name?: string
    picture?: string
}

export type GoogleUserProfile = {
    subject: string
    email: string
    emailVerified: boolean
    givenName: string | null
    familyName: string | null
    picture: string | null
}

const GOOGLE_AUTHORIZATION_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'
const GOOGLE_SCOPE = 'openid email profile'

function getGoogleAuthConfig(): GoogleAuthConfig | null {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim()
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()

    if (!clientId || !clientSecret) {
        return null
    }

    return { clientId, clientSecret }
}

export function isGoogleAuthConfigured(): boolean {
    return getGoogleAuthConfig() != null
}

export function buildGoogleAuthorizationUrl(params: { redirectUri: string; state: string }): string {
    const config = getGoogleAuthConfig()
    if (!config) {
        throw new Error('Google OAuth is not configured.')
    }

    const searchParams = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: params.redirectUri,
        response_type: 'code',
        scope: GOOGLE_SCOPE,
        prompt: 'select_account',
        state: params.state
    })

    return `${GOOGLE_AUTHORIZATION_URL}?${searchParams.toString()}`
}

export async function exchangeGoogleCodeForAccessToken(params: { code: string; redirectUri: string }): Promise<string> {
    const config = getGoogleAuthConfig()
    if (!config) {
        throw new Error('Google OAuth is not configured.')
    }

    const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            code: params.code,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            redirect_uri: params.redirectUri,
            grant_type: 'authorization_code'
        })
    })

    const data = (await response.json()) as GoogleTokenResponse
    if (!response.ok || typeof data.access_token !== 'string' || !data.access_token) {
        throw new Error(data.error_description ?? data.error ?? 'Unable to exchange the Google authorization code.')
    }

    return data.access_token
}

export async function fetchGoogleUserProfile(accessToken: string): Promise<GoogleUserProfile> {
    const response = await fetch(GOOGLE_USERINFO_URL, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    })

    const data = (await response.json()) as GoogleUserInfoResponse
    if (
        !response.ok ||
        typeof data.sub !== 'string' ||
        typeof data.email !== 'string' ||
        typeof data.email_verified !== 'boolean'
    ) {
        throw new Error('Unable to load the Google account profile.')
    }

    return {
        subject: data.sub,
        email: data.email.trim().toLowerCase(),
        emailVerified: data.email_verified,
        givenName: typeof data.given_name === 'string' && data.given_name.trim() ? data.given_name.trim() : null,
        familyName: typeof data.family_name === 'string' && data.family_name.trim() ? data.family_name.trim() : null,
        picture: typeof data.picture === 'string' && data.picture.trim() ? data.picture.trim() : null
    }
}

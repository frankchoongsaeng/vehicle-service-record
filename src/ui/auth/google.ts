import { getSafeRedirectTarget } from './redirect.js'
import type { BillingSignupIntent } from './onboarding.js'

const GOOGLE_AUTH_ENTRY_PATHS = new Set(['/login', '/signup'])

const GOOGLE_AUTH_ERROR_MESSAGES: Record<string, string> = {
    google_cancelled: 'Google sign-in was cancelled before it completed.',
    google_failed: 'Google sign-in could not be completed. Please try again.',
    google_state_invalid: 'Your Google sign-in session expired. Start again and retry.',
    google_unavailable: 'Google sign-in is not configured for this environment yet.',
    google_unverified_email: 'The selected Google account does not have a verified email address.'
}

export function buildGoogleAuthStartUrl(
    redirectTo: string,
    authPath: string,
    billingIntent: BillingSignupIntent = null
): string {
    const params = new URLSearchParams({
        redirectTo: getSafeRedirectTarget(redirectTo),
        authPath: GOOGLE_AUTH_ENTRY_PATHS.has(authPath) ? authPath : '/login'
    })

    if (billingIntent) {
        params.set('plan', billingIntent.planCode)
        params.set('billing', billingIntent.billingInterval)
    }

    return `/api/auth/google/start?${params.toString()}`
}

export function getGoogleAuthErrorMessage(value: string | null): string | null {
    if (!value) {
        return null
    }

    return GOOGLE_AUTH_ERROR_MESSAGES[value] ?? 'Google sign-in could not be completed. Please try again.'
}

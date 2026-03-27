import type { AuthUser } from '../types/index.js'
import type { BillingInterval, PlanCode } from '../types/index.js'
import { getSafeRedirectTarget } from './redirect.js'

export const ONBOARDING_PATH = '/onboarding'

export const ONBOARDING_STEPS = ['profile', 'preferences'] as const

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]
export type BillingSignupIntent = {
    planCode: Exclude<PlanCode, 'free'>
    billingInterval: BillingInterval
} | null

export function hasCompletedOnboarding(user: Pick<AuthUser, 'onboardingCompletedAt'> | null | undefined): boolean {
    return Boolean(user?.onboardingCompletedAt)
}

export function hasVerifiedEmail(user: Pick<AuthUser, 'emailVerifiedAt'> | null | undefined): boolean {
    return Boolean(user?.emailVerifiedAt)
}

export function resolveOnboardingStep(value: string | null): OnboardingStep {
    return value === 'preferences' ? 'preferences' : 'profile'
}

export function getSafePostOnboardingRedirectTarget(value: string | null | undefined): string {
    const nextTarget = getSafeRedirectTarget(value)

    if (nextTarget === ONBOARDING_PATH || nextTarget.startsWith(`${ONBOARDING_PATH}?`)) {
        return '/garage'
    }

    return nextTarget
}

function normalizePostBillingRedirectTarget(value: string | null | undefined): string {
    const nextTarget = getSafePostOnboardingRedirectTarget(value)

    if (nextTarget === '/pricing' || nextTarget.startsWith('/pricing?')) {
        return '/garage'
    }

    return nextTarget
}

export function resolveBillingSignupIntent(searchParams: Pick<URLSearchParams, 'get'>): BillingSignupIntent {
    const planCode = searchParams.get('plan')
    const billingInterval = searchParams.get('billing')

    if ((planCode === 'plus' || planCode === 'garage') && (billingInterval === 'month' || billingInterval === 'year')) {
        return {
            planCode,
            billingInterval
        }
    }

    return null
}

export function appendBillingSignupIntent(
    params: URLSearchParams,
    billingIntent: BillingSignupIntent
): URLSearchParams {
    params.delete('plan')
    params.delete('billing')

    if (billingIntent) {
        params.set('plan', billingIntent.planCode)
        params.set('billing', billingIntent.billingInterval)
    }

    return params
}

export function buildAuthRoutePath(
    authPath: '/login' | '/signup',
    redirectTo: string,
    billingIntent: BillingSignupIntent
): string {
    const params = new URLSearchParams()
    const nextTarget = getSafeRedirectTarget(redirectTo)

    if (nextTarget !== '/garage') {
        params.set('redirectTo', nextTarget)
    }

    appendBillingSignupIntent(params, billingIntent)

    return params.size > 0 ? `${authPath}?${params.toString()}` : authPath
}

export function buildSignupUrlForPlan(planCode: Exclude<PlanCode, 'free'>, billingInterval: BillingInterval): string {
    return buildAuthRoutePath('/signup', '/garage', {
        planCode,
        billingInterval
    })
}

export function buildPostAuthenticationBillingSetupUrl(
    billingIntent: Exclude<BillingSignupIntent, null>,
    redirectTo: string
): string {
    const params = new URLSearchParams({
        billing: billingIntent.billingInterval,
        checkoutPlan: billingIntent.planCode,
        postAuthSetup: '1'
    })
    const returnTo = normalizePostBillingRedirectTarget(redirectTo)

    if (returnTo !== '/garage') {
        params.set('returnTo', returnTo)
    }

    return `/pricing?${params.toString()}`
}

export function buildOnboardingUrl(redirectTo: string): string {
    const nextTarget = getSafeRedirectTarget(redirectTo)

    if (nextTarget === '/garage') {
        return ONBOARDING_PATH
    }

    return `${ONBOARDING_PATH}?redirectTo=${encodeURIComponent(nextTarget)}`
}

export function getPostAuthenticationDestination(
    user: Pick<AuthUser, 'onboardingCompletedAt'> | null | undefined,
    redirectTo: string,
    billingIntent: BillingSignupIntent = null
): string {
    if (billingIntent) {
        return buildPostAuthenticationBillingSetupUrl(billingIntent, redirectTo)
    }

    return hasCompletedOnboarding(user) ? getSafeRedirectTarget(redirectTo) : buildOnboardingUrl(redirectTo)
}

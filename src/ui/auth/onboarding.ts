import type { AuthUser } from '../types/index.js'
import { getSafeRedirectTarget } from './redirect.js'

export const ONBOARDING_PATH = '/onboarding'

export const ONBOARDING_STEPS = ['profile', 'preferences'] as const

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

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

export function buildOnboardingUrl(redirectTo: string): string {
    const nextTarget = getSafeRedirectTarget(redirectTo)

    if (nextTarget === '/garage') {
        return ONBOARDING_PATH
    }

    return `${ONBOARDING_PATH}?redirectTo=${encodeURIComponent(nextTarget)}`
}

export function getPostAuthenticationDestination(
    user: Pick<AuthUser, 'onboardingCompletedAt'> | null | undefined,
    redirectTo: string
): string {
    return hasCompletedOnboarding(user) ? getSafeRedirectTarget(redirectTo) : buildOnboardingUrl(redirectTo)
}

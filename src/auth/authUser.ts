import type { Prisma } from '@prisma/client'

import {
    DEFAULT_HISTORY_SORT_ORDER,
    DEFAULT_PREFERRED_CURRENCY,
    isHistorySortOrder,
    isPreferredCurrencyCode
} from '../types/userSettings.js'
import type { AuthUser } from '../types/auth.js'

export const authUserSelect = {
    id: true,
    email: true,
    first_name: true,
    last_name: true,
    country: true,
    profile_image_url: true,
    preferred_currency: true,
    history_sort_order: true,
    onboarding_completed_at: true
} satisfies Prisma.UserSelect

type AuthUserRecord = Prisma.UserGetPayload<{ select: typeof authUserSelect }>

export function serializeAuthUser(user: AuthUserRecord): AuthUser {
    const preferredCurrency = isPreferredCurrencyCode(user.preferred_currency)
        ? user.preferred_currency
        : DEFAULT_PREFERRED_CURRENCY
    const historySortOrder = isHistorySortOrder(user.history_sort_order)
        ? user.history_sort_order
        : DEFAULT_HISTORY_SORT_ORDER

    return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        country: user.country,
        profileImageUrl: user.profile_image_url,
        preferredCurrency,
        historySortOrder,
        onboardingCompletedAt: user.onboarding_completed_at?.toISOString() ?? null
    }
}

import type { HistorySortOrder, PreferredCurrencyCode } from './userSettings.js'

export type AuthUser = {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    country: string | null
    profileImageUrl: string | null
    preferredCurrency: PreferredCurrencyCode
    historySortOrder: HistorySortOrder
    onboardingCompletedAt: string | null
}

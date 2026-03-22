import type { PreferredCurrencyCode } from './userSettings.js'

export type AuthUser = {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    country: string | null
    profileImageUrl: string | null
    preferredCurrency: PreferredCurrencyCode
}

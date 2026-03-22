export const PREFERRED_CURRENCIES = [
    { value: 'USD', label: 'US Dollar', locale: 'en-US' },
    { value: 'EUR', label: 'Euro', locale: 'de-DE' },
    { value: 'GBP', label: 'British Pound', locale: 'en-GB' },
    { value: 'CAD', label: 'Canadian Dollar', locale: 'en-CA' },
    { value: 'AUD', label: 'Australian Dollar', locale: 'en-AU' },
    { value: 'JPY', label: 'Japanese Yen', locale: 'ja-JP' }
] as const

export type PreferredCurrencyCode = (typeof PREFERRED_CURRENCIES)[number]['value']

export const DEFAULT_PREFERRED_CURRENCY: PreferredCurrencyCode = 'USD'

export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024

export const PROFILE_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

export type ProfileImageMimeType = (typeof PROFILE_IMAGE_MIME_TYPES)[number]

export function isPreferredCurrencyCode(value: string): value is PreferredCurrencyCode {
    return PREFERRED_CURRENCIES.some(currency => currency.value === value)
}

export function isProfileImageMimeType(value: string): value is ProfileImageMimeType {
    return PROFILE_IMAGE_MIME_TYPES.some(contentType => contentType === value)
}

export function getPreferredCurrencyDefinition(currency: PreferredCurrencyCode) {
    return PREFERRED_CURRENCIES.find(option => option.value === currency) ?? PREFERRED_CURRENCIES[0]
}

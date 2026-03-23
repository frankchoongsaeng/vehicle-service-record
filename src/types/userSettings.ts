type PreferredCurrencyDefinition = {
    value: string
    label: string
    symbol: string | null
}

function getSupportedCurrencyCodes() {
    const supportedValuesOf = Reflect.get(Intl, 'supportedValuesOf') as ((key: string) => string[]) | undefined

    if (typeof supportedValuesOf === 'function') {
        return supportedValuesOf('currency')
    }

    return ['USD']
}

function getCurrencyLabel(value: string) {
    const displayNamesConstructor = Reflect.get(Intl, 'DisplayNames') as
        | (new (locales?: string | string[], options?: { type: 'currency' }) => {
              of(code: string): string | undefined
          })
        | undefined

    if (typeof displayNamesConstructor !== 'function') {
        return value
    }

    const label = new displayNamesConstructor(['en'], { type: 'currency' }).of(value)

    return label ?? value
}

function resolveCurrencySymbol(value: string, currencyDisplay: 'symbol' | 'narrowSymbol') {
    const formatter = new Intl.NumberFormat('en', {
        style: 'currency',
        currency: value,
        currencyDisplay,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    })

    const symbol = formatter
        .formatToParts(0)
        .find(part => part.type === 'currency')
        ?.value?.trim()

    if (!symbol || symbol === value) {
        return null
    }

    return symbol
}

function getCurrencySymbol(value: string) {
    return resolveCurrencySymbol(value, 'narrowSymbol') ?? resolveCurrencySymbol(value, 'symbol')
}

export const PREFERRED_CURRENCIES = getSupportedCurrencyCodes()
    .map<PreferredCurrencyDefinition>(value => ({
        value,
        label: getCurrencyLabel(value),
        symbol: getCurrencySymbol(value)
    }))
    .sort((left, right) => left.label.localeCompare(right.label, 'en'))

export type PreferredCurrencyCode = string

export const DEFAULT_PREFERRED_CURRENCY: PreferredCurrencyCode = 'USD'

const preferredCurrencyLookup = new Map(PREFERRED_CURRENCIES.map(currency => [currency.value, currency] as const))

export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024

export const PROFILE_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

export type ProfileImageMimeType = (typeof PROFILE_IMAGE_MIME_TYPES)[number]

export function isPreferredCurrencyCode(value: string): value is PreferredCurrencyCode {
    return preferredCurrencyLookup.has(value)
}

export function isProfileImageMimeType(value: string): value is ProfileImageMimeType {
    return PROFILE_IMAGE_MIME_TYPES.some(contentType => contentType === value)
}

export function getPreferredCurrencyDefinition(currency: PreferredCurrencyCode) {
    return (
        preferredCurrencyLookup.get(currency) ?? {
            value: currency,
            label: getCurrencyLabel(currency),
            symbol: getCurrencySymbol(currency)
        }
    )
}

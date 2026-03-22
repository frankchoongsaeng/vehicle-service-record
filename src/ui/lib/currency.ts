import {
    DEFAULT_PREFERRED_CURRENCY,
    getPreferredCurrencyDefinition,
    type PreferredCurrencyCode
} from '../../types/userSettings.js'

export { DEFAULT_PREFERRED_CURRENCY }
export type { PreferredCurrencyCode }

export function formatCurrencyAmount(
    value: number | null | undefined,
    currency: PreferredCurrencyCode = DEFAULT_PREFERRED_CURRENCY
) {
    if (value == null) {
        return 'N/A'
    }

    const { locale } = getPreferredCurrencyDefinition(currency)

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value)
}

export function getCurrencyLabel(currency: PreferredCurrencyCode) {
    const definition = getPreferredCurrencyDefinition(currency)

    return `${definition.label} (${currency})`
}

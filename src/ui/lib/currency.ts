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

    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value)
}

export function getCurrencyLabel(currency: PreferredCurrencyCode) {
    const definition = getPreferredCurrencyDefinition(currency)

    if (definition.symbol) {
        return `${definition.label} (${definition.symbol}) (${currency})`
    }

    return `${definition.label} (${currency})`
}

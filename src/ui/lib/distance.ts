import { DEFAULT_DISTANCE_UNIT, type DistanceUnit, isDistanceUnit } from '../../types/distance.js'

export { DEFAULT_DISTANCE_UNIT }
export type { DistanceUnit }

export function normalizeDistanceUnit(value: string | null | undefined): DistanceUnit {
    return isDistanceUnit(value) ? value : DEFAULT_DISTANCE_UNIT
}

export function getDistanceUnitSuffix(unit: DistanceUnit | string | null | undefined): DistanceUnit {
    return normalizeDistanceUnit(unit)
}

export function getDistanceUnitLabel(unit: DistanceUnit | string | null | undefined): string {
    return getDistanceUnitSuffix(unit) === 'km' ? 'Kilometers (km)' : 'Miles (mi)'
}

export function formatDistance(
    value: number | null | undefined,
    unit: DistanceUnit | string | null | undefined,
    fallback = 'Not recorded'
): string {
    return value == null ? fallback : `${value.toLocaleString()} ${getDistanceUnitSuffix(unit)}`
}

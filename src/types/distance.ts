export const DISTANCE_UNITS = ['km', 'mi'] as const

export type DistanceUnit = (typeof DISTANCE_UNITS)[number]

export const DEFAULT_DISTANCE_UNIT: DistanceUnit = 'mi'

export function isDistanceUnit(value: unknown): value is DistanceUnit {
    return typeof value === 'string' && DISTANCE_UNITS.includes(value as DistanceUnit)
}

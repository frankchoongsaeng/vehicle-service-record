import type { DistanceUnit } from '../types/distance.js'

export type MaintenanceStatus = 'Overdue' | 'Upcoming' | 'Planned'

export type ReminderThresholdMetrics = {
    daysRemaining: number | null
    mileageRemaining: number | null
}

export type MaintenancePlanLike = {
    id: number | string
    title: string
    description?: string | null
    intervalMonths?: number | null
    intervalMileage?: number | null
    lastCompletedDate?: string | null
    lastCompletedMileage?: number | null
}

export type VehicleLike = {
    mileage?: number | null
    distanceUnit: DistanceUnit
}

function formatDistance(value: number, unit: DistanceUnit): string {
    return `${value.toLocaleString()} ${unit}`
}

export function formatMaintenanceDate(date: string): string {
    return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

export function addMonthsToIsoDate(date: string, months: number): string {
    const nextDate = new Date(`${date}T00:00:00`)
    nextDate.setMonth(nextDate.getMonth() + months)
    return nextDate.toISOString().slice(0, 10)
}

export function daysUntilIsoDate(date: string, now: Date): number {
    const futureDate = new Date(`${date}T00:00:00`)
    return Math.ceil((futureDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatMaintenanceInterval(
    intervalMonths?: number | null,
    intervalMileage?: number | null,
    distanceUnit: DistanceUnit = 'mi'
): string {
    const parts: string[] = []

    if (intervalMonths != null) {
        parts.push(`every ${intervalMonths} month${intervalMonths === 1 ? '' : 's'}`)
    }

    if (intervalMileage != null) {
        parts.push(`every ${intervalMileage.toLocaleString()} ${distanceUnit}`)
    }

    return parts.join(' or ')
}

export function getReminderThresholdMetrics(
    plan: MaintenancePlanLike,
    vehicle: VehicleLike,
    now: Date
): ReminderThresholdMetrics {
    const daysRemaining =
        plan.intervalMonths != null && plan.lastCompletedDate
            ? daysUntilIsoDate(addMonthsToIsoDate(plan.lastCompletedDate, plan.intervalMonths), now)
            : null

    const mileageRemaining =
        plan.intervalMileage != null && plan.lastCompletedMileage != null && vehicle.mileage != null
            ? plan.intervalMileage - (vehicle.mileage - plan.lastCompletedMileage)
            : null

    return { daysRemaining, mileageRemaining }
}

export function getMaintenanceStatus(plan: MaintenancePlanLike, vehicle: VehicleLike, now: Date): MaintenanceStatus {
    const { daysRemaining, mileageRemaining } = getReminderThresholdMetrics(plan, vehicle, now)
    const thresholds = [daysRemaining, mileageRemaining].filter((value): value is number => value != null)

    if (thresholds.length === 0) {
        return 'Planned'
    }

    if (thresholds.some(value => value <= 0)) {
        return 'Overdue'
    }

    if ((daysRemaining != null && daysRemaining <= 30) || (mileageRemaining != null && mileageRemaining <= 750)) {
        return 'Upcoming'
    }

    return 'Planned'
}

export function getMaintenanceDueLabel(plan: MaintenancePlanLike, vehicle: VehicleLike, now: Date): string {
    const { daysRemaining, mileageRemaining } = getReminderThresholdMetrics(plan, vehicle, now)
    const status = getMaintenanceStatus(plan, vehicle, now)

    if (daysRemaining == null && mileageRemaining == null) {
        if (
            plan.intervalMonths != null &&
            !plan.lastCompletedDate &&
            plan.intervalMileage != null &&
            plan.lastCompletedMileage == null
        ) {
            return 'Add last completed date or mileage'
        }

        if (plan.intervalMonths != null && !plan.lastCompletedDate) {
            return 'Add last completed date'
        }

        if (plan.intervalMileage != null && plan.lastCompletedMileage == null) {
            return 'Add last completed mileage'
        }

        if (plan.intervalMileage != null && vehicle.mileage == null) {
            return 'Update current vehicle mileage'
        }

        return 'Plan cadence saved'
    }

    const dayText =
        daysRemaining != null ? `${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'}` : null
    const mileageText =
        mileageRemaining != null ? formatDistance(Math.abs(mileageRemaining), vehicle.distanceUnit) : null

    if (status === 'Overdue') {
        const overdueParts = [
            daysRemaining != null && daysRemaining <= 0 && dayText ? dayText : null,
            mileageRemaining != null && mileageRemaining <= 0 && mileageText ? mileageText : null
        ].filter((value): value is string => value != null)

        return overdueParts.length > 0 ? `Overdue by ${overdueParts.join(' or ')}` : 'Overdue'
    }

    const dueParts = [
        dayText && daysRemaining != null
            ? `${Math.max(daysRemaining, 0)} day${Math.max(daysRemaining, 0) === 1 ? '' : 's'}`
            : null,
        mileageText && mileageRemaining != null
            ? formatDistance(Math.max(mileageRemaining, 0), vehicle.distanceUnit)
            : null
    ].filter((value): value is string => value != null)

    return dueParts.length > 0 ? `Due in ${dueParts.join(' or ')}` : 'Plan cadence saved'
}

export function getMaintenanceLastCompletedLabel(plan: MaintenancePlanLike, distanceUnit: DistanceUnit = 'mi'): string {
    const parts: string[] = []

    if (plan.lastCompletedDate) {
        parts.push(formatMaintenanceDate(plan.lastCompletedDate))
    }

    if (plan.lastCompletedMileage != null) {
        parts.push(formatDistance(plan.lastCompletedMileage, distanceUnit))
    }

    return parts.length > 0 ? `Last completed ${parts.join(' at ')}` : 'No last completed baseline saved'
}

export type EvaluatedMaintenancePlan<TPlan extends MaintenancePlanLike = MaintenancePlanLike> = {
    plan: TPlan
    status: MaintenanceStatus
    dueLabel: string
    lastCompletedLabel: string
    intervalLabel: string
    metrics: ReminderThresholdMetrics
}

export function evaluateMaintenancePlan<TPlan extends MaintenancePlanLike>(
    plan: TPlan,
    vehicle: VehicleLike,
    now: Date
): EvaluatedMaintenancePlan<TPlan> {
    return {
        plan,
        status: getMaintenanceStatus(plan, vehicle, now),
        dueLabel: getMaintenanceDueLabel(plan, vehicle, now),
        lastCompletedLabel: getMaintenanceLastCompletedLabel(plan, vehicle.distanceUnit),
        intervalLabel: formatMaintenanceInterval(plan.intervalMonths, plan.intervalMileage, vehicle.distanceUnit),
        metrics: getReminderThresholdMetrics(plan, vehicle, now)
    }
}

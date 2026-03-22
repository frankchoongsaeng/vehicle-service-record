import {
    getServiceTypeLabel,
    type MaintenancePlan,
    type ServiceRecord as ApiServiceRecord,
    type Vehicle
} from '../types/index.js'
import type {
    ServiceRecord,
    ServiceStatus,
    SummaryStat,
    TimelineEvent,
    UpcomingItem
} from '../components/dashboard/types.js'
import type { AuthUser } from '../types/index.js'
import { DEFAULT_PREFERRED_CURRENCY, formatCurrencyAmount, type PreferredCurrencyCode } from './currency.js'

type UpcomingCandidate = UpcomingItem & { urgency: number }
type PlanThresholdMetrics = {
    daysRemaining: number | null
    mileageRemaining: number | null
}

export type EvaluatedMaintenancePlan = {
    id: string
    title: string
    description?: string
    interval: string
    due: string
    lastCompleted: string
    status: ServiceStatus
}

export function getServiceLabel(serviceType: string) {
    return getServiceTypeLabel(serviceType)
}

export function getServiceCategory(serviceType: string) {
    switch (serviceType) {
        case 'oil_change':
        case 'coolant':
        case 'transmission':
            return 'Fluids'
        case 'tire_rotation':
        case 'tire_replacement':
            return 'Tires'
        case 'brake_service':
            return 'Brakes'
        case 'battery':
            return 'Electrical'
        case 'air_filter':
        case 'cabin_filter':
            return 'Filters'
        case 'spark_plugs':
        case 'timing_belt':
            return 'Engine'
        case 'inspection':
            return 'Inspection'
        default:
            return 'General'
    }
}

export function formatMileage(value: number | null | undefined) {
    return value == null ? 'Not recorded' : `${value.toLocaleString()} mi`
}

export function formatCurrency(
    value: number | null | undefined,
    currency: PreferredCurrencyCode = DEFAULT_PREFERRED_CURRENCY
) {
    return formatCurrencyAmount(value, currency)
}

export function formatDate(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

function daysUntil(date: string, now: Date) {
    const futureDate = new Date(`${date}T00:00:00`)
    return Math.ceil((futureDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function addMonths(date: string, months: number) {
    const nextDate = new Date(`${date}T00:00:00`)
    nextDate.setMonth(nextDate.getMonth() + months)
    return nextDate.toISOString().slice(0, 10)
}

function formatInterval(intervalMonths?: number | null, intervalMileage?: number | null) {
    const parts: string[] = []

    if (intervalMonths != null) {
        parts.push(`every ${intervalMonths} month${intervalMonths === 1 ? '' : 's'}`)
    }

    if (intervalMileage != null) {
        parts.push(`every ${intervalMileage.toLocaleString()} mi`)
    }

    return parts.join(' or ')
}

function getPlanThresholdMetrics(plan: MaintenancePlan, vehicle: Vehicle, now: Date): PlanThresholdMetrics {
    const daysRemaining =
        plan.intervalMonths != null && plan.lastCompletedDate
            ? daysUntil(addMonths(plan.lastCompletedDate, plan.intervalMonths), now)
            : null

    const mileageRemaining =
        plan.intervalMileage != null && plan.lastCompletedMileage != null && vehicle.mileage != null
            ? plan.intervalMileage - (vehicle.mileage - plan.lastCompletedMileage)
            : null

    return { daysRemaining, mileageRemaining }
}

export function getMaintenancePlanStatus(plan: MaintenancePlan, vehicle: Vehicle, now: Date): ServiceStatus {
    const { daysRemaining, mileageRemaining } = getPlanThresholdMetrics(plan, vehicle, now)
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

export function getMaintenancePlanDue(plan: MaintenancePlan, vehicle: Vehicle, now: Date): string {
    const { daysRemaining, mileageRemaining } = getPlanThresholdMetrics(plan, vehicle, now)
    const status = getMaintenancePlanStatus(plan, vehicle, now)

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
    const mileageText = mileageRemaining != null ? `${Math.abs(mileageRemaining).toLocaleString()} mi` : null

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
        mileageText && mileageRemaining != null ? `${Math.max(mileageRemaining, 0).toLocaleString()} mi` : null
    ].filter((value): value is string => value != null)

    return dueParts.length > 0 ? `Due in ${dueParts.join(' or ')}` : 'Plan cadence saved'
}

export function getMaintenancePlanLastCompleted(plan: MaintenancePlan): string {
    const parts: string[] = []

    if (plan.lastCompletedDate) {
        parts.push(formatDate(plan.lastCompletedDate))
    }

    if (plan.lastCompletedMileage != null) {
        parts.push(`${plan.lastCompletedMileage.toLocaleString()} mi`)
    }

    return parts.length > 0 ? `Last completed ${parts.join(' at ')}` : 'No last completed baseline saved'
}

export function evaluateMaintenancePlans(
    plans: MaintenancePlan[],
    vehicle: Vehicle,
    now: Date
): EvaluatedMaintenancePlan[] {
    return plans
        .map(plan => ({
            id: String(plan.id),
            title: plan.title,
            description: plan.description ?? undefined,
            interval: formatInterval(plan.intervalMonths, plan.intervalMileage),
            due: getMaintenancePlanDue(plan, vehicle, now),
            lastCompleted: getMaintenancePlanLastCompleted(plan),
            status: getMaintenancePlanStatus(plan, vehicle, now)
        }))
        .sort((left, right) => {
            const urgencyScore = { Overdue: 0, Upcoming: 1, Planned: 2, Completed: 3 } as const
            return urgencyScore[left.status] - urgencyScore[right.status] || left.title.localeCompare(right.title)
        })
}

export function getRecordStatus(record: ApiServiceRecord, now: Date): ServiceStatus {
    const daysRemaining = daysUntil(record.date, now)

    if (daysRemaining > 30) {
        return 'Planned'
    }

    if (daysRemaining > 0) {
        return 'Upcoming'
    }

    return 'Completed'
}

export async function fetchApiData<T>(request: Request, path: string): Promise<T> {
    const url = new URL(path, request.url)
    const response = await fetch(url, {
        headers: {
            cookie: request.headers.get('cookie') ?? '',
            'x-request-id': request.headers.get('x-request-id') ?? `loader-${Date.now()}`
        }
    })

    if (response.status === 401) {
        const requestUrl = new URL(request.url)
        const redirectTo = `${requestUrl.pathname}${requestUrl.search}${requestUrl.hash}`
        throw new Response(null, {
            status: 302,
            headers: {
                Location: `/login?redirectTo=${encodeURIComponent(redirectTo)}`
            }
        })
    }

    if (response.status === 404) {
        throw new Response('Not found', { status: 404 })
    }

    if (!response.ok) {
        throw new Response('Failed to load vehicle data', { status: response.status })
    }

    return (await response.json()) as T
}

export async function fetchAuthenticatedUser(request: Request): Promise<AuthUser> {
    const response = await fetchApiData<{ user: AuthUser }>(request, '/api/auth/session')

    return response.user
}

export function buildDisplayServiceRecords(
    records: ApiServiceRecord[],
    now: Date,
    currency: PreferredCurrencyCode = DEFAULT_PREFERRED_CURRENCY
): ServiceRecord[] {
    return [...records]
        .sort((left, right) => right.date.localeCompare(left.date) || right.id - left.id)
        .map(record => ({
            id: String(record.id),
            date: formatDate(record.date),
            mileage: formatMileage(record.mileage),
            service: getServiceLabel(record.service_type),
            workshop: record.workshop?.trim() || 'Not specified',
            category: getServiceCategory(record.service_type),
            cost: formatCurrency(record.cost, currency),
            status: getRecordStatus(record, now),
            detail: record.description,
            notes: record.notes ?? undefined
        }))
}

export function buildUpcomingItems(vehicle: Vehicle, plans: MaintenancePlan[], now: Date): UpcomingItem[] {
    const items: UpcomingCandidate[] = evaluateMaintenancePlans(plans, vehicle, now).map(plan => ({
        id: `plan-${plan.id}`,
        title: plan.title,
        due: plan.due,
        status: plan.status,
        urgency: plan.status === 'Overdue' ? 0 : plan.status === 'Upcoming' ? 1 : 2
    }))

    return items
        .sort((left, right) => left.urgency - right.urgency || left.title.localeCompare(right.title))
        .slice(0, 3)
        .map(item => ({
            id: item.id,
            title: item.title,
            due: item.due,
            status: item.status
        }))
}

export function buildTimeline(records: ApiServiceRecord[], upcomingItems: UpcomingItem[], now: Date): TimelineEvent[] {
    const scheduledEvents = [...records]
        .filter(record => getRecordStatus(record, now) !== 'Completed')
        .sort((left, right) => left.date.localeCompare(right.date) || left.id - right.id)
        .slice(0, 2)
        .map(record => ({
            id: `scheduled-${record.id}`,
            title: `${getServiceLabel(record.service_type)} scheduled`,
            date: formatDate(record.date),
            detail: record.description,
            tone: 'neutral' as const
        }))

    const recentCompletedEvents = [...records]
        .filter(record => getRecordStatus(record, now) === 'Completed')
        .sort((left, right) => right.date.localeCompare(left.date) || right.id - left.id)
        .slice(0, 3)
        .map(record => ({
            id: `record-${record.id}`,
            title: `${getServiceLabel(record.service_type)} completed`,
            date: formatDate(record.date),
            detail: record.description,
            tone: 'success' as const
        }))

    const alertEvents = upcomingItems
        .filter(item => item.status === 'Overdue')
        .slice(0, 2)
        .map(item => ({
            id: `alert-${item.id}`,
            title: item.title,
            date: item.due,
            detail: 'This service is overdue based on the current mileage and recorded maintenance history.',
            tone: 'warning' as const
        }))

    return [...alertEvents, ...scheduledEvents, ...recentCompletedEvents]
}

export function buildSummaryStats(
    vehicle: Vehicle,
    records: ApiServiceRecord[],
    plans: MaintenancePlan[],
    now: Date,
    currency: PreferredCurrencyCode = DEFAULT_PREFERRED_CURRENCY
): SummaryStat[] {
    const completedRecords = records
        .filter(record => getRecordStatus(record, now) === 'Completed')
        .sort((left, right) => right.date.localeCompare(left.date) || right.id - left.id)
    const lastCompleted = completedRecords[0]
    const totalMaintenanceCost = completedRecords.reduce((total, record) => total + (record.cost ?? 0), 0)
    const overdueCount = plans.filter(plan => getMaintenancePlanStatus(plan, vehicle, now) === 'Overdue').length

    return [
        {
            title: 'Current Mileage',
            value: formatMileage(vehicle.mileage),
            hint:
                vehicle.purchaseMileage != null
                    ? `Purchased at ${vehicle.purchaseMileage.toLocaleString()} mi`
                    : 'Purchase mileage not recorded'
        },
        {
            title: 'Total Maintenance Cost',
            value: formatCurrency(totalMaintenanceCost, currency),
            hint: `${completedRecords.length} completed record${completedRecords.length === 1 ? '' : 's'}`
        },
        {
            title: 'Overdue Items',
            value: String(overdueCount),
            hint: overdueCount > 0 ? 'Based on saved maintenance plans' : 'No immediate maintenance alerts'
        },
        {
            title: 'Last Service',
            value: lastCompleted ? formatDate(lastCompleted.date) : 'No records yet',
            hint: lastCompleted
                ? getServiceLabel(lastCompleted.service_type)
                : 'Start by logging the first service event'
        }
    ]
}

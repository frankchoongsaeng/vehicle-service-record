import {
    getServiceTypeLabel,
    type MaintenancePlan,
    type ServiceRecord as ApiServiceRecord,
    type Vehicle
} from '../types/index.js'
import {
    daysUntilIsoDate,
    evaluateMaintenancePlan,
    formatMaintenanceDate,
    getMaintenanceDueLabel,
    getMaintenanceLastCompletedLabel,
    getMaintenanceStatus
} from '../../lib/maintenanceEvaluation.js'
import type {
    ServiceRecord,
    ServiceStatus,
    SummaryStat,
    TimelineEvent,
    UpcomingItem
} from '../components/dashboard/types.js'
import type { AuthUser } from '../types/index.js'
import { DEFAULT_PREFERRED_CURRENCY, formatCurrencyAmount, type PreferredCurrencyCode } from './currency.js'
import { formatDistance, type DistanceUnit } from './distance.js'
import { DEFAULT_HISTORY_SORT_ORDER, type HistorySortOrder } from '../../types/userSettings.js'

type UpcomingCandidate = UpcomingItem & { urgency: number }

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

export function formatMileage(value: number | null | undefined, distanceUnit: DistanceUnit = 'mi') {
    return formatDistance(value, distanceUnit)
}

export function formatCurrency(
    value: number | null | undefined,
    currency: PreferredCurrencyCode = DEFAULT_PREFERRED_CURRENCY
) {
    return formatCurrencyAmount(value, currency)
}

export function formatDate(date: string) {
    return formatMaintenanceDate(date)
}

export function getMaintenancePlanStatus(plan: MaintenancePlan, vehicle: Vehicle, now: Date): ServiceStatus {
    return getMaintenanceStatus(plan, vehicle, now)
}

export function getMaintenancePlanDue(plan: MaintenancePlan, vehicle: Vehicle, now: Date): string {
    return getMaintenanceDueLabel(plan, vehicle, now)
}

export function getMaintenancePlanLastCompleted(plan: MaintenancePlan, distanceUnit: DistanceUnit = 'mi'): string {
    return getMaintenanceLastCompletedLabel(plan, distanceUnit)
}

export function evaluateMaintenancePlans(
    plans: MaintenancePlan[],
    vehicle: Vehicle,
    now: Date
): EvaluatedMaintenancePlan[] {
    return plans
        .map(plan => {
            const evaluation = evaluateMaintenancePlan(plan, vehicle, now)

            return {
                id: String(plan.id),
                title: plan.title,
                description: plan.description ?? undefined,
                interval: evaluation.intervalLabel,
                due: evaluation.dueLabel,
                lastCompleted: evaluation.lastCompletedLabel,
                status: evaluation.status
            }
        })
        .sort((left, right) => {
            const urgencyScore = { Overdue: 0, Upcoming: 1, Planned: 2, Completed: 3 } as const
            return urgencyScore[left.status] - urgencyScore[right.status] || left.title.localeCompare(right.title)
        })
}

export function getRecordStatus(record: ApiServiceRecord, now: Date): ServiceStatus {
    const daysRemaining = daysUntilIsoDate(record.date, now)

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
    currency: PreferredCurrencyCode = DEFAULT_PREFERRED_CURRENCY,
    distanceUnit: DistanceUnit = 'mi',
    historySortOrder: HistorySortOrder = DEFAULT_HISTORY_SORT_ORDER
): ServiceRecord[] {
    return [...records]
        .sort((left, right) => {
            if (historySortOrder === 'oldest_first') {
                return left.date.localeCompare(right.date) || left.id - right.id
            }

            return right.date.localeCompare(left.date) || right.id - left.id
        })
        .map(record => ({
            id: String(record.id),
            date: formatDate(record.date),
            mileage: formatMileage(record.mileage, distanceUnit),
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
            value: formatMileage(vehicle.mileage, vehicle.distanceUnit),
            hint:
                vehicle.purchaseMileage != null
                    ? `Purchased at ${formatDistance(vehicle.purchaseMileage, vehicle.distanceUnit)}`
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

import { redirect } from '@remix-run/node'

import { SERVICE_TYPES, type ServiceRecord as ApiServiceRecord, type Vehicle } from '../types/index.js'
import type {
    ServiceRecord,
    ServiceStatus,
    SummaryStat,
    TimelineEvent,
    UpcomingItem
} from '../components/dashboard/types.js'

type MaintenanceRule = {
    serviceType: string
    label: string
    mileageInterval?: number
    dayInterval?: number
}

type UpcomingCandidate = UpcomingItem & { urgency: number }

const serviceLabelByValue = new Map(SERVICE_TYPES.map(serviceType => [serviceType.value, serviceType.label]))

const maintenanceRules: MaintenanceRule[] = [
    { serviceType: 'oil_change', label: 'Engine Oil & Filter', mileageInterval: 5000, dayInterval: 180 },
    { serviceType: 'tire_rotation', label: 'Tire Rotation', mileageInterval: 6000, dayInterval: 180 },
    { serviceType: 'inspection', label: 'Inspection', dayInterval: 365 },
    { serviceType: 'brake_service', label: 'Brake Service Check', mileageInterval: 12000, dayInterval: 365 },
    { serviceType: 'cabin_filter', label: 'Cabin Filter', mileageInterval: 15000, dayInterval: 365 },
    { serviceType: 'air_filter', label: 'Engine Air Filter', mileageInterval: 15000, dayInterval: 365 }
]

export function getServiceLabel(serviceType: string) {
    return serviceLabelByValue.get(serviceType) ?? serviceType
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

export function formatCurrency(value: number | null | undefined) {
    return value == null ? 'N/A' : `$${value.toFixed(2)}`
}

export function formatDate(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

function daysBetween(startDate: string, endDate: Date) {
    const start = new Date(`${startDate}T00:00:00`)
    const diff = endDate.getTime() - start.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function daysUntil(date: string, now: Date) {
    const futureDate = new Date(`${date}T00:00:00`)
    return Math.ceil((futureDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function getRecordStatus(record: ApiServiceRecord, now: Date): ServiceStatus {
    const remainingDays = daysUntil(record.date, now)

    if (remainingDays > 30) {
        return 'Planned'
    }

    if (remainingDays > 0) {
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
        throw redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`)
    }

    if (response.status === 404) {
        throw new Response('Not found', { status: 404 })
    }

    if (!response.ok) {
        throw new Response('Failed to load vehicle data', { status: response.status })
    }

    return (await response.json()) as T
}

export function buildDisplayServiceRecords(records: ApiServiceRecord[], now: Date): ServiceRecord[] {
    return [...records]
        .sort((left, right) => right.date.localeCompare(left.date) || right.id - left.id)
        .map(record => ({
            id: String(record.id),
            date: formatDate(record.date),
            mileage: formatMileage(record.mileage),
            service: getServiceLabel(record.service_type),
            workshop: 'Logged in Duralog',
            category: getServiceCategory(record.service_type),
            cost: formatCurrency(record.cost),
            status: getRecordStatus(record, now),
            detail: record.description,
            notes: record.notes ?? undefined
        }))
}

export function buildUpcomingItems(vehicle: Vehicle, records: ApiServiceRecord[], now: Date): UpcomingItem[] {
    const items: UpcomingCandidate[] = maintenanceRules.map(rule => {
        const matchingRecords = records
            .filter(record => record.service_type === rule.serviceType)
            .sort((left, right) => left.date.localeCompare(right.date) || left.id - right.id)

        const nextScheduled = matchingRecords.find(record => getRecordStatus(record, now) !== 'Completed')
        if (nextScheduled) {
            const remainingDays = Math.max(daysUntil(nextScheduled.date, now), 0)
            const status = getRecordStatus(nextScheduled, now)

            return {
                id: `upcoming-${rule.serviceType}`,
                title: rule.label,
                due: `Scheduled for ${formatDate(nextScheduled.date)}`,
                status,
                urgency: status === 'Upcoming' ? 1 : 2
            }
        }

        const completedRecords = [...matchingRecords].filter(record => getRecordStatus(record, now) === 'Completed')
        const latestRecord = completedRecords.at(-1)
        if (!latestRecord) {
            return {
                id: `upcoming-${rule.serviceType}`,
                title: rule.label,
                due: 'No recorded service yet',
                status: 'Planned',
                urgency: 2
            }
        }

        const daysSinceService = daysBetween(latestRecord.date, now)
        const mileageSinceService =
            vehicle.mileage != null && latestRecord.mileage != null ? vehicle.mileage - latestRecord.mileage : null
        const mileageRemaining =
            mileageSinceService != null && rule.mileageInterval != null
                ? rule.mileageInterval - mileageSinceService
                : null
        const daysRemaining = rule.dayInterval != null ? rule.dayInterval - daysSinceService : null

        let status: ServiceStatus = 'Planned'
        if ((mileageRemaining != null && mileageRemaining <= 0) || (daysRemaining != null && daysRemaining <= 0)) {
            status = 'Overdue'
        } else if (
            (mileageRemaining != null && mileageRemaining <= 750) ||
            (daysRemaining != null && daysRemaining <= 30)
        ) {
            status = 'Upcoming'
        }

        let due = `Last completed ${formatDate(latestRecord.date)}`
        if (status === 'Overdue') {
            if (mileageRemaining != null && mileageRemaining <= 0) {
                due = `Overdue by ${Math.abs(mileageRemaining).toLocaleString()} mi`
            } else if (daysRemaining != null && daysRemaining <= 0) {
                due = `Overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'}`
            }
        } else if (status === 'Upcoming') {
            if (mileageRemaining != null) {
                due = `Due in ${Math.max(mileageRemaining, 0).toLocaleString()} mi`
            } else if (daysRemaining != null) {
                due = `Due in ${Math.max(daysRemaining, 0)} day${Math.max(daysRemaining, 0) === 1 ? '' : 's'}`
            }
        }

        return {
            id: `upcoming-${rule.serviceType}`,
            title: rule.label,
            due,
            status,
            urgency: status === 'Overdue' ? 0 : status === 'Upcoming' ? 1 : 2
        }
    })

    return items
        .sort((left, right) => left.urgency - right.urgency || left.title.localeCompare(right.title))
        .slice(0, 3)
        .map(({ urgency, ...item }) => item)
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
    upcomingItems: UpcomingItem[],
    now: Date
): SummaryStat[] {
    const completedRecords = records
        .filter(record => getRecordStatus(record, now) === 'Completed')
        .sort((left, right) => right.date.localeCompare(left.date) || right.id - left.id)
    const lastCompleted = completedRecords[0]
    const totalMaintenanceCost = completedRecords.reduce((total, record) => total + (record.cost ?? 0), 0)
    const overdueCount = upcomingItems.filter(item => item.status === 'Overdue').length

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
            value: formatCurrency(totalMaintenanceCost),
            hint: `${completedRecords.length} completed record${completedRecords.length === 1 ? '' : 's'}`
        },
        {
            title: 'Overdue Items',
            value: String(overdueCount),
            hint: overdueCount > 0 ? 'Action is recommended soon' : 'No immediate maintenance alerts'
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

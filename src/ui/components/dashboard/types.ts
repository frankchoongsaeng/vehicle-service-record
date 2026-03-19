export type ServiceStatus = 'Completed' | 'Upcoming' | 'Planned' | 'Overdue'

export interface SummaryStat {
    title: string
    value: string
    hint: string
}

export interface ServiceRecord {
    id: string
    date: string
    mileage: string
    service: string
    workshop: string
    category: string
    cost: string
    status: ServiceStatus
    detail?: string
    notes?: string
}

export interface UpcomingItem {
    id: string
    title: string
    due: string
    status: ServiceStatus
}

export interface SnapshotField {
    label: string
    value: string
}

export type TimelineTone = 'success' | 'warning' | 'neutral'

export interface TimelineEvent {
    id: string
    title: string
    date: string
    detail: string
    tone: TimelineTone
}

import { Badge } from '../ui/badge.js'
import type { ServiceStatus } from './types.js'

interface StatusBadgeProps {
    status: ServiceStatus
}

const statusVariantMap: Record<ServiceStatus, 'success' | 'info' | 'warning' | 'danger'> = {
    Completed: 'success',
    Upcoming: 'info',
    Planned: 'warning',
    Overdue: 'danger'
}

export function StatusBadge({ status }: StatusBadgeProps) {
    return <Badge variant={statusVariantMap[status]}>{status}</Badge>
}

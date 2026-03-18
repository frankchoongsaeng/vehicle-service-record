import { Badge } from '../ui/badge.js'
import type { ServiceStatus } from './types.js'

interface StatusBadgeProps {
    status: ServiceStatus
}

const statusVariantMap: Record<ServiceStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    Completed: 'default',
    Upcoming: 'secondary',
    Planned: 'outline',
    Overdue: 'destructive'
}

export function StatusBadge({ status }: StatusBadgeProps) {
    return <Badge variant={statusVariantMap[status]}>{status}</Badge>
}

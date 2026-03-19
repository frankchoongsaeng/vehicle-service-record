import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.js'
import { StatusBadge } from './StatusBadge.js'
import type { UpcomingItem } from './types.js'

interface UpcomingMaintenancePanelProps {
    items: UpcomingItem[]
}

export function UpcomingMaintenancePanel({ items }: UpcomingMaintenancePanelProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Upcoming Maintenance</CardTitle>
                <p className='text-sm text-muted-foreground'>
                    Prioritized service items based on due date and condition.
                </p>
            </CardHeader>
            <CardContent className='space-y-3'>
                {items.map(item => (
                    <div key={item.id} className='rounded-lg border bg-muted/20 p-3'>
                        <div className='flex items-start justify-between gap-3'>
                            <div>
                                <p className='text-sm font-semibold text-foreground'>{item.title}</p>
                                <p className='text-xs text-muted-foreground'>{item.due}</p>
                            </div>
                            <StatusBadge status={item.status} />
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { StatusBadge } from './StatusBadge'
import type { UpcomingItem } from './types'

interface UpcomingMaintenancePanelProps {
    items: UpcomingItem[]
}

export function UpcomingMaintenancePanel({ items }: UpcomingMaintenancePanelProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Upcoming Maintenance</CardTitle>
                <p className='text-sm text-slate-500'>Prioritized service items based on due date and condition.</p>
            </CardHeader>
            <CardContent className='space-y-3'>
                {items.map(item => (
                    <div key={item.id} className='rounded-lg border border-slate-200 p-3'>
                        <div className='flex items-start justify-between gap-3'>
                            <div>
                                <p className='text-sm font-semibold text-slate-800'>{item.title}</p>
                                <p className='text-xs text-slate-500'>{item.due}</p>
                            </div>
                            <StatusBadge status={item.status} />
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

import { cn } from '../../lib/utils.js'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.js'
import { StatusBadge } from './StatusBadge.js'
import type { UpcomingItem } from './types.js'

interface UpcomingMaintenancePanelProps {
    items: UpcomingItem[]
}

const itemToneClasses: Record<UpcomingItem['status'], { item: string; title: string; due: string }> = {
    Completed: {
        item: 'border-accent bg-accent/60',
        title: 'text-accent-foreground',
        due: 'text-accent-foreground/70'
    },
    Upcoming: {
        item: 'border-primary/20 bg-primary/5',
        title: 'text-primary',
        due: 'text-primary/70'
    },
    Planned: {
        item: 'border-secondary bg-secondary/50',
        title: 'text-secondary-foreground',
        due: 'text-secondary-foreground/75'
    },
    Overdue: {
        item: 'border-destructive/20 bg-destructive/5',
        title: 'text-destructive',
        due: 'text-destructive/70'
    }
}

export function UpcomingMaintenancePanel({ items }: UpcomingMaintenancePanelProps) {
    return (
        <Card className='border-secondary/30 bg-secondary/10'>
            <CardHeader>
                <CardTitle className='text-chart-4'>Upcoming Maintenance</CardTitle>
                <p className='text-sm text-muted-foreground'>
                    Prioritized service items based on due date and condition.
                </p>
            </CardHeader>
            <CardContent className='flex flex-col gap-3'>
                {items.length === 0 ? (
                    <div className='rounded-lg border border-dashed p-4 text-sm text-muted-foreground'>
                        No maintenance plans yet. Add a plan from the records page to surface upcoming and overdue work
                        here.
                    </div>
                ) : null}

                {items.map(item => {
                    const tone = itemToneClasses[item.status]

                    return (
                        <div key={item.id} className={cn('rounded-lg border p-3', tone.item)}>
                            <div className='flex items-start justify-between gap-3'>
                                <div>
                                    <p className={cn('text-sm font-semibold', tone.title)}>{item.title}</p>
                                    <p className={cn('text-xs', tone.due)}>{item.due}</p>
                                </div>
                                <StatusBadge status={item.status} />
                            </div>
                        </div>
                    )
                })}
            </CardContent>
        </Card>
    )
}

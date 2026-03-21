import { Separator } from '../ui/separator.js'
import { TimelineItem } from './TimelineItem.js'
import type { TimelineEvent } from './types.js'

interface MaintenanceTimelineProps {
    events: TimelineEvent[]
}

export function MaintenanceTimeline({ events }: MaintenanceTimelineProps) {
    return (
        <div className='flex flex-col gap-4'>
            <div className='flex flex-col gap-2'>
                <h2 className='text-lg font-semibold text-foreground'>Maintenance Timeline</h2>
                <p className='text-sm text-muted-foreground'>
                    A running view of completed work, alerts, and upcoming appointments.
                </p>
            </div>
            <Separator />
            <div>
                {events.map((event, index) => (
                    <TimelineItem key={event.id} event={event} isLast={index === events.length - 1} />
                ))}
            </div>
        </div>
    )
}

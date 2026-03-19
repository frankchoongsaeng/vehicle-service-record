import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.js'
import { TimelineItem } from './TimelineItem.js'
import type { TimelineEvent } from './types.js'

interface MaintenanceTimelineProps {
    events: TimelineEvent[]
}

export function MaintenanceTimeline({ events }: MaintenanceTimelineProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Maintenance Timeline</CardTitle>
                <p className='text-sm text-muted-foreground'>
                    A running view of completed work, alerts, and upcoming appointments.
                </p>
            </CardHeader>
            <CardContent>
                {events.map((event, index) => (
                    <TimelineItem key={event.id} event={event} isLast={index === events.length - 1} />
                ))}
            </CardContent>
        </Card>
    )
}

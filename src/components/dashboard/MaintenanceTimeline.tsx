import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { TimelineItem } from './TimelineItem'
import type { TimelineEvent } from './types'

interface MaintenanceTimelineProps {
    events: TimelineEvent[]
}

export function MaintenanceTimeline({ events }: MaintenanceTimelineProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Maintenance Timeline</CardTitle>
            </CardHeader>
            <CardContent>
                {events.map((event, index) => (
                    <TimelineItem key={event.id} event={event} isLast={index === events.length - 1} />
                ))}
            </CardContent>
        </Card>
    )
}

import { cn } from '../../lib/utils.js'
import type { TimelineEvent } from './types.js'

interface TimelineItemProps {
    event: TimelineEvent
    isLast: boolean
}

const toneClasses: Record<TimelineEvent['tone'], { dot: string; title: string }> = {
    success: {
        dot: 'bg-primary ring-primary/20',
        title: 'text-foreground'
    },
    warning: {
        dot: 'bg-accent-foreground ring-accent',
        title: 'text-foreground'
    },
    neutral: {
        dot: 'bg-muted-foreground ring-muted',
        title: 'text-foreground'
    }
}

export function TimelineItem({ event, isLast }: TimelineItemProps) {
    const tone = toneClasses[event.tone]

    return (
        <div className='relative pl-8'>
            {!isLast && <span className='absolute left-2.75 top-5 h-full w-px bg-border' />}
            <span className={cn('absolute left-0 top-1.5 h-6 w-6 rounded-full ring-4', tone.dot)} />
            <div className='pb-6'>
                <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
                    <p className={cn('text-sm font-semibold', tone.title)}>{event.title}</p>
                    <span className='text-xs text-muted-foreground'>{event.date}</span>
                </div>
                <p className='mt-1 text-sm text-muted-foreground'>{event.detail}</p>
            </div>
        </div>
    )
}

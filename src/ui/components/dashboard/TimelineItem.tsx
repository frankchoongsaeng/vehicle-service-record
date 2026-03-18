import { cn } from '../../lib/utils.js'
import type { TimelineEvent } from './types.js'

interface TimelineItemProps {
    event: TimelineEvent
    isLast: boolean
}

const toneClasses: Record<TimelineEvent['tone'], { dot: string; title: string }> = {
    success: {
        dot: 'bg-emerald-500 ring-emerald-100',
        title: 'text-emerald-700'
    },
    warning: {
        dot: 'bg-amber-500 ring-amber-100',
        title: 'text-amber-700'
    },
    neutral: {
        dot: 'bg-slate-400 ring-slate-100',
        title: 'text-slate-800'
    }
}

export function TimelineItem({ event, isLast }: TimelineItemProps) {
    const tone = toneClasses[event.tone]

    return (
        <div className='relative pl-8'>
            {!isLast && <span className='absolute left-[11px] top-5 h-full w-px bg-slate-200' />}
            <span className={cn('absolute left-0 top-1.5 h-6 w-6 rounded-full ring-4', tone.dot)} />
            <div className='pb-6'>
                <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
                    <p className={cn('text-sm font-semibold', tone.title)}>{event.title}</p>
                    <span className='text-xs text-slate-500'>{event.date}</span>
                </div>
                <p className='mt-1 text-sm text-slate-600'>{event.detail}</p>
            </div>
        </div>
    )
}

import type { ReactNode } from 'react'

import { cn } from '../lib/utils.js'
import { Card, CardContent } from './ui/card.js'

type PageHeaderProps = {
    eyebrow?: string
    title: string
    description: string
    actions?: ReactNode
    children?: ReactNode
    media?: ReactNode
    cardClassName?: string
    variant?: 'card' | 'plain'
}

export function PageHeader({
    eyebrow,
    title,
    description,
    actions,
    children,
    media,
    cardClassName,
    variant = 'card'
}: PageHeaderProps) {
    const body = (
        <div className='flex flex-col gap-5'>
            <div className='space-y-2'>
                {eyebrow ? (
                    <p className='text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground'>{eyebrow}</p>
                ) : null}
                <div className='space-y-1'>
                    <h1 className='text-2xl font-semibold tracking-tight text-foreground sm:text-3xl'>{title}</h1>
                    <p className='max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base'>{description}</p>
                </div>
            </div>

            {actions ? <div className='flex flex-wrap gap-2'>{actions}</div> : null}

            {children ? <div>{children}</div> : null}
        </div>
    )

    const content = media ? (
        <div className='grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-center'>
            <div>{media}</div>
            {body}
        </div>
    ) : (
        body
    )

    if (variant === 'plain') {
        return <div className='flex flex-col gap-5'>{content}</div>
    }

    if (media) {
        return (
            <Card className={cn('overflow-hidden', cardClassName)}>
                <div className='grid lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-center'>
                    <div>{media}</div>
                    <CardContent className='flex flex-col gap-5 p-5 sm:p-6'>{body}</CardContent>
                </div>
            </Card>
        )
    }

    return (
        <Card className={cn('overflow-hidden', cardClassName)}>
            <CardContent className='flex flex-col gap-5 p-5 sm:p-6'>{content}</CardContent>
        </Card>
    )
}

import type { ReactNode } from 'react'

import { Card, CardContent } from './ui/card.js'

type PageHeaderProps = {
    eyebrow?: string
    title: string
    description: string
    actions?: ReactNode
    children?: ReactNode
    variant?: 'card' | 'plain'
}

export function PageHeader({ eyebrow, title, description, actions, children, variant = 'card' }: PageHeaderProps) {
    const content = (
        <>
            <div className='flex flex-col justify-between gap-4 lg:flex-row lg:items-start'>
                <div className='space-y-2'>
                    {eyebrow ? (
                        <p className='text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground'>
                            {eyebrow}
                        </p>
                    ) : null}
                    <div className='space-y-1'>
                        <h1 className='text-2xl font-semibold tracking-tight text-foreground sm:text-3xl'>{title}</h1>
                        <p className='max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base'>{description}</p>
                    </div>
                </div>

                {actions ? <div className='flex flex-wrap gap-2'>{actions}</div> : null}
            </div>

            {children ? <div>{children}</div> : null}
        </>
    )

    if (variant === 'plain') {
        return <div className='flex flex-col gap-5'>{content}</div>
    }

    return (
        <Card className='overflow-hidden'>
            <CardContent className='flex flex-col gap-5 p-5 sm:p-6'>{content}</CardContent>
        </Card>
    )
}

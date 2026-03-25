import type { ReactNode } from 'react'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card.js'
import { cn } from '../lib/utils.js'
import Logo from './ui/logo.js'

type AuthScreenProps = {
    eyebrow?: string
    title: string
    description: string
    children: ReactNode
    footer: ReactNode
    topAction?: ReactNode
}

export function AuthScreen({ eyebrow, title, description, children, footer, topAction }: AuthScreenProps) {
    return (
        <main className='relative min-h-screen overflow-hidden bg-linear-to-b from-background via-secondary/20 to-background'>
            <div className='absolute inset-x-0 top-0 h-56 bg-linear-to-b from-secondary/35 to-transparent' />
            <div className='absolute left-1/2 top-16 size-72 -translate-x-1/2 rounded-full bg-primary/8 blur-3xl' />

            <section className='relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10'>
                <div className='flex w-full max-w-md flex-col items-center gap-4'>
                    <div className='flex w-full items-center justify-between gap-3'>
                        <div className='flex items-center gap-3'>
                            <Logo className='size-7' />
                            <p className='text-sm font-semibold tracking-tight text-foreground'>Duralog</p>
                        </div>
                        {topAction}
                    </div>

                    <Card className='w-full border-border/70 bg-card/95 shadow-xl shadow-secondary/15 backdrop-blur'>
                        <CardHeader
                            className={cn('space-y-0 items-center text-center', eyebrow ? 'gap-3' : 'gap-2 pb-5')}
                        >
                            {eyebrow ? (
                                <div className='inline-flex items-center rounded-full border bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-secondary-foreground'>
                                    {eyebrow}
                                </div>
                            ) : null}
                            <div className='flex flex-col gap-1'>
                                <CardTitle className='text-2xl tracking-tight'>{title}</CardTitle>
                                <CardDescription className='leading-6'>{description}</CardDescription>
                            </div>
                        </CardHeader>

                        <CardContent className='flex flex-col gap-5'>{children}</CardContent>

                        <CardFooter className='justify-center border-t pt-4 text-center text-sm text-muted-foreground'>
                            {footer}
                        </CardFooter>
                    </Card>
                </div>
            </section>
        </main>
    )
}

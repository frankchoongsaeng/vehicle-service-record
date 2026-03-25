import type { ReactNode } from 'react'

import { Card, CardContent } from './ui/card.js'
import Logo from './ui/logo.js'

type AuthScreenProps = {
    eyebrow: string
    title: string
    description: string
    children: ReactNode
    footer: ReactNode
}

export function AuthScreen({ eyebrow, title, description, children, footer }: AuthScreenProps) {
    return (
        <main className='min-h-screen bg-background'>
            <section className='flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10'>
                <div className='flex w-full max-w-md flex-col items-center gap-5'>
                    <div className='flex flex-col items-center gap-3 text-center'>
                        <div className='flex size-12 items-center justify-center rounded-2xl border bg-card shadow-sm'>
                            <Logo className='size-8' />
                        </div>
                        <div className='flex flex-col gap-1'>
                            <p className='text-lg font-semibold tracking-tight text-foreground'>Duralog</p>
                            <p className='text-sm text-muted-foreground'>Vehicle service records</p>
                        </div>
                    </div>

                    <Card className='w-full shadow-lg shadow-secondary/20'>
                        <CardContent className='flex flex-col gap-6 p-6 sm:p-7'>
                            <div className='flex flex-col gap-2 text-center'>
                                <p className='text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground'>
                                    {eyebrow}
                                </p>
                                <div className='flex flex-col gap-1'>
                                    <h2 className='text-2xl font-semibold tracking-tight text-foreground'>{title}</h2>
                                    <p className='text-sm leading-6 text-muted-foreground'>{description}</p>
                                </div>
                            </div>

                            {children}

                            <div className='border-t pt-4 text-center text-sm text-muted-foreground'>{footer}</div>
                        </CardContent>
                    </Card>
                </div>
            </section>
        </main>
    )
}

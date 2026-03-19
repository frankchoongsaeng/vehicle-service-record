import type { ReactNode } from 'react'
import { CircleCheckBig, ShieldCheck, Wrench } from 'lucide-react'

import { Card, CardContent } from './ui/card.js'
import Logo from './ui/logo.js'

type AuthScreenProps = {
    eyebrow: string
    title: string
    description: string
    children: ReactNode
    footer: ReactNode
}

const featureItems = [
    {
        icon: Wrench,
        title: 'Track every service',
        description: 'Keep routine maintenance, repair notes, and planned work in one place.'
    },
    {
        icon: ShieldCheck,
        title: 'Stay organized',
        description: 'See what is complete, upcoming, or overdue without hunting through notes.'
    },
    {
        icon: CircleCheckBig,
        title: 'Pick up anywhere',
        description: 'Your garage history stays tied to your account across devices.'
    }
] as const

export function AuthScreen({ eyebrow, title, description, children, footer }: AuthScreenProps) {
    return (
        <main className='min-h-screen bg-background'>
            <div className='grid min-h-screen lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]'>
                <section className='relative hidden overflow-hidden border-r bg-secondary/35 lg:block'>
                    <div className='absolute inset-0 bg-linear-to-br from-secondary via-background to-background' />
                    <div className='relative flex h-full flex-col justify-between px-10 py-10 xl:px-14'>
                        <div className='flex items-center gap-3'>
                            <div className='flex h-12 w-12 items-center justify-center rounded-2xl border bg-card shadow-sm'>
                                <Logo className='h-8 w-8' />
                            </div>
                            <div>
                                <p className='text-lg font-semibold tracking-tight text-foreground'>Duralog</p>
                                <p className='text-sm text-muted-foreground'>
                                    Maintenance tracking that feels deliberate.
                                </p>
                            </div>
                        </div>

                        <div className='max-w-xl space-y-6'>
                            <div className='space-y-3'>
                                <p className='text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground'>
                                    Vehicle service records
                                </p>
                                <h1 className='text-4xl font-semibold leading-tight text-foreground xl:text-5xl'>
                                    A clearer home for your garage history.
                                </h1>
                                <p className='max-w-lg text-base leading-7 text-muted-foreground'>
                                    Review service work, upcoming maintenance, and vehicle details from a single account
                                    instead of scattered receipts and notes.
                                </p>
                            </div>

                            <div className='grid gap-3'>
                                {featureItems.map(item => {
                                    const Icon = item.icon

                                    return (
                                        <Card key={item.title} className='bg-background/90'>
                                            <CardContent className='flex items-start gap-3 p-4'>
                                                <div className='mt-0.5 rounded-xl border bg-card p-2'>
                                                    <Icon className='h-4 w-4' />
                                                </div>
                                                <div>
                                                    <p className='font-medium text-foreground'>{item.title}</p>
                                                    <p className='mt-1 text-sm leading-6 text-muted-foreground'>
                                                        {item.description}
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        </div>

                        <p className='text-sm text-muted-foreground'>
                            Built for multi-vehicle owners who want less friction and better records.
                        </p>
                    </div>
                </section>

                <section className='flex items-center justify-center px-4 py-8 sm:px-6 lg:px-10'>
                    <div className='w-full max-w-md space-y-5'>
                        <div className='space-y-2 lg:hidden'>
                            <div className='flex items-center gap-3'>
                                <div className='flex h-11 w-11 items-center justify-center rounded-2xl border bg-card shadow-sm'>
                                    <Logo className='h-7 w-7' />
                                </div>
                                <div>
                                    <p className='text-lg font-semibold tracking-tight text-foreground'>Duralog</p>
                                    <p className='text-sm text-muted-foreground'>Vehicle service records</p>
                                </div>
                            </div>
                        </div>

                        <Card className='shadow-lg shadow-secondary/20'>
                            <CardContent className='space-y-6 p-6 sm:p-7'>
                                <div className='space-y-2'>
                                    <p className='text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground'>
                                        {eyebrow}
                                    </p>
                                    <div className='space-y-1'>
                                        <h2 className='text-2xl font-semibold tracking-tight text-foreground'>
                                            {title}
                                        </h2>
                                        <p className='text-sm leading-6 text-muted-foreground'>{description}</p>
                                    </div>
                                </div>

                                {children}

                                <div className='border-t pt-4 text-sm text-muted-foreground'>{footer}</div>
                            </CardContent>
                        </Card>
                    </div>
                </section>
            </div>
        </main>
    )
}

import { Link } from '@remix-run/react'
import {
    Bell,
    Building2,
    CalendarCheck,
    Car,
    ChevronRight,
    ClipboardList,
    Gauge,
    ShieldCheck,
    Wrench
} from 'lucide-react'

import { Button } from './ui/button.js'
import { Card, CardContent } from './ui/card.js'
import Logo from './ui/logo.js'
import Mascot from './ui/mascot.js'

const features = [
    {
        icon: Wrench,
        title: 'Service record tracking',
        description: 'Log oil changes, brake service, tire rotations, and every job in between.'
    },
    {
        icon: Car,
        title: 'Multi-vehicle support',
        description: 'Manage cars, trucks, motorcycles, and more from a single dashboard.'
    },
    {
        icon: CalendarCheck,
        title: 'Maintenance planning',
        description: 'Set up recurring maintenance plans so you never miss a scheduled service.'
    },
    {
        icon: Bell,
        title: 'Service reminders',
        description: 'Get notified when maintenance is due based on date or mileage intervals.'
    },
    {
        icon: Building2,
        title: 'Workshop directory',
        description: 'Save your preferred workshops and link them directly to service records.'
    },
    {
        icon: ShieldCheck,
        title: 'Secure and private',
        description: 'Your data is tied to your account and accessible only by you.'
    }
] as const

const steps = [
    {
        number: '1',
        icon: ClipboardList,
        title: 'Create your account',
        description:
            'Sign up and add your first vehicle in minutes. Enter basic details like year, make, model, and mileage.'
    },
    {
        number: '2',
        icon: Wrench,
        title: 'Log your services',
        description:
            'Record maintenance work as it happens or backfill past records. Attach workshops, costs, and notes.'
    },
    {
        number: '3',
        icon: Gauge,
        title: 'Stay ahead of maintenance',
        description: 'Set maintenance plans, track what is complete or overdue, and always know what is due next.'
    }
] as const

function Navbar() {
    return (
        <header className='sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm'>
            <nav className='mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8'>
                <Link to='/' className='flex items-center gap-2.5'>
                    <div className='flex h-9 w-9 items-center justify-center rounded-xl border bg-card shadow-sm'>
                        <Logo className='h-6 w-6' />
                    </div>
                    <span className='text-lg font-semibold tracking-tight text-foreground'>Duralog</span>
                </Link>
                <div className='flex items-center gap-3'>
                    <Button variant='ghost' size='sm' asChild>
                        <Link to='/login'>Sign in</Link>
                    </Button>
                    <Button size='sm' asChild>
                        <Link to='/signup'>Get started</Link>
                    </Button>
                </div>
            </nav>
        </header>
    )
}

function HeroSection() {
    return (
        <section className='relative overflow-hidden border-b bg-secondary/20'>
            <div className='absolute inset-0 bg-linear-to-br from-secondary/30 via-background to-background' />
            <div className='relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1fr_auto] lg:gap-12 lg:px-8 lg:py-32'>
                <div className='max-w-2xl space-y-6'>
                    <div className='space-y-4'>
                        <p className='text-sm font-semibold uppercase tracking-[0.16em] text-primary'>
                            Vehicle service records
                        </p>
                        <h1 className='text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl xl:text-6xl'>
                            A clearer home for your garage history.
                        </h1>
                        <p className='max-w-xl text-lg leading-8 text-muted-foreground'>
                            Track maintenance, plan service, and keep your vehicles running smoothly — all from one
                            account instead of scattered receipts and notes.
                        </p>
                    </div>
                    <div className='flex flex-wrap items-center gap-3'>
                        <Button size='lg' asChild>
                            <Link to='/signup'>
                                Get started
                                <ChevronRight />
                            </Link>
                        </Button>
                        <Button variant='outline' size='lg' asChild>
                            <Link to='/login'>Sign in</Link>
                        </Button>
                    </div>
                </div>
                <div className='hidden w-56 lg:block xl:w-64'>
                    <Mascot className='h-auto w-full' />
                </div>
            </div>
        </section>
    )
}

function FeaturesSection() {
    return (
        <section className='border-b py-16 md:py-24'>
            <div className='mx-auto max-w-6xl px-4 sm:px-6 lg:px-8'>
                <div className='mx-auto max-w-2xl text-center'>
                    <p className='text-sm font-semibold uppercase tracking-[0.16em] text-primary'>Core capabilities</p>
                    <h2 className='mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl'>
                        Everything you need to manage your garage
                    </h2>
                    <p className='mt-3 text-base leading-7 text-muted-foreground'>
                        Duralog brings vehicle maintenance tracking, service planning, and workshop management into one
                        clean interface.
                    </p>
                </div>
                <div className='mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                    {features.map(feature => {
                        const Icon = feature.icon
                        return (
                            <Card key={feature.title} className='bg-card'>
                                <CardContent className='flex items-start gap-4 p-5'>
                                    <div className='mt-0.5 rounded-xl border bg-background p-2.5'>
                                        <Icon className='h-5 w-5 text-primary' />
                                    </div>
                                    <div className='space-y-1.5'>
                                        <p className='font-medium text-foreground'>{feature.title}</p>
                                        <p className='text-sm leading-6 text-muted-foreground'>{feature.description}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}

function HowItWorksSection() {
    return (
        <section className='border-b bg-secondary/10 py-16 md:py-24'>
            <div className='mx-auto max-w-6xl px-4 sm:px-6 lg:px-8'>
                <div className='mx-auto max-w-2xl text-center'>
                    <p className='text-sm font-semibold uppercase tracking-[0.16em] text-primary'>How it works</p>
                    <h2 className='mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl'>
                        Up and running in minutes
                    </h2>
                </div>
                <div className='mt-12 grid gap-6 md:grid-cols-3'>
                    {steps.map(step => {
                        const Icon = step.icon
                        return (
                            <div key={step.number} className='relative flex flex-col items-center text-center'>
                                <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm'>
                                    <Icon className='h-6 w-6' />
                                </div>
                                <div className='mt-5 space-y-2'>
                                    <p className='text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground'>
                                        Step {step.number}
                                    </p>
                                    <h3 className='text-lg font-semibold text-foreground'>{step.title}</h3>
                                    <p className='mx-auto max-w-xs text-sm leading-6 text-muted-foreground'>
                                        {step.description}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}

function BuiltForOwnersSection() {
    return (
        <section className='border-b py-16 md:py-24'>
            <div className='mx-auto max-w-6xl px-4 sm:px-6 lg:px-8'>
                <div className='mx-auto grid max-w-4xl items-center gap-10 lg:grid-cols-2 lg:gap-16'>
                    <div className='space-y-5'>
                        <h2 className='text-3xl font-semibold tracking-tight text-foreground sm:text-4xl'>
                            Built for owners who care about their vehicles
                        </h2>
                        <div className='space-y-4 text-base leading-7 text-muted-foreground'>
                            <p>
                                Whether you own one daily driver or a garage full of project cars, keeping track of
                                every oil change, belt replacement, and brake job adds up fast: scattered receipts,
                                notes in different apps, or nothing written down at all.
                            </p>
                            <p>
                                Duralog gives you a single, organized place to store service history, plan upcoming
                                maintenance, and see at a glance what each vehicle needs next. Your records stay tied to
                                your account and accessible from any device.
                            </p>
                        </div>
                    </div>
                    <div className='space-y-3'>
                        {[
                            {
                                title: 'No scattered receipts',
                                description: 'Every service record lives in one place, organized by vehicle and date.'
                            },
                            {
                                title: 'Nothing falls through the cracks',
                                description: 'Maintenance plans and reminders help you stay ahead of scheduled service.'
                            },
                            {
                                title: 'Works across devices',
                                description: 'Access your full garage history from your phone, tablet, or computer.'
                            }
                        ].map(item => (
                            <Card key={item.title} className='bg-card'>
                                <CardContent className='p-4'>
                                    <p className='font-medium text-foreground'>{item.title}</p>
                                    <p className='mt-1 text-sm leading-6 text-muted-foreground'>{item.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}

function CtaSection() {
    return (
        <section className='py-16 md:py-24'>
            <div className='mx-auto max-w-6xl px-4 sm:px-6 lg:px-8'>
                <div className='mx-auto max-w-2xl space-y-6 text-center'>
                    <h2 className='text-3xl font-semibold tracking-tight text-foreground sm:text-4xl'>
                        Start tracking your vehicle maintenance
                    </h2>
                    <p className='text-base leading-7 text-muted-foreground'>
                        Create a free account, add your vehicles, and never lose track of a service record again.
                    </p>
                    <div className='flex justify-center gap-3'>
                        <Button size='lg' asChild>
                            <Link to='/signup'>
                                Get started
                                <ChevronRight />
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    )
}

function Footer() {
    return (
        <footer className='border-t bg-secondary/10 py-8'>
            <div className='mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 sm:flex-row sm:justify-between sm:px-6 lg:px-8'>
                <div className='flex items-center gap-2.5'>
                    <div className='flex h-8 w-8 items-center justify-center rounded-xl border bg-card shadow-sm'>
                        <Logo className='h-5 w-5' />
                    </div>
                    <span className='text-sm font-semibold tracking-tight text-foreground'>Duralog</span>
                </div>
                <p className='text-sm text-muted-foreground'>Maintenance tracking that feels deliberate.</p>
            </div>
        </footer>
    )
}

export default function LandingPage() {
    return (
        <div className='min-h-screen bg-background'>
            <Navbar />
            <main>
                <HeroSection />
                <FeaturesSection />
                <HowItWorksSection />
                <BuiltForOwnersSection />
                <CtaSection />
            </main>
            <Footer />
        </div>
    )
}

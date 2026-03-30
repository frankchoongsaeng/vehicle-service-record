import { useCallback, useEffect, useRef, useState } from 'react'
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
import { PublicFooter } from './PublicFooter.js'
import { PublicNavbar } from './PublicNavbar.js'

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

const heroImages = [
    { src: '/images/add-car.webp', alt: 'Car' },
    { src: '/images/add-truck.webp', alt: 'Truck' },
    { src: '/images/add-motorcycle.webp', alt: 'Motorcycle' },
    { src: '/images/add-suv.webp', alt: 'SUV' },
    { src: '/images/add-van.webp', alt: 'Van' },
    { src: '/images/add-boat.webp', alt: 'Boat' },
    { src: '/images/add-rv.webp', alt: 'RV' },
    { src: '/images/add-atv.webp', alt: 'ATV' }
] as const

function VehicleShowcase() {
    const [current, setCurrent] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrent(prev => (prev + 1) % heroImages.length)
        }, 3000)
        return () => clearInterval(timer)
    }, [])

    return (
        <div className='relative h-80 w-80 xl:h-96 xl:w-96'>
            {heroImages.map((image, i) => (
                <img
                    key={image.src}
                    src={image.src}
                    alt={image.alt}
                    className={`absolute inset-0 h-full w-full rounded-2xl object-contain transition-all duration-700 ease-in-out ${
                        i === current ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
                    }`}
                />
            ))}
            {/* Dots indicator */}
            <div className='absolute -bottom-6 left-1/2 flex -translate-x-1/2 gap-1.5'>
                {heroImages.map((image, i) => (
                    <button
                        key={image.src}
                        type='button'
                        aria-label={`Show ${image.alt}`}
                        onClick={() => setCurrent(i)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                            i === current
                                ? 'w-5 bg-primary'
                                : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                        }`}
                    />
                ))}
            </div>
        </div>
    )
}

function useScrollReveal() {
    const ref = useRef<HTMLDivElement>(null)

    const observe = useCallback(() => {
        const el = ref.current
        if (!el) return

        const observer = new IntersectionObserver(
            entries => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const targets = entry.target.querySelectorAll('.landing-reveal, .landing-reveal-scale')
                        for (const target of targets) {
                            target.classList.add('is-visible')
                        }
                        observer.unobserve(entry.target)
                    }
                }
            },
            { threshold: 0.15 }
        )

        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        return observe()
    }, [observe])

    return ref
}

const Navbar = PublicNavbar

function HeroSection() {
    return (
        <section className='relative overflow-hidden border-b bg-secondary/20'>
            <div className='absolute inset-0 bg-linear-to-br from-secondary/30 via-background to-background' />

            {/* Decorative glow orbs */}
            <div className='landing-glow-orb absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-primary/15 blur-3xl' />
            <div
                className='landing-glow-orb absolute -bottom-40 right-1/4 h-80 w-80 rounded-full bg-accent/20 blur-3xl'
                style={{ animationDelay: '4s' }}
            />

            <div className='relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1fr_auto] lg:gap-12 lg:px-8 lg:py-32'>
                <div className='max-w-2xl space-y-6'>
                    <div className='space-y-4'>
                        <p className='landing-hero-enter text-sm font-semibold uppercase tracking-[0.16em] text-primary'>
                            Vehicle service records
                        </p>
                        <h1 className='landing-hero-enter-delay-1 text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl xl:text-6xl'>
                            A clearer home for your garage history.
                        </h1>
                        <p className='landing-hero-enter-delay-2 max-w-xl text-lg leading-8 text-muted-foreground'>
                            Track maintenance, plan service, and keep your vehicles running smoothly — all from one
                            account instead of scattered receipts and notes.
                        </p>
                    </div>
                    <div className='landing-hero-enter-delay-2 flex flex-wrap items-center gap-3'>
                        <Button size='lg' asChild>
                            <Link to='/signup'>
                                Get started
                                <ChevronRight />
                            </Link>
                        </Button>
                        <Button variant='outline' size='lg' asChild>
                            <Link to='/pricing'>See pricing</Link>
                        </Button>
                        <Button variant='outline' size='lg' asChild>
                            <Link to='/login'>Sign in</Link>
                        </Button>
                    </div>
                </div>
                <div className='landing-hero-enter-delay-3 hidden lg:block'>
                    <VehicleShowcase />
                </div>
            </div>
        </section>
    )
}

function FeaturesSection() {
    const ref = useScrollReveal()

    return (
        <section className='border-b py-16 md:py-24' ref={ref}>
            <div className='mx-auto max-w-6xl px-4 sm:px-6 lg:px-8'>
                <div className='landing-reveal mx-auto max-w-2xl text-center'>
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
                    {features.map((feature, i) => {
                        const Icon = feature.icon
                        return (
                            <Card
                                key={feature.title}
                                className={`landing-reveal landing-delay-${
                                    i + 1
                                } bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
                            >
                                <CardContent className='flex items-start gap-4 p-5'>
                                    <div className='mt-0.5 rounded-xl border bg-background p-2.5 transition-colors duration-300 group-hover:bg-primary/10'>
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
    const ref = useScrollReveal()

    return (
        <section className='border-b bg-secondary/10 py-16 md:py-24' ref={ref}>
            <div className='mx-auto max-w-6xl px-4 sm:px-6 lg:px-8'>
                <div className='landing-reveal mx-auto max-w-2xl text-center'>
                    <p className='text-sm font-semibold uppercase tracking-[0.16em] text-primary'>How it works</p>
                    <h2 className='mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl'>
                        Up and running in minutes
                    </h2>
                </div>
                <div className='relative mt-12 grid gap-10 md:grid-cols-3 md:gap-6'>
                    {/* Connector line between steps (desktop) */}
                    <div className='pointer-events-none absolute top-6 right-1/4 left-1/4 hidden h-px bg-border md:block' />

                    {steps.map((step, i) => {
                        const Icon = step.icon
                        return (
                            <div
                                key={step.number}
                                className={`landing-reveal landing-delay-${
                                    i + 1
                                } relative flex flex-col items-center text-center`}
                            >
                                <div className='relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm'>
                                    <Icon className='h-6 w-6' />
                                    {/* Step number badge */}
                                    <span className='absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background'>
                                        {step.number}
                                    </span>
                                </div>
                                <div className='mt-5 space-y-2'>
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
    const ref = useScrollReveal()

    return (
        <section className='border-b py-16 md:py-24' ref={ref}>
            <div className='mx-auto max-w-6xl px-4 sm:px-6 lg:px-8'>
                <div className='mx-auto grid max-w-4xl items-center gap-10 lg:grid-cols-2 lg:gap-16'>
                    <div className='landing-reveal space-y-5'>
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
                        ].map((item, i) => (
                            <Card
                                key={item.title}
                                className={`landing-reveal landing-delay-${
                                    i + 1
                                } bg-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md`}
                            >
                                <CardContent className='flex items-start gap-4 p-4'>
                                    <div className='mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary'>
                                        {i + 1}
                                    </div>
                                    <div>
                                        <p className='font-medium text-foreground'>{item.title}</p>
                                        <p className='mt-1 text-sm leading-6 text-muted-foreground'>
                                            {item.description}
                                        </p>
                                    </div>
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
    const ref = useScrollReveal()

    return (
        <section className='relative overflow-hidden py-16 md:py-24' ref={ref}>
            {/* Background decoration */}
            <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-accent/5' />
            <div className='landing-glow-orb absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl' />

            <div className='relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8'>
                <div className='landing-reveal-scale mx-auto max-w-2xl space-y-6 text-center'>
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
            <PublicFooter />
        </div>
    )
}

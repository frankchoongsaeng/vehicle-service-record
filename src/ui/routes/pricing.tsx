import type { MetaFunction } from '@remix-run/node'
import { Link, useNavigate, useSearchParams } from '@remix-run/react'
import { Check, CircleDollarSign, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import * as api from '../api/client.js'
import { buildOnboardingUrl, buildSignupUrlForPlan, hasCompletedOnboarding } from '../auth/onboarding.js'
import { getSafeRedirectTarget } from '../auth/redirect.js'
import { useAuth } from '../auth/useAuth.js'
import { AuthenticatedShell } from '../components/AuthenticatedShell.js'
import { PageHeader } from '../components/PageHeader.js'
import { PublicFooter } from '../components/PublicFooter.js'
import { Badge } from '../components/ui/badge.js'
import { Button } from '../components/ui/button.js'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card.js'
import Logo from '../components/ui/logo.js'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs.js'
import type { BillingInterval, BillingSubscriptionState, PlanCode } from '../types/index.js'
import { BILLING_PLANS } from '../../types/billing.js'

export const meta: MetaFunction = () => {
    return [
        { title: 'Pricing | Duralog' },
        {
            name: 'description',
            content: 'Compare Free, Plus, and Garage plans for Duralog subscription billing.'
        }
    ]
}

type PaidPlanCode = Exclude<PlanCode, 'free'>

function resolveBillingInterval(value: string | null): BillingInterval {
    return value === 'year' ? 'year' : 'month'
}

function resolveCheckoutPlan(value: string | null): PaidPlanCode | null {
    return value === 'plus' || value === 'garage' ? value : null
}

function formatPlanPrice(planCode: PlanCode, billingInterval: BillingInterval): string {
    const plan = BILLING_PLANS[planCode]

    if (planCode === 'free') {
        return '$0'
    }

    const amount = billingInterval === 'year' ? plan.annualPrice : plan.monthlyPrice

    if (amount == null) {
        return 'Included'
    }

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: amount % 1 === 0 ? 0 : 2
    }).format(amount)
}

function formatPlanPeriod(planCode: PlanCode, billingInterval: BillingInterval): string {
    if (planCode === 'free') {
        return 'forever'
    }

    return billingInterval === 'year' ? 'per year' : 'per month'
}

function PricingContent() {
    const auth = useAuth()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const billingInterval = resolveBillingInterval(searchParams.get('billing'))
    const checkoutPlan = resolveCheckoutPlan(searchParams.get('checkoutPlan'))
    const postAuthSetup = searchParams.get('postAuthSetup') === '1'
    const returnTo = getSafeRedirectTarget(searchParams.get('returnTo'))
    const [billingState, setBillingState] = useState<BillingSubscriptionState | null>(null)
    const [loadingBilling, setLoadingBilling] = useState(false)
    const [billingError, setBillingError] = useState('')
    const [busyPlanCode, setBusyPlanCode] = useState<PaidPlanCode | null>(null)
    const [openingPortal, setOpeningPortal] = useState(false)
    const autoCheckoutRef = useRef<string | null>(null)

    useEffect(() => {
        if (auth.status !== 'authenticated') {
            setBillingState(null)
            setBillingError('')
            return
        }

        let active = true
        setLoadingBilling(true)
        setBillingError('')

        api.getBillingSubscription()
            .then(state => {
                if (!active) {
                    return
                }

                setBillingState(state)
            })
            .catch(error => {
                if (!active) {
                    return
                }

                setBillingError(api.getUserFacingErrorMessage(error, 'Unable to load billing details right now.'))
            })
            .finally(() => {
                if (active) {
                    setLoadingBilling(false)
                }
            })

        return () => {
            active = false
        }
    }, [auth.status])

    const syncBillingInterval = (nextValue: string) => {
        const nextInterval = resolveBillingInterval(nextValue)
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('billing', nextInterval)
        setSearchParams(nextParams, { replace: true })
    }

    const handleUpgrade = async (planCode: PaidPlanCode) => {
        if (auth.status !== 'authenticated') {
            navigate(buildSignupUrlForPlan(planCode, billingInterval))
            return
        }

        setBusyPlanCode(planCode)
        setBillingError('')

        try {
            const returnPath =
                auth.user && !hasCompletedOnboarding(auth.user) ? buildOnboardingUrl('/garage') : undefined
            const result = await api.createBillingCheckoutSession(planCode, billingInterval, returnPath)
            window.location.assign(result.url)
        } catch (error) {
            setBillingError(api.getUserFacingErrorMessage(error, 'Unable to start checkout right now.'))
        } finally {
            setBusyPlanCode(null)
        }
    }

    useEffect(() => {
        if (!postAuthSetup || !checkoutPlan || auth.status !== 'authenticated' || !auth.user) {
            return
        }

        const autoCheckoutKey = `${checkoutPlan}:${billingInterval}:${returnTo}:${
            auth.user.onboardingCompletedAt ?? 'pending'
        }`

        if (autoCheckoutRef.current === autoCheckoutKey) {
            return
        }

        autoCheckoutRef.current = autoCheckoutKey
        setBusyPlanCode(checkoutPlan)
        setBillingError('')

        const returnPath = hasCompletedOnboarding(auth.user) ? returnTo : buildOnboardingUrl(returnTo)

        api.createBillingCheckoutSession(checkoutPlan, billingInterval, returnPath)
            .then(result => {
                window.location.assign(result.url)
            })
            .catch(error => {
                setBillingError(api.getUserFacingErrorMessage(error, 'Unable to start checkout right now.'))
                setBusyPlanCode(null)
            })
    }, [auth.status, auth.user, billingInterval, checkoutPlan, postAuthSetup, returnTo])

    const handleManageBilling = async () => {
        setOpeningPortal(true)
        setBillingError('')

        try {
            const result = await api.createBillingCustomerPortalSession()
            window.location.assign(result.url)
        } catch (error) {
            setBillingError(api.getUserFacingErrorMessage(error, 'Unable to open the billing portal right now.'))
        } finally {
            setOpeningPortal(false)
        }
    }

    const currentPlan = billingState?.planCode ?? 'free'
    const layout = (
        <div className='mx-auto flex w-full max-w-6xl flex-col gap-8'>
            <PageHeader
                eyebrow='Pricing'
                title='Simple plans for the garage you actually have'
                description='Start free for one vehicle, then upgrade when you want more vehicles, reminders, maintenance plans, VIN lookup, and generated vehicle images.'
                variant='plain'
                actions={
                    <div className='flex flex-wrap gap-2'>
                        <Badge variant='secondary'>Plus is the default plan</Badge>
                        <Badge variant='outline'>Stripe Billing</Badge>
                    </div>
                }
            />

            <Card className='shadow-none'>
                <CardHeader>
                    <CardTitle className='flex items-center gap-2 text-base'>
                        <CircleDollarSign data-icon='inline-start' />
                        Choose your billing cadence
                    </CardTitle>
                    <CardDescription>
                        Monthly keeps the commitment light. Annual saves on the paid tiers and keeps billing simple.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={billingInterval} onValueChange={syncBillingInterval} className='w-full'>
                        <TabsList className='grid w-full max-w-sm grid-cols-2'>
                            <TabsTrigger value='month'>Monthly</TabsTrigger>
                            <TabsTrigger value='year'>Annual</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </CardContent>
            </Card>

            {billingError ? (
                <Card className='border-destructive/30 bg-destructive/10 shadow-none'>
                    <CardContent className='p-4 text-sm text-destructive'>{billingError}</CardContent>
                </Card>
            ) : null}

            <div className='grid gap-4 lg:grid-cols-3'>
                {(['free', 'plus', 'garage'] as const).map(planCode => {
                    const plan = BILLING_PLANS[planCode]
                    const isCurrent = currentPlan === planCode
                    const paidPlanCode = planCode === 'free' ? null : planCode
                    const usage = billingState?.entitlements.usage
                    const isBusy = paidPlanCode != null && busyPlanCode === paidPlanCode

                    return (
                        <Card key={planCode} className={plan.highlighted ? 'border-primary shadow-sm' : 'shadow-none'}>
                            <CardHeader>
                                <div className='flex flex-wrap items-center justify-between gap-2'>
                                    <CardTitle>{plan.name}</CardTitle>
                                    <div className='flex flex-wrap gap-2'>
                                        {plan.highlighted ? <Badge>Recommended</Badge> : null}
                                        {isCurrent ? <Badge variant='secondary'>Current</Badge> : null}
                                    </div>
                                </div>
                                <CardDescription>{plan.description}</CardDescription>
                                <div className='pt-2'>
                                    <p className='text-3xl font-semibold tracking-tight text-foreground'>
                                        {formatPlanPrice(planCode, billingInterval)}
                                    </p>
                                    <p className='text-sm text-muted-foreground'>
                                        {formatPlanPeriod(planCode, billingInterval)}
                                    </p>
                                </div>
                            </CardHeader>
                            <CardContent className='flex flex-col gap-4'>
                                <div className='space-y-2 text-sm text-muted-foreground'>
                                    <p>
                                        Vehicles:{' '}
                                        <span className='font-medium text-foreground'>
                                            {plan.vehicleLimit == null ? 'Unlimited' : plan.vehicleLimit}
                                        </span>
                                    </p>
                                    <p>
                                        Service records:{' '}
                                        <span className='font-medium text-foreground'>
                                            {plan.serviceRecordLimit == null ? 'Unlimited' : plan.serviceRecordLimit}
                                        </span>
                                    </p>
                                    <p>
                                        Workshops:{' '}
                                        <span className='font-medium text-foreground'>
                                            {plan.workshopLimit == null ? 'Unlimited' : plan.workshopLimit}
                                        </span>
                                    </p>
                                </div>

                                <div className='space-y-2'>
                                    {[
                                        'maintenancePlans',
                                        'reminderEmails',
                                        'vehicleReminderOverrides',
                                        'vinLookup',
                                        'vehicleImages'
                                    ].map(feature => {
                                        const enabled = plan.features.includes(feature as never)
                                        const label =
                                            feature === 'maintenancePlans'
                                                ? 'Maintenance plans'
                                                : feature === 'reminderEmails'
                                                ? 'Reminder emails and digests'
                                                : feature === 'vehicleReminderOverrides'
                                                ? 'Per-vehicle reminder overrides'
                                                : feature === 'vinLookup'
                                                ? 'VIN lookup'
                                                : 'Generated vehicle images'

                                        return (
                                            <div key={feature} className='flex items-start gap-2 text-sm'>
                                                <Check
                                                    className={enabled ? 'text-primary' : 'text-muted-foreground/40'}
                                                />
                                                <span className={enabled ? 'text-foreground' : 'text-muted-foreground'}>
                                                    {label}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>

                                {isCurrent && usage ? (
                                    <div className='rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground'>
                                        {planCode === 'free'
                                            ? `${usage.vehicles}/1 vehicles and ${usage.serviceRecords}/25 service records used.`
                                            : `${usage.vehicles} vehicles, ${usage.serviceRecords} service records, and ${usage.workshops} workshops currently stored.`}
                                    </div>
                                ) : null}
                            </CardContent>
                            <CardFooter className='flex-col items-stretch gap-2'>
                                {planCode === 'free' ? (
                                    auth.status === 'authenticated' ? (
                                        <Button variant='outline' disabled>
                                            {isCurrent ? 'Current plan' : 'Included'}
                                        </Button>
                                    ) : (
                                        <Button variant='outline' asChild>
                                            <Link to='/signup'>Start free</Link>
                                        </Button>
                                    )
                                ) : (
                                    <Button onClick={() => handleUpgrade(planCode)} disabled={isBusy || isCurrent}>
                                        {isBusy
                                            ? 'Redirecting…'
                                            : isCurrent
                                            ? 'Current plan'
                                            : auth.status === 'authenticated'
                                            ? `Choose ${plan.name}`
                                            : `Create account for ${plan.name}`}
                                    </Button>
                                )}

                                {isCurrent && billingState?.canManageBilling ? (
                                    <Button variant='outline' onClick={handleManageBilling} disabled={openingPortal}>
                                        {openingPortal ? 'Opening portal…' : 'Manage billing'}
                                    </Button>
                                ) : null}
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>

            <Card className='shadow-none'>
                <CardHeader>
                    <CardTitle className='flex items-center gap-2 text-base'>
                        <ShieldCheck data-icon='inline-start' />
                        Billing behavior
                    </CardTitle>
                </CardHeader>
                <CardContent className='grid gap-3 text-sm text-muted-foreground md:grid-cols-2'>
                    <p>Downgrades never delete your vehicles, records, workshops, or maintenance plans.</p>
                    <p>Server-side limits stay authoritative even if a user bypasses the UI.</p>
                    <p>
                        Stripe Checkout handles subscription purchase, and the customer portal handles self-serve
                        changes.
                    </p>
                    <p>Webhook sync updates plan status in Duralog so limits refresh after billing changes.</p>
                </CardContent>
            </Card>

            {loadingBilling ? <p className='text-sm text-muted-foreground'>Loading billing details…</p> : null}
            {postAuthSetup && checkoutPlan && auth.status === 'authenticated' ? (
                <p className='text-sm text-muted-foreground'>Preparing checkout for your selected plan…</p>
            ) : null}
        </div>
    )

    if (auth.status === 'authenticated' && auth.user) {
        return (
            <AuthenticatedShell currentUser={auth.user} onLogout={auth.logout}>
                {layout}
            </AuthenticatedShell>
        )
    }

    return (
        <div className='min-h-screen bg-background'>
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
                            <Link to='/pricing'>Pricing</Link>
                        </Button>
                        <Button variant='ghost' size='sm' asChild>
                            <Link to='/login'>Sign in</Link>
                        </Button>
                        <Button size='sm' asChild>
                            <Link to='/signup'>Get started</Link>
                        </Button>
                    </div>
                </nav>
            </header>
            <main className='mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8'>{layout}</main>
            <PublicFooter />
        </div>
    )
}

export default function PricingRoute() {
    return <PricingContent />
}

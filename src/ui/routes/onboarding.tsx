import type { MetaFunction } from '@remix-run/node'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from '@remix-run/react'
import { ArrowLeft, ArrowRight, BellRing, CheckCircle2, ClipboardList, UserRound } from 'lucide-react'

import * as api from '../api/client.js'
import { ApiError } from '../api/client.js'
import {
    buildOnboardingUrl,
    getSafePostOnboardingRedirectTarget,
    hasCompletedOnboarding,
    resolveOnboardingStep
} from '../auth/onboarding.js'
import { useAuth } from '../auth/useAuth.js'
import BrandedLoadingScreen from '../components/BrandedLoadingScreen.js'
import { Badge } from '../components/ui/badge.js'
import { Button } from '../components/ui/button.js'
import { Input } from '../components/ui/input.js'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select.js'
import { EMPTY_COUNTRY_VALUE, getCountryOptions } from '../lib/countries.js'
import { cn } from '../lib/utils.js'
import {
    DEFAULT_HISTORY_SORT_ORDER,
    PREFERRED_CURRENCIES,
    type HistorySortOrder,
    type PreferredCurrencyCode
} from '../../types/userSettings.js'
import { getCurrencyLabel } from '../lib/currency.js'

export const meta: MetaFunction = () => {
    return [
        { title: 'Welcome to Duralog' },
        { name: 'description', content: 'Finish setting up your profile and default maintenance preferences.' }
    ]
}

function OnboardingStepBadge({ active, complete, label }: { active: boolean; complete: boolean; label: string }) {
    return (
        <div
            className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors duration-200',
                complete && !active && 'border-primary/30 bg-primary/10 text-primary',
                active && 'border-primary bg-primary text-primary-foreground',
                !active && !complete && 'border-border text-muted-foreground'
            )}
        >
            <span
                className={cn(
                    'transition-colors duration-200',
                    active && 'text-primary-foreground',
                    complete && !active && 'text-primary',
                    !active && !complete && 'text-muted-foreground'
                )}
            >
                {complete ? (
                    <CheckCircle2 className='h-4 w-4' />
                ) : label === 'Profile' ? (
                    <UserRound className='h-4 w-4' />
                ) : (
                    <BellRing className='h-4 w-4' />
                )}
            </span>
            <span
                className={cn(
                    'font-medium transition-colors duration-200',
                    active && 'text-primary-foreground',
                    complete && !active && 'text-primary',
                    !active && !complete && 'text-muted-foreground'
                )}
            >
                {label}
            </span>
        </div>
    )
}

type NotificationPreference = 'enabled' | 'disabled'

export default function OnboardingRoute() {
    const auth = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const step = resolveOnboardingStep(searchParams.get('step'))
    const redirectTo = getSafePostOnboardingRedirectTarget(searchParams.get('redirectTo'))

    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [country, setCountry] = useState('')
    const [historySortOrder, setHistorySortOrder] = useState<HistorySortOrder>(DEFAULT_HISTORY_SORT_ORDER)
    const [preferredCurrency, setPreferredCurrency] = useState<PreferredCurrencyCode>('USD')
    const [reminderEmailEnabled, setReminderEmailEnabled] = useState(true)
    const [reminderDigestEnabled, setReminderDigestEnabled] = useState(true)
    const [reminderDaysThreshold, setReminderDaysThreshold] = useState('14')
    const [reminderMileageThreshold, setReminderMileageThreshold] = useState('750')
    const [loadingPreferences, setLoadingPreferences] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [renderedStep, setRenderedStep] = useState(step)
    const [isStepVisible, setIsStepVisible] = useState(true)
    const notificationPreference: NotificationPreference =
        reminderEmailEnabled && reminderDigestEnabled ? 'enabled' : 'disabled'
    const availableCountries = getCountryOptions(country)

    useEffect(() => {
        if (auth.status !== 'unauthenticated') {
            return
        }

        const nextTarget = `${location.pathname}${location.search}${location.hash}` || buildOnboardingUrl(redirectTo)
        navigate(`/login?redirectTo=${encodeURIComponent(nextTarget)}`, { replace: true })
    }, [auth.status, location.hash, location.pathname, location.search, navigate, redirectTo])

    useEffect(() => {
        if (!auth.user) {
            return
        }

        if (hasCompletedOnboarding(auth.user)) {
            navigate(redirectTo, { replace: true })
            return
        }

        setFirstName(auth.user.firstName ?? '')
        setLastName(auth.user.lastName ?? '')
        setCountry(auth.user.country ?? '')
        setHistorySortOrder(auth.user.historySortOrder)
        setPreferredCurrency(auth.user.preferredCurrency)
    }, [auth.user, navigate, redirectTo])

    useEffect(() => {
        if (step === renderedStep) {
            setIsStepVisible(true)
            return
        }

        setIsStepVisible(false)

        const timeoutId = window.setTimeout(() => {
            setRenderedStep(step)
            setIsStepVisible(true)
        }, 140)

        return () => {
            window.clearTimeout(timeoutId)
        }
    }, [renderedStep, step])

    useEffect(() => {
        if (!auth.user || hasCompletedOnboarding(auth.user)) {
            setLoadingPreferences(false)
            return
        }

        let active = true
        setLoadingPreferences(true)

        api.getReminderPreferences()
            .then(preferences => {
                if (!active) {
                    return
                }

                setReminderEmailEnabled(preferences.reminderEmailEnabled)
                setReminderDigestEnabled(preferences.reminderDigestEnabled)
                setReminderDaysThreshold(
                    preferences.rule?.daysThreshold != null ? String(preferences.rule.daysThreshold) : '14'
                )
                setReminderMileageThreshold(
                    preferences.rule?.mileageThreshold != null ? String(preferences.rule.mileageThreshold) : '750'
                )
                setError('')
            })
            .catch(loadError => {
                if (!active) {
                    return
                }

                setError(
                    loadError instanceof ApiError || loadError instanceof Error
                        ? loadError.message
                        : 'Unable to load your reminder defaults right now.'
                )
            })
            .finally(() => {
                if (active) {
                    setLoadingPreferences(false)
                }
            })

        return () => {
            active = false
        }
    }, [auth.user])

    const syncStep = (nextStep: 'profile' | 'preferences') => {
        const nextParams = new URLSearchParams(searchParams)

        if (nextStep === 'profile') {
            nextParams.delete('step')
        } else {
            nextParams.set('step', nextStep)
        }

        if (redirectTo !== '/garage') {
            nextParams.set('redirectTo', redirectTo)
        } else {
            nextParams.delete('redirectTo')
        }

        setSearchParams(nextParams, { replace: true })
    }

    const handleContinueToPreferences = () => {
        if (!firstName.trim()) {
            setError('Add at least your first name so your profile feels personal across the app.')
            return
        }

        setError('')
        syncStep('preferences')
    }

    const handleSkipProfileForNow = () => {
        setError('')
        syncStep('preferences')
    }

    const handleFinish = async () => {
        setSubmitting(true)
        setError('')

        try {
            const trimmedDaysThreshold = reminderDaysThreshold.trim()
            const trimmedMileageThreshold = reminderMileageThreshold.trim()
            const reminderRule =
                notificationPreference === 'enabled'
                    ? {
                          daysThreshold: trimmedDaysThreshold ? Number(trimmedDaysThreshold) : 14,
                          mileageThreshold: trimmedMileageThreshold ? Number(trimmedMileageThreshold) : 750
                      }
                    : null

            await Promise.all([
                api.updateSettings({
                    firstName,
                    lastName,
                    country,
                    historySortOrder,
                    preferredCurrency
                }),
                api.updateReminderPreferences({
                    reminderEmailEnabled,
                    reminderDigestEnabled,
                    rule: reminderRule
                })
            ])

            const completedUser = await api.completeOnboarding()
            auth.replaceUser(completedUser)
            navigate(redirectTo, { replace: true })
        } catch (submitError) {
            if (submitError instanceof ApiError || submitError instanceof Error) {
                setError(submitError.message)
            } else {
                setError('Unable to finish onboarding right now.')
            }
        } finally {
            setSubmitting(false)
        }
    }

    if (auth.status === 'loading' || loadingPreferences) {
        return <BrandedLoadingScreen message='Preparing your onboarding steps…' />
    }

    if (!auth.user) {
        return <div className='grid min-h-screen place-items-center text-muted-foreground'>Redirecting to login…</div>
    }

    const profileStepActive = step === 'profile'
    const renderedProfileStep = renderedStep === 'profile'

    return (
        <main className='min-h-screen bg-linear-to-b from-background via-secondary/15 to-background px-4 py-8 sm:px-6 lg:px-10'>
            <div className='mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl items-center'>
                <div className='flex w-full flex-col gap-8'>
                    <div className='flex flex-wrap items-start justify-between gap-4'>
                        <div className='flex flex-col gap-3'>
                            <Badge variant='secondary' className='w-fit'>
                                Welcome to Duralog
                            </Badge>
                            <div className='flex flex-col gap-2'>
                                <h1 className='text-3xl font-semibold tracking-tight text-foreground'>
                                    Set up your defaults
                                </h1>
                                <p className='max-w-2xl text-sm leading-6 text-muted-foreground'>
                                    {profileStepActive
                                        ? 'Add the profile details that follow you around the app.'
                                        : 'Choose the default history order and whether Duralog should send maintenance reminders.'}
                                </p>
                            </div>
                        </div>

                        <Button type='button' variant='ghost' onClick={() => auth.logout()} disabled={submitting}>
                            Sign out
                        </Button>
                    </div>

                    <div className='flex flex-wrap gap-3'>
                        <OnboardingStepBadge active={profileStepActive} complete={!profileStepActive} label='Profile' />
                        <OnboardingStepBadge active={!profileStepActive} complete={false} label='Preferences' />
                    </div>

                    {error ? (
                        <p className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
                            {error}
                        </p>
                    ) : null}

                    <section
                        className={cn(
                            'flex flex-col gap-6 transition-all duration-200 ease-out',
                            isStepVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                        )}
                    >
                        {renderedProfileStep ? (
                            <>
                                <div className='grid gap-4 sm:grid-cols-2'>
                                    <div className='flex flex-col gap-2 sm:col-span-1'>
                                        <label
                                            htmlFor='onboarding-first-name'
                                            className='text-sm font-medium text-foreground'
                                        >
                                            First name
                                        </label>
                                        <Input
                                            id='onboarding-first-name'
                                            value={firstName}
                                            onChange={event => setFirstName(event.target.value)}
                                            placeholder='e.g. Alex'
                                            required
                                        />
                                    </div>

                                    <div className='flex flex-col gap-2 sm:col-span-1'>
                                        <label
                                            htmlFor='onboarding-last-name'
                                            className='text-sm font-medium text-foreground'
                                        >
                                            Last name
                                        </label>
                                        <Input
                                            id='onboarding-last-name'
                                            value={lastName}
                                            onChange={event => setLastName(event.target.value)}
                                            placeholder='e.g. Driver'
                                        />
                                    </div>

                                    <div className='flex flex-col gap-2 sm:col-span-2'>
                                        <label
                                            htmlFor='onboarding-country'
                                            className='text-sm font-medium text-foreground'
                                        >
                                            Country
                                        </label>
                                        <Select
                                            value={country.trim() || EMPTY_COUNTRY_VALUE}
                                            onValueChange={value =>
                                                setCountry(value === EMPTY_COUNTRY_VALUE ? '' : value)
                                            }
                                        >
                                            <SelectTrigger id='onboarding-country'>
                                                <SelectValue placeholder='Select a country' />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectItem value={EMPTY_COUNTRY_VALUE}>
                                                        Prefer not to say
                                                    </SelectItem>
                                                    {availableCountries.map(option => (
                                                        <SelectItem key={option} value={option}>
                                                            {option}
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className='flex flex-col gap-5 rounded-2xl border bg-background/80 p-5'>
                                    <div className='flex items-start gap-3'>
                                        <div className='rounded-xl border bg-muted/40 p-2'>
                                            <ClipboardList className='h-4 w-4' />
                                        </div>
                                        <div className='flex flex-col gap-1'>
                                            <p className='font-medium text-foreground'>History order</p>
                                            <p className='text-sm text-muted-foreground'>
                                                Pick how service records should open by default.
                                            </p>
                                        </div>
                                    </div>

                                    <div className='flex flex-col gap-2'>
                                        <label
                                            htmlFor='onboarding-history-order'
                                            className='text-sm font-medium text-foreground'
                                        >
                                            Service history order
                                        </label>
                                        <Select
                                            value={historySortOrder}
                                            onValueChange={value => setHistorySortOrder(value as HistorySortOrder)}
                                        >
                                            <SelectTrigger id='onboarding-history-order'>
                                                <SelectValue placeholder='Select a sort order' />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectItem value='newest_first'>Newest first</SelectItem>
                                                    <SelectItem value='oldest_first'>Oldest first</SelectItem>
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className='flex flex-col gap-2'>
                                        <label
                                            htmlFor='onboarding-preferred-currency'
                                            className='text-sm font-medium text-foreground'
                                        >
                                            Preferred currency
                                        </label>
                                        <Select
                                            value={preferredCurrency}
                                            onValueChange={value =>
                                                setPreferredCurrency(value as PreferredCurrencyCode)
                                            }
                                        >
                                            <SelectTrigger id='onboarding-preferred-currency'>
                                                <SelectValue placeholder='Select a currency' />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    {PREFERRED_CURRENCIES.map(currency => (
                                                        <SelectItem key={currency.value} value={currency.value}>
                                                            {getCurrencyLabel(currency.value)}
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className='flex flex-col gap-5 rounded-2xl border bg-background/80 p-5'>
                                    <div className='flex items-start gap-3'>
                                        <div className='rounded-xl border bg-muted/40 p-2'>
                                            <BellRing className='h-4 w-4' />
                                        </div>
                                        <div className='flex flex-col gap-1'>
                                            <p className='font-medium text-foreground'>Notifications</p>
                                            <p className='text-sm text-muted-foreground'>
                                                Keep this simple: use the recommended reminder digest, or turn it off
                                                for now.
                                            </p>
                                        </div>
                                    </div>

                                    <div className='flex flex-col gap-2'>
                                        <label
                                            htmlFor='onboarding-notifications'
                                            className='text-sm font-medium text-foreground'
                                        >
                                            Maintenance reminders
                                        </label>
                                        <Select
                                            value={notificationPreference}
                                            onValueChange={value => {
                                                const nextValue = value as NotificationPreference
                                                const enabled = nextValue === 'enabled'

                                                setReminderEmailEnabled(enabled)
                                                setReminderDigestEnabled(enabled)
                                            }}
                                        >
                                            <SelectTrigger id='onboarding-notifications'>
                                                <SelectValue placeholder='Choose a reminder default' />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectItem value='enabled'>Recommended reminders</SelectItem>
                                                    <SelectItem value='disabled'>No reminders yet</SelectItem>
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <p className='text-sm text-muted-foreground'>
                                        Recommended reminders send an email digest when maintenance is about 14 days or
                                        750 miles away. You can fine-tune this later in Settings.
                                    </p>
                                </div>
                            </>
                        )}
                    </section>

                    <div className='flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between'>
                        <p className='text-sm text-muted-foreground'>
                            {step === 'profile'
                                ? 'Step 1 of 2: tell Duralog who this workspace belongs to.'
                                : 'Step 2 of 2: choose your default behavior.'}
                        </p>

                        <div className='flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row'>
                            {step === 'preferences' ? (
                                <Button
                                    type='button'
                                    variant='outline'
                                    onClick={() => syncStep('profile')}
                                    disabled={submitting}
                                >
                                    <ArrowLeft data-icon='inline-start' />
                                    Back
                                </Button>
                            ) : (
                                <Button type='button' variant='outline' onClick={handleSkipProfileForNow}>
                                    Skip for now
                                </Button>
                            )}

                            {step === 'profile' ? (
                                <Button type='button' onClick={handleContinueToPreferences}>
                                    Continue
                                    <ArrowRight data-icon='inline-end' />
                                </Button>
                            ) : (
                                <Button type='button' onClick={handleFinish} disabled={submitting}>
                                    {submitting ? 'Finishing setup…' : 'Finish onboarding'}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}

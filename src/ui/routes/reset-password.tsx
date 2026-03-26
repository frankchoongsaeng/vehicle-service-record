import type { MetaFunction } from '@remix-run/node'
import { Link, useNavigate, useSearchParams } from '@remix-run/react'
import { ArrowRight, CircleAlert, KeyRound, Moon, Sun } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'

import * as api from '../api/client.js'
import { ApiError } from '../api/client.js'
import { getPostAuthenticationDestination } from '../auth/onboarding.js'
import { getSafeRedirectTarget } from '../auth/redirect.js'
import { useAuth } from '../auth/useAuth.js'
import { AuthScreen } from '../components/AuthScreen.js'
import BrandedLoadingScreen from '../components/BrandedLoadingScreen.js'
import { Button } from '../components/ui/button.js'
import { Input } from '../components/ui/input.js'
import { useTheme } from '../theme/theme.js'

export const meta: MetaFunction = () => {
    return [
        { title: 'Choose New Password | Duralog' },
        {
            name: 'description',
            content: 'Choose a new password for your Duralog account.'
        }
    ]
}

type ResetState = 'idle' | 'success'

const MIN_PASSWORD_LENGTH = 8

export default function ResetPasswordRoute() {
    const auth = useAuth()
    const { theme, toggleTheme } = useTheme()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const redirectTo = getSafeRedirectTarget(searchParams.get('redirectTo'))
    const token = searchParams.get('token')?.trim() ?? ''
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [resetState, setResetState] = useState<ResetState>('idle')
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const loginLink = `/login?redirectTo=${encodeURIComponent(redirectTo)}`
    const forgotPasswordLink = `/forgot-password?redirectTo=${encodeURIComponent(redirectTo)}`
    const replaceUserRef = useRef(auth.replaceUser)

    useEffect(() => {
        replaceUserRef.current = auth.replaceUser
    }, [auth.replaceUser])

    const continueTarget = useMemo(() => {
        return getPostAuthenticationDestination(auth.user, redirectTo)
    }, [auth.user, redirectTo])

    useEffect(() => {
        if (auth.status !== 'loading' && !token) {
            navigate(auth.user ? '/settings' : forgotPasswordLink, { replace: true })
        }
    }, [auth.status, auth.user, forgotPasswordLink, navigate, token])

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (password.length < MIN_PASSWORD_LENGTH) {
            setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`)
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        setSubmitting(true)
        setError(null)
        setMessage(null)

        try {
            const result = await api.confirmPasswordReset(token, password)
            if (result.user) {
                replaceUserRef.current(result.user)
            }

            setResetState('success')
            setMessage(
                result.sessionUpdated
                    ? `Password updated for ${result.email}. Continue to Duralog with your new password.`
                    : `Password updated for ${result.email}. Sign in with your new password to continue.`
            )
            setPassword('')
            setConfirmPassword('')
        } catch (submitError) {
            if (submitError instanceof ApiError || submitError instanceof Error) {
                setError(submitError.message)
            } else {
                setError('Unable to reset your password right now.')
            }
        } finally {
            setSubmitting(false)
        }
    }

    if (auth.status === 'loading') {
        return <BrandedLoadingScreen message='Checking your session…' />
    }

    if (!token) {
        return <BrandedLoadingScreen message='Redirecting…' />
    }

    const hasExpiredOrInvalidLinkError = error === 'This password reset link is invalid or has expired.'

    return (
        <AuthScreen
            title={resetState === 'success' ? 'Password updated' : 'Choose a new password'}
            description={
                resetState === 'success'
                    ? 'Your Duralog password has been updated.'
                    : 'Set a new password for your account. This reset link can only be used while it is still valid.'
            }
            topAction={
                <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    onClick={toggleTheme}
                    aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    {theme === 'dark' ? <Sun /> : <Moon />}
                </Button>
            }
            footer={
                resetState === 'success' ? (
                    <p>
                        Need to return later?{' '}
                        <Link to={loginLink} className='font-semibold text-foreground hover:underline'>
                            Sign in
                        </Link>
                        .
                    </p>
                ) : null
            }
        >
            <div className='flex flex-col gap-4'>
                <div className='flex items-start gap-3 rounded-xl border bg-muted/40 px-4 py-4'>
                    <div
                        className={
                            hasExpiredOrInvalidLinkError
                                ? 'rounded-full bg-destructive/10 p-2 text-destructive'
                                : 'rounded-full bg-primary/10 p-2 text-primary'
                        }
                    >
                        {hasExpiredOrInvalidLinkError ? (
                            <CircleAlert data-icon='inline-start' />
                        ) : (
                            <KeyRound data-icon='inline-start' />
                        )}
                    </div>
                    <div className='flex flex-col gap-1'>
                        <p className='font-medium text-foreground'>Reset status</p>
                        <p className='text-sm text-muted-foreground'>
                            {hasExpiredOrInvalidLinkError
                                ? 'This reset link is no longer valid. Request a fresh password reset email to continue.'
                                : 'Choose a password with at least eight characters, then use it everywhere you sign in to Duralog.'}
                        </p>
                    </div>
                </div>

                {message ? (
                    <p className='rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground'>
                        {message}
                    </p>
                ) : null}

                {error && !hasExpiredOrInvalidLinkError ? (
                    <p className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
                        {error}
                    </p>
                ) : null}

                {resetState === 'success' ? (
                    <div className='flex flex-col gap-3 sm:flex-row'>
                        {auth.user ? (
                            <Button type='button' onClick={() => navigate(continueTarget, { replace: true })}>
                                Continue to Duralog
                                <ArrowRight data-icon='inline-end' />
                            </Button>
                        ) : (
                            <Button asChild>
                                <Link to={loginLink}>
                                    Sign in
                                    <ArrowRight data-icon='inline-end' />
                                </Link>
                            </Button>
                        )}
                    </div>
                ) : hasExpiredOrInvalidLinkError ? (
                    <div className='flex flex-col gap-3 sm:flex-row'>
                        <Button asChild>
                            <Link to={forgotPasswordLink}>
                                Request another reset link
                                <ArrowRight data-icon='inline-end' />
                            </Link>
                        </Button>
                        <Button asChild variant='outline'>
                            <Link to={loginLink}>Back to sign in</Link>
                        </Button>
                    </div>
                ) : (
                    <form className='flex flex-col gap-4' onSubmit={handleSubmit}>
                        <div className='flex flex-col gap-2'>
                            <label htmlFor='reset-password' className='text-sm font-medium text-foreground'>
                                New password
                            </label>
                            <Input
                                id='reset-password'
                                type='password'
                                autoComplete='new-password'
                                placeholder='Choose a new password'
                                value={password}
                                onChange={event => setPassword(event.target.value)}
                                required
                            />
                        </div>

                        <div className='flex flex-col gap-2'>
                            <label htmlFor='reset-password-confirm' className='text-sm font-medium text-foreground'>
                                Confirm new password
                            </label>
                            <Input
                                id='reset-password-confirm'
                                type='password'
                                autoComplete='new-password'
                                placeholder='Re-enter your new password'
                                value={confirmPassword}
                                onChange={event => setConfirmPassword(event.target.value)}
                                required
                            />
                        </div>

                        <Button className='w-full' size='lg' type='submit' disabled={submitting}>
                            {submitting ? (
                                'Updating password…'
                            ) : (
                                <>
                                    Save new password
                                    <ArrowRight data-icon='inline-end' />
                                </>
                            )}
                        </Button>
                    </form>
                )}
            </div>
        </AuthScreen>
    )
}

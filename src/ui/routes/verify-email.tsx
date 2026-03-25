import type { MetaFunction } from '@remix-run/node'
import { Link, useNavigate, useSearchParams } from '@remix-run/react'
import { ArrowRight, MailCheck, Moon, RefreshCcw, Sun } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import * as api from '../api/client.js'
import { ApiError } from '../api/client.js'
import { AuthScreen } from '../components/AuthScreen.js'
import BrandedLoadingScreen from '../components/BrandedLoadingScreen.js'
import { buildVerifyEmailUrl, getPostAuthenticationDestination } from '../auth/onboarding.js'
import { getSafeRedirectTarget } from '../auth/redirect.js'
import { useAuth } from '../auth/useAuth.js'
import { Button } from '../components/ui/button.js'
import { useTheme } from '../theme/theme.js'

export const meta: MetaFunction = () => {
    return [
        { title: 'Verify Email | Duralog' },
        {
            name: 'description',
            content: 'Verify your email address to enable reminder emails and other email-based services.'
        }
    ]
}

type VerificationState = 'idle' | 'verifying' | 'verified' | 'error'

export default function VerifyEmailRoute() {
    const auth = useAuth()
    const { theme, toggleTheme } = useTheme()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const redirectTo = getSafeRedirectTarget(searchParams.get('redirectTo'))
    const token = searchParams.get('token')?.trim() ?? ''
    const [verificationState, setVerificationState] = useState<VerificationState>(token ? 'verifying' : 'idle')
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [resending, setResending] = useState(false)

    useEffect(() => {
        if (!token) {
            setVerificationState('idle')
            return
        }

        let cancelled = false
        setVerificationState('verifying')
        setError(null)
        setMessage(null)

        api.verifyEmail(token)
            .then(result => {
                if (cancelled) {
                    return
                }

                if (result.user) {
                    auth.replaceUser(result.user)
                }

                setVerificationState('verified')
                setMessage(
                    result.sessionUpdated
                        ? `Verified ${result.email}. Email reminders are now available.`
                        : `Verified ${result.email}. Sign in to that account to continue.`
                )
            })
            .catch(verificationError => {
                if (cancelled) {
                    return
                }

                setVerificationState('error')
                if (verificationError instanceof ApiError || verificationError instanceof Error) {
                    setError(verificationError.message)
                } else {
                    setError('Unable to verify this email address right now.')
                }
            })

        return () => {
            cancelled = true
        }
    }, [auth, token])

    const continueTarget = useMemo(() => {
        return getPostAuthenticationDestination(auth.user, redirectTo)
    }, [auth.user, redirectTo])

    const handleResend = async () => {
        setResending(true)
        setError(null)
        setMessage(null)

        try {
            const updatedUser = await api.resendEmailVerification()
            auth.replaceUser(updatedUser)
            setVerificationState('idle')
            setMessage('A fresh verification email is on the way. Check your inbox and spam folder.')
        } catch (resendError) {
            if (resendError instanceof ApiError || resendError instanceof Error) {
                setError(resendError.message)
            } else {
                setError('Unable to resend the verification email right now.')
            }
        } finally {
            setResending(false)
        }
    }

    if (auth.status === 'loading') {
        return <BrandedLoadingScreen message='Checking your session…' />
    }

    const alreadyVerified = Boolean(auth.user?.emailVerifiedAt)
    const verificationSentAt = auth.user?.emailVerificationSentAt
    const loginLink = `/login?redirectTo=${encodeURIComponent(redirectTo)}`
    const canResend = Boolean(auth.user && !alreadyVerified)

    return (
        <AuthScreen
            eyebrow='Email Verification'
            title={alreadyVerified ? 'Email verified' : 'Verify your email'}
            description={
                alreadyVerified
                    ? 'Your email address is verified and ready for reminder delivery.'
                    : 'Verify your address to turn on reminder emails and other email-based services.'
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
                <p>
                    {auth.user ? (
                        <Link to={buildVerifyEmailUrl(redirectTo)} className='font-semibold text-foreground hover:underline'>
                            Refresh this verification page
                        </Link>
                    ) : (
                        <Link to={loginLink} className='font-semibold text-foreground hover:underline'>
                            Sign in to resend the email
                        </Link>
                    )}
                    .
                </p>
            }
        >
            <div className='flex flex-col gap-4'>
                <div className='flex items-start gap-3 rounded-xl border bg-muted/40 px-4 py-4'>
                    <div className='rounded-full bg-primary/10 p-2 text-primary'>
                        <MailCheck data-icon='inline-start' />
                    </div>
                    <div className='flex flex-col gap-1'>
                        <p className='font-medium text-foreground'>Verification status</p>
                        <p className='text-sm text-muted-foreground'>
                            {alreadyVerified
                                ? `Verified for ${auth.user?.email ?? 'your account'}.`
                                : verificationSentAt
                                ? `We sent a verification email to ${auth.user?.email ?? 'your address'}. Open that link to finish setup.`
                                : auth.user
                                ? `We have not confirmed a sent verification email for ${auth.user.email} yet. Send another one below.`
                                : 'Open the verification link from your email. If you are not signed in, you can still complete verification from that link.'}
                        </p>
                    </div>
                </div>

                {verificationState === 'verifying' ? (
                    <p className='rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground'>
                        Verifying your email address…
                    </p>
                ) : null}

                {message ? (
                    <p className='rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground'>
                        {message}
                    </p>
                ) : null}

                {error ? (
                    <p className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
                        {error}
                    </p>
                ) : null}

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

                    {canResend ? (
                        <Button type='button' variant='outline' onClick={handleResend} disabled={resending}>
                            <RefreshCcw data-icon='inline-start' />
                            {resending ? 'Sending…' : 'Resend verification email'}
                        </Button>
                    ) : null}
                </div>
            </div>
        </AuthScreen>
    )
}
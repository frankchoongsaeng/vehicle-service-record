import type { MetaFunction } from '@remix-run/node'
import { Link, useNavigate, useSearchParams } from '@remix-run/react'
import { ArrowRight, CircleAlert, MailCheck, Moon, Sun } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import * as api from '../api/client.js'
import { ApiError } from '../api/client.js'
import { AuthScreen } from '../components/AuthScreen.js'
import BrandedLoadingScreen from '../components/BrandedLoadingScreen.js'
import { getPostAuthenticationDestination } from '../auth/onboarding.js'
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

type VerificationFeedback =
    | {
          token: string
          state: 'verified'
          message: string
      }
    | {
          token: string
          state: 'error'
          error: string
      }
    | null

const verificationRequestCache = new Map<
    string,
    Promise<{ verified: boolean; email: string; sessionUpdated: boolean; user: api.AuthUser | null }>
>()

function getVerificationRequest(token: string): Promise<{
    verified: boolean
    email: string
    sessionUpdated: boolean
    user: api.AuthUser | null
}> {
    const existingRequest = verificationRequestCache.get(token)
    if (existingRequest) {
        return existingRequest
    }

    const request = api.verifyEmail(token)
    verificationRequestCache.set(token, request)
    return request
}

export default function VerifyEmailRoute() {
    const auth = useAuth()
    const { theme, toggleTheme } = useTheme()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const redirectTo = getSafeRedirectTarget(searchParams.get('redirectTo'))
    const token = searchParams.get('token')?.trim() ?? ''
    const [verificationFeedback, setVerificationFeedback] = useState<VerificationFeedback>(null)
    const loginLink = `/login?redirectTo=${encodeURIComponent(redirectTo)}`
    const replaceUserRef = useRef(auth.replaceUser)

    useEffect(() => {
        replaceUserRef.current = auth.replaceUser
    }, [auth.replaceUser])

    useEffect(() => {
        if (!token) {
            return
        }

        let active = true

        getVerificationRequest(token)
            .then(result => {
                if (!active) {
                    return
                }

                if (result.user) {
                    replaceUserRef.current(result.user)
                }

                setVerificationFeedback({
                    token,
                    state: 'verified',
                    message: result.sessionUpdated
                        ? `Verified ${result.email}. Email reminders are now available.`
                        : `Verified ${result.email}. Sign in to that account to continue.`
                })
            })
            .catch(verificationError => {
                if (!active) {
                    return
                }

                setVerificationFeedback({
                    token,
                    state: 'error',
                    error:
                        verificationError instanceof ApiError || verificationError instanceof Error
                            ? verificationError.message
                            : 'Unable to verify this email address right now.'
                })
            })

        return () => {
            active = false
        }
    }, [token])

    const continueTarget = useMemo(() => {
        return getPostAuthenticationDestination(auth.user, redirectTo)
    }, [auth.user, redirectTo])

    useEffect(() => {
        if (auth.status !== 'loading' && !token) {
            navigate(auth.user ? continueTarget : loginLink, { replace: true })
        }
    }, [auth.status, auth.user, continueTarget, loginLink, navigate, token])

    if (auth.status === 'loading') {
        return <BrandedLoadingScreen message='Checking your session…' />
    }

    if (!token) {
        return <BrandedLoadingScreen message='Redirecting…' />
    }

    const verificationState: VerificationState = !token
        ? 'idle'
        : !verificationFeedback || verificationFeedback.token !== token
        ? 'verifying'
        : verificationFeedback.state
    const message =
        verificationFeedback && verificationFeedback.token === token && verificationFeedback.state === 'verified'
            ? verificationFeedback.message
            : null
    const error =
        verificationFeedback && verificationFeedback.token === token && verificationFeedback.state === 'error'
            ? verificationFeedback.error
            : null
    const hasExpiredOrInvalidLinkError = error === 'This verification link is invalid or has expired.'

    const alreadyVerified = Boolean(auth.user?.emailVerifiedAt)
    const verificationSentAt = auth.user?.emailVerificationSentAt
    const isFailureState = verificationState === 'error'
    const verificationStatusDescription = alreadyVerified
        ? `Verified for ${auth.user?.email ?? 'your account'}.`
        : hasExpiredOrInvalidLinkError
        ? 'This verification link is no longer valid. Sign in to request a new verification email.'
        : verificationSentAt
        ? `We sent a verification email to ${auth.user?.email ?? 'your address'}. Open that link to finish setup.`
        : auth.user
        ? `We have not confirmed a sent verification email for ${auth.user.email} yet. Send another one below.`
        : 'Open the verification link from your email. If you are not signed in, you can still complete verification from that link.'

    return (
        <AuthScreen
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
        >
            <div className='flex flex-col gap-4'>
                <div className='flex items-start gap-3 rounded-xl border bg-muted/40 px-4 py-4'>
                    <div
                        className={
                            isFailureState
                                ? 'rounded-full bg-destructive/10 p-2 text-destructive'
                                : 'rounded-full bg-primary/10 p-2 text-primary'
                        }
                    >
                        {isFailureState ? (
                            <CircleAlert data-icon='inline-start' />
                        ) : (
                            <MailCheck data-icon='inline-start' />
                        )}
                    </div>
                    <div className='flex flex-col gap-1'>
                        <p className='font-medium text-foreground'>Verification status</p>
                        <p className='text-sm text-muted-foreground'>{verificationStatusDescription}</p>
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

                {error && !hasExpiredOrInvalidLinkError ? (
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
                </div>
            </div>
        </AuthScreen>
    )
}

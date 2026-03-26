import type { MetaFunction } from '@remix-run/node'
import { Link, useSearchParams } from '@remix-run/react'
import { ArrowRight, Mail, Moon, Sun } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'

import * as api from '../api/client.js'
import { ApiError } from '../api/client.js'
import { useAuth } from '../auth/useAuth.js'
import { AuthScreen } from '../components/AuthScreen.js'
import BrandedLoadingScreen from '../components/BrandedLoadingScreen.js'
import { Button } from '../components/ui/button.js'
import { Input } from '../components/ui/input.js'
import { getSafeRedirectTarget } from '../auth/redirect.js'
import { useTheme } from '../theme/theme.js'

export const meta: MetaFunction = () => {
    return [
        { title: 'Reset Password | Duralog' },
        {
            name: 'description',
            content: 'Request a password reset email to choose a new Duralog password.'
        }
    ]
}

export default function ForgotPasswordRoute() {
    const auth = useAuth()
    const { theme, toggleTheme } = useTheme()
    const [searchParams] = useSearchParams()
    const redirectTo = getSafeRedirectTarget(searchParams.get('redirectTo'))
    const initialEmail = searchParams.get('email')?.trim() ?? ''
    const [email, setEmail] = useState(initialEmail)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const loginLink = `/login?redirectTo=${encodeURIComponent(redirectTo)}`
    const returnLink = auth.user ? '/settings' : loginLink
    const returnLabel = auth.user ? 'Back to settings' : 'Back to sign in'

    useEffect(() => {
        if (!initialEmail && auth.user?.email && !email) {
            setEmail(auth.user.email)
        }
    }, [auth.user?.email, email, initialEmail])

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setSubmitting(true)
        setError(null)
        setSuccessMessage(null)

        try {
            await api.requestPasswordReset(email)
            setSuccessMessage(
                `If an account exists for ${email
                    .trim()
                    .toLowerCase()}, we sent a password reset link. Open that email to choose a new password.`
            )
        } catch (submitError) {
            if (submitError instanceof ApiError || submitError instanceof Error) {
                setError(submitError.message)
            } else {
                setError('Unable to send a password reset email right now.')
            }
        } finally {
            setSubmitting(false)
        }
    }

    if (auth.status === 'loading') {
        return <BrandedLoadingScreen message='Checking your session…' />
    }

    return (
        <AuthScreen
            title='Reset your password'
            description='Enter the email on your Duralog account and we will send you a link to choose a new password.'
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
                    Remembered it?{' '}
                    <Link to={loginLink} className='font-semibold text-foreground hover:underline'>
                        Sign in instead
                    </Link>
                    .
                </p>
            }
        >
            <div className='flex flex-col gap-4'>
                <div className='flex items-start gap-3 rounded-xl border bg-muted/40 px-4 py-4'>
                    <div className='rounded-full bg-primary/10 p-2 text-primary'>
                        <Mail data-icon='inline-start' />
                    </div>
                    <div className='flex flex-col gap-1'>
                        <p className='font-medium text-foreground'>Password reset email</p>
                        <p className='text-sm text-muted-foreground'>
                            The link takes you to a secure page where you can set a new password for this account.
                        </p>
                    </div>
                </div>

                <form className='flex flex-col gap-4' onSubmit={handleSubmit}>
                    {error ? (
                        <p className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
                            {error}
                        </p>
                    ) : null}

                    {successMessage ? (
                        <p className='rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground'>
                            {successMessage}
                        </p>
                    ) : null}

                    <div className='flex flex-col gap-2'>
                        <label htmlFor='forgot-password-email' className='text-sm font-medium text-foreground'>
                            Email address
                        </label>
                        <Input
                            id='forgot-password-email'
                            type='email'
                            autoComplete='email'
                            placeholder='you@example.com'
                            value={email}
                            onChange={event => setEmail(event.target.value)}
                            required
                        />
                    </div>

                    <Button className='w-full' size='lg' type='submit' disabled={submitting}>
                        {submitting ? (
                            'Sending reset link…'
                        ) : (
                            <>
                                Send reset link
                                <ArrowRight data-icon='inline-end' />
                            </>
                        )}
                    </Button>
                </form>
            </div>
        </AuthScreen>
    )
}

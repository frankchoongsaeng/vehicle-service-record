import type { MetaFunction } from '@remix-run/node'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from '@remix-run/react'
import { ArrowRight, Moon, Sun } from 'lucide-react'
import { AuthScreen } from '../components/AuthScreen.js'
import BrandedLoadingScreen from '../components/BrandedLoadingScreen.js'
import { GoogleIcon } from '../components/GoogleIcon.js'
import { Button } from '../components/ui/button.js'
import { Input } from '../components/ui/input.js'
import { Separator } from '../components/ui/separator.js'
import { buildGoogleAuthStartUrl, getGoogleAuthErrorMessage } from '../auth/google.js'
import { getPostAuthenticationDestination } from '../auth/onboarding.js'
import { useAuth } from '../auth/useAuth.js'
import { getSafeRedirectTarget } from '../auth/redirect.js'
import { ApiError } from '../api/client.js'
import { useTheme } from '../theme/theme.js'

const MIN_PASSWORD_LENGTH = 8

export const meta: MetaFunction = () => {
    return [
        { title: 'Sign Up | Duralog' },
        { name: 'description', content: 'Create a Duralog account to track your vehicle service records.' }
    ]
}

export default function SignupRoute() {
    const auth = useAuth()
    const { theme, toggleTheme } = useTheme()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const redirectTo = getSafeRedirectTarget(searchParams.get('redirectTo'))
    const loginLink = `/login?redirectTo=${encodeURIComponent(redirectTo)}`
    const googleAuthHref = buildGoogleAuthStartUrl(redirectTo, '/signup')

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [callbackError, setCallbackError] = useState<string | null>(null)

    useEffect(() => {
        if (auth.status === 'authenticated') {
            navigate(getPostAuthenticationDestination(auth.user, redirectTo), { replace: true })
        }
    }, [auth.status, auth.user, navigate, redirectTo])

    useEffect(() => {
        setCallbackError(getGoogleAuthErrorMessage(searchParams.get('authError')))
    }, [searchParams])

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setSubmitting(true)
        setError(null)
        setCallbackError(null)

        if (password.length < MIN_PASSWORD_LENGTH) {
            setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`)
            setSubmitting(false)
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            setSubmitting(false)
            return
        }

        try {
            const nextUser = await auth.signup({ email, password })
            navigate(getPostAuthenticationDestination(nextUser, redirectTo), { replace: true })
        } catch (submitError) {
            if (submitError instanceof ApiError) {
                setError(submitError.message)
            } else if (submitError instanceof Error) {
                setError(submitError.message)
            } else {
                setError('Unable to create your account right now.')
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
            title='Create your account'
            description='Set up your account to start tracking vehicles, service history, and upcoming work. We will ask you to verify your email before email-based features turn on.'
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
                    Already have an account?{' '}
                    <Link to={loginLink} className='font-semibold text-foreground hover:underline'>
                        Sign in
                    </Link>
                    .
                </p>
            }
        >
            <div className='flex flex-col gap-4'>
                <Button asChild className='w-full' size='lg' type='button' variant='outline'>
                    <a href={googleAuthHref}>
                        <GoogleIcon data-icon='inline-start' />
                        Continue with Google
                    </a>
                </Button>

                <div className='flex items-center gap-3'>
                    <Separator className='flex-1' />
                    <span className='rounded-full bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground'>
                        Or continue with email
                    </span>
                    <Separator className='flex-1' />
                </div>
            </div>

            <form className='flex flex-col gap-4' onSubmit={handleSubmit}>
                {(error || callbackError || auth.bootstrapError) && (
                    <div className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
                        {error ?? callbackError ?? auth.bootstrapError}
                    </div>
                )}

                <div className='flex flex-col gap-2'>
                    <label htmlFor='email' className='text-sm font-medium text-foreground'>
                        Email address
                    </label>
                    <Input
                        id='email'
                        type='email'
                        autoComplete='email'
                        placeholder='you@example.com'
                        value={email}
                        onChange={event => setEmail(event.target.value)}
                        required
                    />
                </div>

                <div className='flex flex-col gap-2'>
                    <label htmlFor='password' className='text-sm font-medium text-foreground'>
                        Password
                    </label>
                    <Input
                        id='password'
                        type='password'
                        autoComplete='new-password'
                        placeholder='Create a password'
                        value={password}
                        onChange={event => setPassword(event.target.value)}
                        minLength={MIN_PASSWORD_LENGTH}
                        required
                    />
                </div>

                <div className='flex flex-col gap-2'>
                    <label htmlFor='confirm-password' className='text-sm font-medium text-foreground'>
                        Confirm password
                    </label>
                    <Input
                        id='confirm-password'
                        type='password'
                        autoComplete='new-password'
                        placeholder='Re-enter your password'
                        value={confirmPassword}
                        onChange={event => setConfirmPassword(event.target.value)}
                        minLength={MIN_PASSWORD_LENGTH}
                        required
                    />
                </div>

                <Button className='w-full' size='lg' type='submit' disabled={submitting}>
                    {submitting ? (
                        'Creating account…'
                    ) : (
                        <>
                            Create account
                            <ArrowRight data-icon='inline-end' />
                        </>
                    )}
                </Button>
            </form>
        </AuthScreen>
    )
}

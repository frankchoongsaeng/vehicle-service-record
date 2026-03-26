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
import { getPostAuthenticationDestination } from '../auth/onboarding.js'
import { buildGoogleAuthStartUrl, getGoogleAuthErrorMessage } from '../auth/google.js'
import { useAuth } from '../auth/useAuth.js'
import { getSafeRedirectTarget } from '../auth/redirect.js'
import { ApiError } from '../api/client.js'
import { useTheme } from '../theme/theme.js'

export const meta: MetaFunction = () => {
    return [
        { title: 'Login | Duralog' },
        { name: 'description', content: 'Sign in to access Duralog and your vehicle service records.' }
    ]
}

export default function LoginRoute() {
    const auth = useAuth()
    const { theme, toggleTheme } = useTheme()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const redirectTo = getSafeRedirectTarget(searchParams.get('redirectTo'))
    const signupLink = `/signup?redirectTo=${encodeURIComponent(redirectTo)}`
    const googleAuthHref = buildGoogleAuthStartUrl(redirectTo, '/login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [callbackError, setCallbackError] = useState<string | null>(null)
    const forgotPasswordLink = `/forgot-password?redirectTo=${encodeURIComponent(redirectTo)}${
        email.trim() ? `&email=${encodeURIComponent(email.trim())}` : ''
    }`

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

        try {
            const nextUser = await auth.login({ email, password })
            navigate(getPostAuthenticationDestination(nextUser, redirectTo), { replace: true })
        } catch (submitError) {
            if (submitError instanceof ApiError) {
                setError(submitError.message)
            } else if (submitError instanceof Error) {
                setError(submitError.message)
            } else {
                setError('Unable to sign in right now.')
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
            title='Sign in'
            description='Use the account tied to your vehicles to pick up right where you left off.'
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
                    Need an account?{' '}
                    <Link to={signupLink} className='font-semibold text-foreground hover:underline'>
                        Create one
                    </Link>
                    .
                </p>
            }
        >
            <div className='flex flex-col gap-4'>
                <Button asChild className='w-full' size='lg' type='button' variant='outline'>
                    <a href={googleAuthHref}>
                        <GoogleIcon data-icon='inline-start' />
                        Sign in with Google
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
                    <div className='flex items-center justify-between gap-3'>
                        <label htmlFor='password' className='text-sm font-medium text-foreground'>
                            Password
                        </label>
                        <Link to={forgotPasswordLink} className='text-sm font-medium text-primary hover:underline'>
                            Forgot password?
                        </Link>
                    </div>
                    <Input
                        id='password'
                        type='password'
                        autoComplete='current-password'
                        placeholder='Enter your password'
                        value={password}
                        onChange={event => setPassword(event.target.value)}
                        required
                    />
                </div>

                <Button className='w-full' size='lg' type='submit' disabled={submitting}>
                    {submitting ? (
                        'Signing in…'
                    ) : (
                        <>
                            Sign in
                            <ArrowRight data-icon='inline-end' />
                        </>
                    )}
                </Button>
            </form>
        </AuthScreen>
    )
}

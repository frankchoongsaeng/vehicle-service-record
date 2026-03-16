import type { MetaFunction } from '@remix-run/node'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from '@remix-run/react'
import { Button } from '../../src/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../src/components/ui/card'
import { Input } from '../../src/components/ui/input'
import { useAuth } from '../../src/auth/useAuth'
import { getSafeRedirectTarget } from '../../src/auth/redirect'
import { ApiError } from '../../src/api/client'

const MIN_PASSWORD_LENGTH = 8

export const meta: MetaFunction = () => {
    return [
        { title: 'Sign Up | Duralog' },
        { name: 'description', content: 'Create a Duralog account to track your vehicle service records.' }
    ]
}

export default function SignupRoute() {
    const auth = useAuth()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const redirectTo = getSafeRedirectTarget(searchParams.get('redirectTo'))
    const loginLink = `/login?redirectTo=${encodeURIComponent(redirectTo)}`

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (auth.status === 'authenticated') {
            navigate(redirectTo, { replace: true })
        }
    }, [auth.status, navigate, redirectTo])

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setSubmitting(true)
        setError(null)

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
            await auth.signup({ email, password })
            navigate(redirectTo, { replace: true })
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
        return <div className='grid min-h-screen place-items-center text-slate-600'>Checking your session…</div>
    }

    return (
        <main className='grid min-h-screen place-items-center bg-slate-100 px-4 py-8'>
            <Card className='w-full max-w-md'>
                <CardHeader className='space-y-2'>
                    <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Get started</p>
                    <CardTitle className='text-2xl'>Create your account.</CardTitle>
                    <p className='text-sm text-slate-600'>
                        Sign up with your email and password to manage your vehicles and service history.
                    </p>
                </CardHeader>

                <CardContent>
                    <form className='space-y-4' onSubmit={handleSubmit}>
                        {(error || auth.bootstrapError) && (
                            <div className='rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
                                {error ?? auth.bootstrapError}
                            </div>
                        )}

                        <div className='space-y-2'>
                            <label htmlFor='email' className='text-sm font-medium text-slate-700'>
                                Email
                            </label>
                            <Input
                                id='email'
                                type='email'
                                autoComplete='email'
                                value={email}
                                onChange={event => setEmail(event.target.value)}
                                required
                            />
                        </div>

                        <div className='space-y-2'>
                            <label htmlFor='password' className='text-sm font-medium text-slate-700'>
                                Password
                            </label>
                            <Input
                                id='password'
                                type='password'
                                autoComplete='new-password'
                                value={password}
                                onChange={event => setPassword(event.target.value)}
                                minLength={MIN_PASSWORD_LENGTH}
                                required
                            />
                        </div>

                        <div className='space-y-2'>
                            <label htmlFor='confirm-password' className='text-sm font-medium text-slate-700'>
                                Confirm password
                            </label>
                            <Input
                                id='confirm-password'
                                type='password'
                                autoComplete='new-password'
                                value={confirmPassword}
                                onChange={event => setConfirmPassword(event.target.value)}
                                minLength={MIN_PASSWORD_LENGTH}
                                required
                            />
                        </div>

                        <Button className='w-full' type='submit' disabled={submitting}>
                            {submitting ? 'Creating account…' : 'Create account'}
                        </Button>
                    </form>

                    <p className='mt-4 text-sm text-slate-600'>
                        Already have an account?{' '}
                        <Link to={loginLink} className='font-semibold text-slate-900 hover:underline'>
                            Sign in
                        </Link>
                        .
                    </p>
                </CardContent>
            </Card>
        </main>
    )
}

import type { MetaFunction } from '@remix-run/node'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from '@remix-run/react'
import { Button } from '../components/ui/button.js'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.js'
import { Input } from '../components/ui/input.js'
import { useAuth } from '../auth/useAuth.js'
import { getSafeRedirectTarget } from '../auth/redirect.js'
import { ApiError } from '../api/client.js'

export const meta: MetaFunction = () => {
    return [
        { title: 'Login | Duralog' },
        { name: 'description', content: 'Sign in to access Duralog and your vehicle service records.' }
    ]
}

export default function LoginRoute() {
    const auth = useAuth()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const redirectTo = getSafeRedirectTarget(searchParams.get('redirectTo'))
    const signupLink = `/signup?redirectTo=${encodeURIComponent(redirectTo)}`
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
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

        try {
            await auth.login({ email, password })
            navigate(redirectTo, { replace: true })
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
        return <div className='grid min-h-screen place-items-center text-muted-foreground'>Checking your session…</div>
    }

    return (
        <main className='grid min-h-screen place-items-center bg-background px-4 py-8'>
            <Card className='w-full max-w-md'>
                <CardHeader className='space-y-2'>
                    <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>Secure access</p>
                    <CardTitle className='text-2xl'>Sign in to manage your vehicles.</CardTitle>
                    <p className='text-sm text-muted-foreground'>
                        Your maintenance records are tied to your account. Use your email and password to continue.
                    </p>
                </CardHeader>

                <CardContent>
                    <form className='space-y-4' onSubmit={handleSubmit}>
                        {(error || auth.bootstrapError) && (
                            <div className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
                                {error ?? auth.bootstrapError}
                            </div>
                        )}

                        <div className='space-y-2'>
                            <label htmlFor='email' className='text-sm font-medium text-foreground'>
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
                            <label htmlFor='password' className='text-sm font-medium text-foreground'>
                                Password
                            </label>
                            <Input
                                id='password'
                                type='password'
                                autoComplete='current-password'
                                value={password}
                                onChange={event => setPassword(event.target.value)}
                                required
                            />
                        </div>

                        <Button className='w-full' type='submit' disabled={submitting}>
                            {submitting ? 'Signing in…' : 'Sign in'}
                        </Button>
                    </form>

                    <p className='mt-4 text-sm text-muted-foreground'>
                        Need an account?{' '}
                        <Link to={signupLink} className='font-semibold text-foreground hover:underline'>
                            Create one
                        </Link>
                        .
                    </p>
                </CardContent>
            </Card>
        </main>
    )
}

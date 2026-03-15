import type { MetaFunction } from '@remix-run/node'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from '@remix-run/react'
import { useAuth } from '../../src/auth/useAuth'
import { getSafeRedirectTarget } from '../../src/auth/redirect'
import { ApiError } from '../../src/api/client'

export const meta: MetaFunction = () => {
    return [
        { title: 'Login | Vehicle Service Record' },
        { name: 'description', content: 'Sign in to access your vehicle service records.' }
    ]
}

export default function LoginRoute() {
    const auth = useAuth()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const redirectTo = getSafeRedirectTarget(searchParams.get('redirectTo'))
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
        return <div className='page-loading'>Checking your session…</div>
    }

    return (
        <main className='login-page'>
            <section className='login-panel'>
                <div className='login-copy'>
                    <span className='login-eyebrow'>Secure access</span>
                    <h1>Sign in to manage your vehicles.</h1>
                    <p>Your maintenance records are tied to your account. Use your email and password to continue.</p>
                </div>

                <form className='login-form' onSubmit={handleSubmit}>
                    {(error || auth.bootstrapError) && <div className='form-error'>{error ?? auth.bootstrapError}</div>}

                    <div className='form-group'>
                        <label htmlFor='email'>Email</label>
                        <input
                            id='email'
                            type='email'
                            autoComplete='email'
                            value={email}
                            onChange={event => setEmail(event.target.value)}
                            required
                        />
                    </div>

                    <div className='form-group'>
                        <label htmlFor='password'>Password</label>
                        <input
                            id='password'
                            type='password'
                            autoComplete='current-password'
                            value={password}
                            onChange={event => setPassword(event.target.value)}
                            required
                        />
                    </div>

                    <button className='btn-primary login-submit' type='submit' disabled={submitting}>
                        {submitting ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>

                <p className='login-help'>
                    Need a development account? Follow the setup steps in the project README.
                    <Link to='/'> Back to app</Link>
                </p>
            </section>
        </main>
    )
}

import type { MetaFunction } from '@remix-run/node'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from '@remix-run/react'
import { useAuth } from '../../src/auth/useAuth'
import { getSafeRedirectTarget } from '../../src/auth/redirect'
import { ApiError } from '../../src/api/client'

const MIN_PASSWORD_LENGTH = 8

export const meta: MetaFunction = () => {
    return [
        { title: 'Sign Up | Vehicle Service Record' },
        { name: 'description', content: 'Create an account to track your vehicle service records.' }
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
        return <div className='page-loading'>Checking your session…</div>
    }

    return (
        <main className='login-page'>
            <section className='login-panel'>
                <div className='login-copy'>
                    <span className='login-eyebrow'>Get started</span>
                    <h1>Create your account.</h1>
                    <p>Sign up with your email and password to manage your vehicles and service history.</p>
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
                            autoComplete='new-password'
                            value={password}
                            onChange={event => setPassword(event.target.value)}
                            minLength={MIN_PASSWORD_LENGTH}
                            required
                        />
                    </div>

                    <div className='form-group'>
                        <label htmlFor='confirm-password'>Confirm password</label>
                        <input
                            id='confirm-password'
                            type='password'
                            autoComplete='new-password'
                            value={confirmPassword}
                            onChange={event => setConfirmPassword(event.target.value)}
                            minLength={MIN_PASSWORD_LENGTH}
                            required
                        />
                    </div>

                    <button className='btn-primary login-submit' type='submit' disabled={submitting}>
                        {submitting ? 'Creating account…' : 'Create account'}
                    </button>
                </form>

                <p className='login-help'>
                    Already have an account? <Link to={loginLink}>Sign in</Link>.
                </p>
            </section>
        </main>
    )
}

import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as api from '../api/client.js'
import { setClientMonitoringUser } from '../monitoring/client.js'
import type { AuthUser, LoginInput, SignupInput } from '../types/index.js'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

type AuthContextValue = {
    user: AuthUser | null
    status: AuthStatus
    bootstrapError: string | null
    login: (input: LoginInput) => Promise<AuthUser>
    signup: (input: SignupInput) => Promise<AuthUser>
    logout: () => Promise<void>
    refreshSession: () => Promise<AuthUser | null>
    replaceUser: (user: AuthUser) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
export { AuthContext }

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [status, setStatus] = useState<AuthStatus>('loading')
    const [bootstrapError, setBootstrapError] = useState<string | null>(null)

    useEffect(() => {
        api.setUnauthorizedHandler(() => {
            setUser(null)
            setBootstrapError(null)
            setStatus('unauthenticated')
        })

        return () => {
            api.setUnauthorizedHandler(null)
        }
    }, [])

    useEffect(() => {
        setClientMonitoringUser(
            user
                ? {
                      id: user.id,
                      email: user.email
                  }
                : null
        )
    }, [user])

    async function refreshSession(): Promise<AuthUser | null> {
        setStatus('loading')
        try {
            const nextUser = await api.getSession()
            setUser(nextUser)
            setBootstrapError(null)
            setStatus('authenticated')
            return nextUser
        } catch (error) {
            setUser(null)
            if (error instanceof api.ApiError && error.status === 401) {
                setBootstrapError(null)
            } else {
                setBootstrapError(api.getUserFacingErrorMessage(error, 'Unable to verify your session right now.'))
            }
            setStatus('unauthenticated')
            return null
        }
    }

    async function login(input: LoginInput): Promise<AuthUser> {
        const nextUser = await api.login(input)
        setUser(nextUser)
        setBootstrapError(null)
        setStatus('authenticated')
        return nextUser
    }

    async function signup(input: SignupInput): Promise<AuthUser> {
        const nextUser = await api.signup(input)
        setUser(nextUser)
        setBootstrapError(null)
        setStatus('authenticated')
        return nextUser
    }

    async function logout(): Promise<void> {
        try {
            await api.logout()
        } catch (error) {
            if (!api.isUnauthorizedError(error)) {
                throw error
            }
        }

        setUser(null)
        setBootstrapError(null)
        setStatus('unauthenticated')
    }

    function replaceUser(nextUser: AuthUser): void {
        setUser(nextUser)
        setBootstrapError(null)
        setStatus('authenticated')
    }

    useEffect(() => {
        let cancelled = false

        api.getSession()
            .then(nextUser => {
                if (cancelled) {
                    return
                }

                setUser(nextUser)
                setBootstrapError(null)
                setStatus('authenticated')
            })
            .catch((error: unknown) => {
                if (cancelled) {
                    return
                }

                setUser(null)
                if (error instanceof api.ApiError && error.status === 401) {
                    setBootstrapError(null)
                } else {
                    setBootstrapError(api.getUserFacingErrorMessage(error, 'Unable to verify your session right now.'))
                }
                setStatus('unauthenticated')
            })

        return () => {
            cancelled = true
        }
    }, [])

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            status,
            bootstrapError,
            login,
            signup,
            logout,
            refreshSession,
            replaceUser
        }),
        [bootstrapError, status, user]
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

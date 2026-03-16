import type { MetaFunction } from '@remix-run/node'
import { useEffect } from 'react'
import { useLocation, useNavigate } from '@remix-run/react'
import VehicleServiceApp from '../../src/App'
import { useAuth } from '../../src/auth/useAuth'

export const meta: MetaFunction = () => {
    return [{ title: 'Duralog' }, { name: 'description', content: 'Track vehicle maintenance and service history.' }]
}

export default function Index() {
    const auth = useAuth()
    const location = useLocation()
    const navigate = useNavigate()

    useEffect(() => {
        if (auth.status !== 'unauthenticated') {
            return
        }

        const redirectTo = `${location.pathname}${location.search}${location.hash}` || '/'
        navigate(`/login?redirectTo=${encodeURIComponent(redirectTo)}`, { replace: true })
    }, [auth.status, location.hash, location.pathname, location.search, navigate])

    if (auth.status === 'loading') {
        return <div className='grid min-h-screen place-items-center text-slate-600'>Checking your session…</div>
    }

    if (!auth.user) {
        return <div className='grid min-h-screen place-items-center text-slate-600'>Redirecting to login…</div>
    }

    return <VehicleServiceApp currentUser={auth.user} onLogout={auth.logout} />
}

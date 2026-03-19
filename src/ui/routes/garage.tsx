import type { MetaFunction } from '@remix-run/node'
import { useEffect } from 'react'
import { useLocation, useNavigate } from '@remix-run/react'

import VehicleServiceApp from '../App.js'
import BrandedLoadingScreen from '../components/BrandedLoadingScreen'
import { useAuth } from '../auth/useAuth.js'

export const meta: MetaFunction = () => {
    return [{ title: 'Garage | Duralog' }, { name: 'description', content: 'Manage your vehicles in Duralog.' }]
}

export default function GarageRoute() {
    const auth = useAuth()
    const location = useLocation()
    const navigate = useNavigate()

    useEffect(() => {
        if (auth.status !== 'unauthenticated') {
            return
        }

        const redirectTo = `${location.pathname}${location.search}${location.hash}` || '/garage'
        navigate(`/login?redirectTo=${encodeURIComponent(redirectTo)}`, { replace: true })
    }, [auth.status, location.hash, location.pathname, location.search, navigate])

    if (auth.status === 'loading') {
        return <BrandedLoadingScreen message='Checking your session…' />
    }

    if (!auth.user) {
        return <div className='grid min-h-screen place-items-center text-muted-foreground'>Redirecting to login…</div>
    }

    return <VehicleServiceApp currentUser={auth.user} onLogout={auth.logout} />
}

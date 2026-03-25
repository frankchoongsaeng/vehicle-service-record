import type { MetaFunction } from '@remix-run/node'
import { useEffect } from 'react'
import { useLocation, useNavigate, useOutlet } from '@remix-run/react'

import VehicleServiceApp from '../App.js'
import { buildOnboardingUrl, hasCompletedOnboarding } from '../auth/onboarding.js'
import BrandedLoadingScreen from '../components/BrandedLoadingScreen'
import { useAuth } from '../auth/useAuth.js'

export const meta: MetaFunction = () => {
    return [{ title: 'Garage | Duralog' }, { name: 'description', content: 'Manage your vehicles in Duralog.' }]
}

export default function GarageRoute() {
    const auth = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const outlet = useOutlet()

    useEffect(() => {
        if (auth.status === 'loading') {
            return
        }

        const redirectTo = `${location.pathname}${location.search}${location.hash}` || '/garage'

        if (auth.status === 'unauthenticated') {
            navigate(`/login?redirectTo=${encodeURIComponent(redirectTo)}`, { replace: true })
            return
        }

        if (!hasCompletedOnboarding(auth.user)) {
            navigate(buildOnboardingUrl(redirectTo), { replace: true })
        }
    }, [auth.status, auth.user, location.hash, location.pathname, location.search, navigate])

    if (outlet) {
        return outlet
    }

    if (auth.status === 'loading') {
        return <BrandedLoadingScreen message='Checking your session…' />
    }

    if (!auth.user) {
        return <div className='grid min-h-screen place-items-center text-muted-foreground'>Redirecting to login…</div>
    }

    if (!hasCompletedOnboarding(auth.user)) {
        return (
            <div className='grid min-h-screen place-items-center text-muted-foreground'>Redirecting to onboarding…</div>
        )
    }

    return <VehicleServiceApp currentUser={auth.user} onLogout={auth.logout} />
}

import type { MetaFunction } from '@remix-run/node'
import { useEffect } from 'react'
import { useLocation, useNavigate } from '@remix-run/react'
import BrandedLoadingScreen from '../components/BrandedLoadingScreen'
import { buildOnboardingUrl, hasCompletedOnboarding } from '../auth/onboarding.js'
import LandingPage from '../components/LandingPage.js'
import { useAuth } from '../auth/useAuth.js'

export const meta: MetaFunction = () => {
    return [
        { title: 'Duralog — Vehicle Maintenance Tracking' },
        {
            name: 'description',
            content:
                'Track maintenance, plan service, and keep your vehicles running smoothly. Service records, maintenance plans, and workshop management in one place.'
        }
    ]
}

export default function Index() {
    const auth = useAuth()
    const location = useLocation()
    const navigate = useNavigate()

    useEffect(() => {
        if (auth.status === 'authenticated') {
            if (!hasCompletedOnboarding(auth.user)) {
                const redirectTo = `${location.pathname}${location.search}${location.hash}` || '/garage'
                navigate(buildOnboardingUrl(redirectTo), { replace: true })
                return
            }

            navigate('/garage', { replace: true })
        }
    }, [auth.status, auth.user, location.hash, location.pathname, location.search, navigate])

    if (auth.status === 'loading') {
        return <BrandedLoadingScreen message='Checking your session…' />
    }

    if (auth.status === 'authenticated') {
        return <div className='grid min-h-screen place-items-center text-muted-foreground'>Redirecting…</div>
    }

    return <LandingPage />
}

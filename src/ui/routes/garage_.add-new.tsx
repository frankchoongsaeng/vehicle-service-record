import type { MetaFunction } from '@remix-run/node'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from '@remix-run/react'

import * as api from '../api/client.js'
import { buildOnboardingUrl, hasCompletedOnboarding } from '../auth/onboarding.js'
import { useAuth } from '../auth/useAuth.js'
import BrandedLoadingScreen from '../components/BrandedLoadingScreen'
import { AuthenticatedShell } from '../components/AuthenticatedShell'
import VehicleForm from '../components/VehicleForm.js'
import { fallbackVehicleTypeImage, getVehicleTypeImage } from '../lib/vehicleTypes.js'
import type { VehicleInput } from '../types/index.js'

export const meta: MetaFunction = () => {
    return [
        { title: 'Add New Vehicle | Duralog' },
        { name: 'description', content: 'Add a new vehicle to your Duralog garage.' }
    ]
}

export default function AddNewVehicleRoute() {
    const auth = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const [selectedVehicleType, setSelectedVehicleType] = useState('')

    const heroImage = getVehicleTypeImage(selectedVehicleType)

    useEffect(() => {
        if (auth.status === 'loading') {
            return
        }

        const redirectTo = `${location.pathname}${location.search}${location.hash}` || '/garage/add-new'

        if (auth.status === 'unauthenticated') {
            navigate(`/login?redirectTo=${encodeURIComponent(redirectTo)}`, { replace: true })
            return
        }

        if (!hasCompletedOnboarding(auth.user)) {
            navigate(buildOnboardingUrl(redirectTo), { replace: true })
        }
    }, [auth.status, auth.user, location.hash, location.pathname, location.search, navigate])

    const handleSubmitVehicle = async (data: VehicleInput) => {
        await api.createVehicle(data)
        navigate('/garage', { replace: true })
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

    return (
        <AuthenticatedShell currentUser={auth.user} onLogout={auth.logout}>
            <div className='space-y-6'>
                <div className='relative h-56 overflow-hidden sm:h-72 lg:h-88'>
                    <img
                        src={heroImage}
                        alt=''
                        aria-hidden='true'
                        className='h-full w-full object-contain object-center'
                        onError={event => {
                            if (event.currentTarget.src.endsWith(fallbackVehicleTypeImage)) {
                                return
                            }

                            event.currentTarget.src = fallbackVehicleTypeImage
                        }}
                    />
                </div>
                <VehicleForm
                    layout='feature'
                    onSubmit={handleSubmitVehicle}
                    onCancel={() => navigate('/garage')}
                    onVehicleTypeChange={setSelectedVehicleType}
                />
            </div>
        </AuthenticatedShell>
    )
}

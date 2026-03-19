import type { MetaFunction } from '@remix-run/node'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from '@remix-run/react'

import * as api from '../api/client.js'
import { useAuth } from '../auth/useAuth.js'
import BrandedLoadingScreen from '../components/BrandedLoadingScreen'
import { AuthenticatedShell } from '../components/AuthenticatedShell'
import VehicleForm from '../components/VehicleForm.js'
import type { VehicleInput } from '../types/index.js'

export const meta: MetaFunction = () => {
    return [
        { title: 'Add New Vehicle | Duralog' },
        { name: 'description', content: 'Add a new vehicle to your Duralog garage.' }
    ]
}

const fallbackVehicleImage = '/images/add-car.png'
const vehicleTypeImages: Record<string, string> = {
    atv: '/images/add-atv.png',
    car: '/images/add-car.png',
    motorcycle: '/images/add-motorcycle.png',
    scooter: '/images/add-scooter.png',
    suv: '/images/add-suv.png',
    truck: '/images/add-truck.webp',
    utv: '/images/add-utv.png',
    van: '/images/add-van.png'
}

function getVehicleTypeImage(vehicleType: string): string {
    const normalizedVehicleType = vehicleType.trim().toLowerCase().replace(/\s+/g, '-')
    return vehicleTypeImages[normalizedVehicleType] ?? fallbackVehicleImage
}

export default function AddNewVehicleRoute() {
    const auth = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const [selectedVehicleType, setSelectedVehicleType] = useState('')

    const heroImage = getVehicleTypeImage(selectedVehicleType)

    useEffect(() => {
        if (auth.status !== 'unauthenticated') {
            return
        }

        const redirectTo = `${location.pathname}${location.search}${location.hash}` || '/garage/add-new'
        navigate(`/login?redirectTo=${encodeURIComponent(redirectTo)}`, { replace: true })
    }, [auth.status, location.hash, location.pathname, location.search, navigate])

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
                            if (event.currentTarget.src.endsWith(fallbackVehicleImage)) {
                                return
                            }

                            event.currentTarget.src = fallbackVehicleImage
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

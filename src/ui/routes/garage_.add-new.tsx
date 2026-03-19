import type { MetaFunction } from '@remix-run/node'
import { useEffect } from 'react'
import { useLocation, useNavigate } from '@remix-run/react'

import * as api from '../api/client.js'
import { useAuth } from '../auth/useAuth.js'
import BrandedLoadingScreen from '../components/BrandedLoadingScreen'
import { AuthenticatedShell } from '../components/AuthenticatedShell'
import { PageHeader } from '../components/PageHeader'
import VehicleForm from '../components/VehicleForm.js'
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
                <PageHeader
                    eyebrow='Garage'
                    title='Add new vehicle'
                    description='Create a new vehicle profile to start tracking its service history.'
                />

                <VehicleForm onSubmit={handleSubmitVehicle} onCancel={() => navigate('/garage')} />
            </div>
        </AuthenticatedShell>
    )
}

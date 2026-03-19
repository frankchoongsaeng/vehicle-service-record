import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from '@remix-run/react'
import type { AuthUser, Vehicle, VehicleInput } from './types/index.js'
import * as api from './api/client.js'
import { Button } from './components/ui/button.js'
import { Card, CardContent } from './components/ui/card.js'
import Logo from './components/ui/logo.js'
import VehicleList from './components/VehicleList.js'
import VehicleForm from './components/VehicleForm.js'

type View = { type: 'vehicles' } | { type: 'vehicle-form'; vehicle?: Vehicle }

type AppProps = {
    currentUser: AuthUser
    onLogout: () => Promise<void>
}

type ViewQuery = 'vehicles' | 'vehicle-form'

const viewQueryValues: ReadonlySet<ViewQuery> = new Set(['vehicles', 'vehicle-form'])

function parsePositiveInt(value: string | null): number | null {
    if (!value) {
        return null
    }

    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed < 1) {
        return null
    }

    return parsed
}

function buildSearchParams(view: View): URLSearchParams {
    const params = new URLSearchParams()
    params.set('view', view.type)

    if (view.type === 'vehicle-form' && view.vehicle) {
        params.set('vehicleId', String(view.vehicle.id))
    }

    return params
}

export default function App({ currentUser, onLogout }: AppProps) {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const [view, setView] = useState<View>({ type: 'vehicles' })
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [loadingVehicles, setLoadingVehicles] = useState(true)
    const [error, setError] = useState('')
    const [loggingOut, setLoggingOut] = useState(false)

    // Load vehicles on mount
    useEffect(() => {
        api.getVehicles()
            .then(setVehicles)
            .catch(() => setError('Could not connect to the server. Make sure the backend is running.'))
            .finally(() => setLoadingVehicles(false))
    }, [])

    const setViewAndSyncUrl = useCallback(
        (nextView: View) => {
            setView(nextView)

            const nextParams = buildSearchParams(nextView)
            if (nextParams.toString() !== searchParams.toString()) {
                setSearchParams(nextParams)
            }
        },
        [searchParams, setSearchParams]
    )

    useEffect(() => {
        if (loadingVehicles) {
            return
        }

        const requestedView = searchParams.get('view')
        const isKnownView = requestedView && viewQueryValues.has(requestedView as ViewQuery)
        const viewType: ViewQuery = isKnownView ? (requestedView as ViewQuery) : 'vehicles'

        const vehicleId = parsePositiveInt(searchParams.get('vehicleId'))
        const selectedVehicle = vehicleId ? vehicles.find(vehicle => vehicle.id === vehicleId) : undefined

        let nextView: View = { type: 'vehicles' }

        if (viewType === 'vehicle-form') {
            nextView = selectedVehicle ? { type: 'vehicle-form', vehicle: selectedVehicle } : { type: 'vehicle-form' }
        }

        if (
            nextView.type !== view.type ||
            (nextView.type === 'vehicle-form' &&
                view.type === 'vehicle-form' &&
                nextView.vehicle?.id !== view.vehicle?.id)
        ) {
            setView(nextView)
        }

        const canonicalParams = buildSearchParams(nextView)
        if (canonicalParams.toString() !== searchParams.toString()) {
            setSearchParams(canonicalParams, { replace: true })
        }
    }, [loadingVehicles, searchParams, setSearchParams, vehicles, view])

    // ── Vehicle handlers ───────────────────────────────────────────────────────

    const handleSelectVehicle = (v: Vehicle) => {
        navigate(`/garage/${v.id}/records`)
    }

    const handleAddVehicle = () => setViewAndSyncUrl({ type: 'vehicle-form' })

    const handleEditVehicle = (v: Vehicle) => setViewAndSyncUrl({ type: 'vehicle-form', vehicle: v })

    const handleDeleteVehicle = async (v: Vehicle) => {
        if (!confirm(`Delete ${v.year} ${v.make} ${v.model} and all its service records?`)) return
        try {
            await api.deleteVehicle(v.id)
            setVehicles(prev => prev.filter(x => x.id !== v.id))
        } catch {
            setError('Failed to delete vehicle.')
        }
    }

    const handleSubmitVehicle = async (data: VehicleInput) => {
        if (view.type !== 'vehicle-form') return
        if (view.vehicle) {
            const updated = await api.updateVehicle(view.vehicle.id, data)
            setVehicles(prev => prev.map(v => (v.id === updated.id ? updated : v)))
        } else {
            const created = await api.createVehicle(data)
            setVehicles(prev => [...prev, created])
        }
        setViewAndSyncUrl({ type: 'vehicles' })
    }

    const handleLogout = async () => {
        try {
            setLoggingOut(true)
            await onLogout()
        } catch {
            setError('Failed to sign out.')
        } finally {
            setLoggingOut(false)
        }
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className='min-h-screen bg-background'>
            <nav className='border-b bg-background'>
                <div className='mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6'>
                    <Button
                        variant='ghost'
                        className='h-auto p-0 text-base font-semibold text-foreground hover:bg-transparent'
                        onClick={() => setViewAndSyncUrl({ type: 'vehicles' })}
                    >
                        <span className='flex items-center gap-3'>
                            <span className='h-9 w-9 text-foreground'>
                                <Logo className='h-full w-full' />
                            </span>
                            <span className='text-lg font-semibold tracking-tight'>Duralog</span>
                        </span>
                    </Button>
                    <div className='flex items-center gap-3'>
                        <span className='text-sm text-muted-foreground'>{currentUser.email}</span>
                        <Button variant='secondary' onClick={handleLogout} disabled={loggingOut}>
                            {loggingOut ? 'Signing out…' : 'Sign out'}
                        </Button>
                    </div>
                </div>
            </nav>

            {error && (
                <div className='mx-auto max-w-6xl px-4 pt-4 sm:px-6'>
                    <Card className='border-destructive/30 bg-destructive/10 shadow-none'>
                        <CardContent className='flex items-center justify-between p-3 text-sm text-destructive'>
                            <span>{error}</span>
                            <Button variant='ghost' size='sm' onClick={() => setError('')}>
                                Dismiss
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            <main className='mx-auto w-full max-w-6xl px-4 py-6 sm:px-6'>
                {view.type === 'vehicles' &&
                    (loadingVehicles ? (
                        <div className='py-16 text-center text-muted-foreground'>Loading vehicles…</div>
                    ) : (
                        <VehicleList
                            vehicles={vehicles}
                            onSelect={handleSelectVehicle}
                            onEdit={handleEditVehicle}
                            onDelete={handleDeleteVehicle}
                            onAdd={handleAddVehicle}
                        />
                    ))}

                {view.type === 'vehicle-form' && (
                    <VehicleForm
                        initial={view.vehicle}
                        onSubmit={handleSubmitVehicle}
                        onCancel={() => setViewAndSyncUrl({ type: 'vehicles' })}
                    />
                )}
            </main>
        </div>
    )
}

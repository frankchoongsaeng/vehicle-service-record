import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from '@remix-run/react'
import { CarFront, FolderClock, Gauge, Plus } from 'lucide-react'
import type { AuthUser, Vehicle, VehicleInput } from './types/index.js'
import * as api from './api/client.js'
import { Button } from './components/ui/button.js'
import { Card, CardContent } from './components/ui/card.js'
import { AuthenticatedShell } from './components/AuthenticatedShell.js'
import { PageHeader } from './components/PageHeader.js'
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

function mergeViewSearchParams(existingParams: URLSearchParams, view: View): URLSearchParams {
    const params = new URLSearchParams(existingParams)
    const viewParams = buildSearchParams(view)

    params.delete('view')
    params.delete('vehicleId')

    for (const [key, value] of viewParams.entries()) {
        params.set(key, value)
    }

    return params
}

export default function App({ currentUser, onLogout }: AppProps) {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [loadingVehicles, setLoadingVehicles] = useState(true)
    const [error, setError] = useState('')

    // Load vehicles on mount
    useEffect(() => {
        api.getVehicles()
            .then(setVehicles)
            .catch(() => setError('Could not connect to the server. Make sure the backend is running.'))
            .finally(() => setLoadingVehicles(false))
    }, [])

    const setViewAndSyncUrl = useCallback(
        (nextView: View) => {
            const nextParams = mergeViewSearchParams(searchParams, nextView)
            if (nextParams.toString() !== searchParams.toString()) {
                setSearchParams(nextParams)
            }
        },
        [searchParams, setSearchParams]
    )

    const view = useMemo<View>(() => {
        const requestedView = searchParams.get('view')
        const isKnownView = requestedView && viewQueryValues.has(requestedView as ViewQuery)
        const viewType: ViewQuery = isKnownView ? (requestedView as ViewQuery) : 'vehicles'

        const vehicleId = parsePositiveInt(searchParams.get('vehicleId'))
        const selectedVehicle = vehicleId ? vehicles.find(vehicle => vehicle.id === vehicleId) : undefined

        if (viewType === 'vehicle-form') {
            return selectedVehicle ? { type: 'vehicle-form', vehicle: selectedVehicle } : { type: 'vehicle-form' }
        }

        return { type: 'vehicles' }
    }, [searchParams, vehicles])

    useEffect(() => {
        if (loadingVehicles) {
            return
        }

        const canonicalParams = mergeViewSearchParams(searchParams, view)
        if (canonicalParams.toString() !== searchParams.toString()) {
            setSearchParams(canonicalParams, { replace: true })
        }
    }, [loadingVehicles, searchParams, setSearchParams, view])

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

    const vehiclesWithMileage = vehicles.filter(vehicle => vehicle.mileage != null)
    const highestMileage = vehiclesWithMileage.length
        ? Math.max(...vehiclesWithMileage.map(vehicle => vehicle.mileage ?? 0)).toLocaleString()
        : '0'
    const vehiclesNeedingDetails = vehicles.filter(vehicle => !vehicle.vin || !vehicle.color).length

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <AuthenticatedShell currentUser={currentUser} onLogout={onLogout}>
            {error && (
                <Card className='mb-6 border-destructive/30 bg-destructive/10 shadow-none'>
                    <CardContent className='flex items-center justify-between p-3 text-sm text-destructive'>
                        <span>{error}</span>
                        <Button variant='ghost' size='sm' onClick={() => setError('')}>
                            Dismiss
                        </Button>
                    </CardContent>
                </Card>
            )}

            <div className='space-y-6'>
                <PageHeader
                    eyebrow='Garage overview'
                    title='Your vehicles, service-ready and easier to scan.'
                    description='Keep vehicle details complete, jump into records quickly, and add new entries without bouncing through disconnected screens.'
                    actions={
                        <>
                            <Button asChild variant='outline'>
                                <Link to='/dashboard'>Open Dashboard</Link>
                            </Button>
                            <Button onClick={handleAddVehicle}>
                                <Plus className='h-4 w-4' />
                                Add Vehicle
                            </Button>
                        </>
                    }
                >
                    <div className='grid gap-3 md:grid-cols-3'>
                        <Card className='shadow-none'>
                            <CardContent className='flex items-start gap-3 p-4'>
                                <div className='rounded-xl border bg-secondary/50 p-2'>
                                    <CarFront className='h-4 w-4' />
                                </div>
                                <div>
                                    <p className='text-sm text-muted-foreground'>Tracked vehicles</p>
                                    <p className='mt-1 text-2xl font-semibold text-foreground'>{vehicles.length}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className='shadow-none'>
                            <CardContent className='flex items-start gap-3 p-4'>
                                <div className='rounded-xl border bg-secondary/50 p-2'>
                                    <Gauge className='h-4 w-4' />
                                </div>
                                <div>
                                    <p className='text-sm text-muted-foreground'>Highest recorded mileage</p>
                                    <p className='mt-1 text-2xl font-semibold text-foreground'>{highestMileage}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className='shadow-none'>
                            <CardContent className='flex items-start gap-3 p-4'>
                                <div className='rounded-xl border bg-secondary/50 p-2'>
                                    <FolderClock className='h-4 w-4' />
                                </div>
                                <div>
                                    <p className='text-sm text-muted-foreground'>Profiles missing details</p>
                                    <p className='mt-1 text-2xl font-semibold text-foreground'>
                                        {vehiclesNeedingDetails}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </PageHeader>

                <main>
                    {view.type === 'vehicles' &&
                        (loadingVehicles ? (
                            <Card>
                                <CardContent className='py-16 text-center text-muted-foreground'>
                                    Loading vehicles…
                                </CardContent>
                            </Card>
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
        </AuthenticatedShell>
    )
}

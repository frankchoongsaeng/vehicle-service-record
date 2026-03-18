import { useState, useEffect, useCallback } from 'react'
import type { AuthUser, Vehicle, ServiceRecord, VehicleInput, ServiceRecordInput } from './types/index.js'
import * as api from './api/client.js'
import { Button } from './components/ui/button.js'
import { Card, CardContent } from './components/ui/card.js'
import Logo from './components/ui/logo.js'
import VehicleList from './components/VehicleList.js'
import VehicleForm from './components/VehicleForm.js'
import ServiceRecordList from './components/ServiceRecordList.js'
import ServiceRecordForm from './components/ServiceRecordForm.js'

type View =
    | { type: 'vehicles' }
    | { type: 'vehicle-form'; vehicle?: Vehicle }
    | { type: 'records'; vehicle: Vehicle }
    | { type: 'record-form'; vehicle: Vehicle; record?: ServiceRecord }

type AppProps = {
    currentUser: AuthUser
    onLogout: () => Promise<void>
}

export default function App({ currentUser, onLogout }: AppProps) {
    const [view, setView] = useState<View>({ type: 'vehicles' })
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [records, setRecords] = useState<ServiceRecord[]>([])
    const [loadingVehicles, setLoadingVehicles] = useState(true)
    const [loadingRecords, setLoadingRecords] = useState(false)
    const [error, setError] = useState('')
    const [loggingOut, setLoggingOut] = useState(false)

    // Load vehicles on mount
    useEffect(() => {
        api.getVehicles()
            .then(setVehicles)
            .catch(() => setError('Could not connect to the server. Make sure the backend is running.'))
            .finally(() => setLoadingVehicles(false))
    }, [])

    // Load records when a vehicle is selected
    const loadRecords = useCallback((vehicleId: number) => {
        setLoadingRecords(true)
        api.getRecords(vehicleId)
            .then(setRecords)
            .catch(() => setError('Failed to load service records.'))
            .finally(() => setLoadingRecords(false))
    }, [])

    // ── Vehicle handlers ───────────────────────────────────────────────────────

    const handleSelectVehicle = (v: Vehicle) => {
        setView({ type: 'records', vehicle: v })
        loadRecords(v.id)
    }

    const handleAddVehicle = () => setView({ type: 'vehicle-form' })

    const handleEditVehicle = (v: Vehicle) => setView({ type: 'vehicle-form', vehicle: v })

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
        setView({ type: 'vehicles' })
    }

    // ── Record handlers ────────────────────────────────────────────────────────

    const handleAddRecord = () => {
        if (view.type !== 'records') return
        setView({ type: 'record-form', vehicle: view.vehicle })
    }

    const handleEditRecord = (r: ServiceRecord) => {
        if (view.type !== 'records') return
        setView({ type: 'record-form', vehicle: view.vehicle, record: r })
    }

    const handleDeleteRecord = async (r: ServiceRecord) => {
        if (view.type !== 'records') return
        if (!confirm('Delete this service record?')) return
        try {
            await api.deleteRecord(view.vehicle.id, r.id)
            setRecords(prev => prev.filter(x => x.id !== r.id))
        } catch {
            setError('Failed to delete service record.')
        }
    }

    const handleSubmitRecord = async (data: ServiceRecordInput) => {
        if (view.type !== 'record-form') return
        const { vehicle, record } = view
        if (record) {
            const updated = await api.updateRecord(vehicle.id, record.id, data)
            setRecords(prev => prev.map(r => (r.id === updated.id ? updated : r)))
        } else {
            const created = await api.createRecord(vehicle.id, data)
            setRecords(prev => [created, ...prev])
        }
        setView({ type: 'records', vehicle })
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
                        onClick={() => setView({ type: 'vehicles' })}
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
                        onCancel={() => setView({ type: 'vehicles' })}
                    />
                )}

                {view.type === 'records' &&
                    (loadingRecords ? (
                        <div className='py-16 text-center text-muted-foreground'>Loading records…</div>
                    ) : (
                        <ServiceRecordList
                            vehicle={view.vehicle}
                            records={records}
                            onAdd={handleAddRecord}
                            onEdit={handleEditRecord}
                            onDelete={handleDeleteRecord}
                            onBack={() => setView({ type: 'vehicles' })}
                        />
                    ))}

                {view.type === 'record-form' && (
                    <ServiceRecordForm
                        initial={view.record}
                        onSubmit={handleSubmitRecord}
                        onCancel={() => setView({ type: 'records', vehicle: view.vehicle })}
                    />
                )}
            </main>
        </div>
    )
}

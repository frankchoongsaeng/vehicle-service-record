import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'

import { Badge } from './ui/badge.js'
import { Button } from './ui/button.js'
import { Card, CardContent } from './ui/card.js'
import type { ServiceRecord, Vehicle } from '../types/index.js'
import { SERVICE_TYPES } from '../types/index.js'

interface Props {
    vehicle: Vehicle
    records: ServiceRecord[]
    onAdd: () => void
    onEdit: (record: ServiceRecord) => void
    onDelete: (record: ServiceRecord) => void
    onBack: () => void
}

const serviceLabel = (value: string) => SERVICE_TYPES.find(t => t.value === value)?.label ?? value

const SERVICE_ICONS: Record<string, string> = {
    oil_change: '🛢️',
    tire_rotation: '🔄',
    brake_service: '🛑',
    tire_replacement: '🔵',
    battery: '🔋',
    air_filter: '💨',
    cabin_filter: '🌬️',
    transmission: '⚙️',
    coolant: '❄️',
    spark_plugs: '⚡',
    timing_belt: '🔗',
    wiper_blades: '🌧️',
    inspection: '🔍',
    other: '🔧'
}

export default function ServiceRecordList({ vehicle, records, onAdd, onEdit, onDelete, onBack }: Props) {
    return (
        <div className='space-y-5'>
            <header className='flex flex-wrap items-start justify-between gap-3'>
                <div className='flex flex-wrap items-start gap-3'>
                    <Button variant='outline' onClick={onBack}>
                        <ArrowLeft className='h-4 w-4' />
                        Back
                    </Button>
                    <div>
                        <h1 className='text-2xl font-semibold text-foreground'>
                            {vehicle.year} {vehicle.make} {vehicle.model}
                        </h1>
                        <p className='mt-1 text-sm text-muted-foreground'>
                            {vehicle.color && `${vehicle.color} · `}
                            {vehicle.mileage != null && `${vehicle.mileage.toLocaleString()} mi`}
                        </p>
                    </div>
                </div>
                <Button onClick={onAdd}>
                    <Plus className='h-4 w-4' />
                    Add Record
                </Button>
            </header>

            {records.length === 0 ? (
                <Card>
                    <CardContent className='flex flex-col items-center gap-3 py-12 text-center'>
                        <p className='text-lg font-semibold text-foreground'>No service records yet</p>
                        <p className='max-w-md text-sm text-muted-foreground'>
                            Start tracking maintenance and repairs for this vehicle.
                        </p>
                        <Button onClick={onAdd}>
                            <Plus className='h-4 w-4' />
                            Add Record
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className='space-y-3'>
                    {records.map(r => (
                        <Card key={r.id}>
                            <CardContent className='grid grid-cols-[2rem_1fr_auto] items-start gap-3 p-4 sm:grid-cols-[2.5rem_1fr_auto]'>
                                <div className='pt-0.5 text-xl'>{SERVICE_ICONS[r.service_type] ?? '🔧'}</div>
                                <div>
                                    <div className='flex flex-wrap items-center justify-between gap-2'>
                                        <span className='font-semibold text-foreground'>
                                            {serviceLabel(r.service_type)}
                                        </span>
                                        <span className='text-sm text-muted-foreground'>
                                            {new Date(r.date + 'T00:00:00').toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                    <p className='mt-1 text-sm text-foreground'>{r.description}</p>

                                    <div className='mt-2 flex flex-wrap gap-2'>
                                        {r.mileage != null && (
                                            <Badge variant='secondary'>Mileage: {r.mileage.toLocaleString()} mi</Badge>
                                        )}
                                        {r.cost != null && (
                                            <Badge variant='secondary'>Cost: ${r.cost.toFixed(2)}</Badge>
                                        )}
                                    </div>

                                    {r.notes && <p className='mt-2 text-sm italic text-muted-foreground'>{r.notes}</p>}
                                </div>

                                <div className='flex gap-2'>
                                    <Button
                                        variant='outline'
                                        size='icon'
                                        title='Edit record'
                                        onClick={() => onEdit(r)}
                                        aria-label='Edit record'
                                    >
                                        <Pencil className='h-4 w-4' />
                                    </Button>
                                    <Button
                                        variant='outline'
                                        size='icon'
                                        title='Delete record'
                                        onClick={() => onDelete(r)}
                                        aria-label='Delete record'
                                        className='text-destructive hover:bg-destructive/10 hover:text-destructive'
                                    >
                                        <Trash2 className='h-4 w-4' />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}

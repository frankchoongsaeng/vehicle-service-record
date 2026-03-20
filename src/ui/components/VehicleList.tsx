import { Pencil, Trash2 } from 'lucide-react'

import { fallbackVehicleTypeImage, getVehicleTypeImage } from '../lib/vehicleTypes.js'
import { Badge } from './ui/badge.js'
import { Button } from './ui/button.js'
import { Card, CardContent } from './ui/card.js'
import type { Vehicle } from '../types/index.js'

interface Props {
    vehicles: Vehicle[]
    onSelect: (vehicle: Vehicle) => void
    onEdit: (vehicle: Vehicle) => void
    onDelete: (vehicle: Vehicle) => void
}

export default function VehicleList({ vehicles, onSelect, onEdit, onDelete }: Props) {
    return (
        <div className='flex flex-col gap-5'>
            {vehicles.length === 0 ? (
                <div className='flex flex-col items-center gap-3 py-12 text-center'>
                    <p className='text-lg font-semibold text-foreground'>No vehicles yet</p>
                    <p className='max-w-md text-sm text-muted-foreground'>
                        Add your first vehicle to start building a cleaner maintenance history.
                    </p>
                </div>
            ) : (
                <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                    {vehicles.map(v => (
                        <Card
                            key={v.id}
                            className='cursor-pointer transition-all hover:border-ring/50 hover:-translate-y-0.5 hover:shadow-md'
                            onClick={() => onSelect(v)}
                            role='button'
                            tabIndex={0}
                            onKeyDown={e => e.key === 'Enter' && onSelect(v)}
                        >
                            <CardContent className='grid grid-cols-[minmax(0,1fr)_7rem] gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_9rem]'>
                                <div className='flex min-w-0 flex-col gap-3'>
                                    <div>
                                        <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                                            {v.year}
                                        </p>
                                        <p className='text-lg font-semibold text-foreground'>
                                            {v.make} {v.model}
                                        </p>
                                    </div>

                                    <div className='flex flex-wrap gap-2'>
                                        {v.vehicleType && <Badge variant='secondary'>{v.vehicleType}</Badge>}
                                        {v.color && <Badge variant='secondary'>Color: {v.color}</Badge>}
                                        {v.mileage != null && (
                                            <Badge variant='secondary'>{v.mileage.toLocaleString()} mi</Badge>
                                        )}
                                    </div>

                                    <p className='truncate text-xs text-muted-foreground' title={v.vin ?? 'N/A'}>
                                        VIN: {v.vin ?? 'N/A'}
                                    </p>

                                    <div className='flex flex-wrap justify-start gap-2' onClick={e => e.stopPropagation()}>
                                        <Button
                                            variant='default'
                                            size='sm'
                                            title='Update vehicle'
                                            onClick={() => onEdit(v)}
                                            aria-label='Update vehicle'
                                            className='shadow-none'
                                        >
                                            <Pencil data-icon='inline-start' />
                                            Update
                                        </Button>
                                        <Button
                                            variant='destructive'
                                            size='sm'
                                            title='Delete vehicle'
                                            onClick={() => onDelete(v)}
                                            aria-label='Delete vehicle'
                                            className='shadow-none'
                                        >
                                            <Trash2 data-icon='inline-start' />
                                            Delete
                                        </Button>
                                    </div>
                                </div>

                                <div className='overflow-hidden rounded-lg border bg-muted/30'>
                                    <img
                                        src={v.imageUrl ?? getVehicleTypeImage(v.vehicleType)}
                                        alt={`${v.year} ${v.make} ${v.model}`}
                                        data-fallback-src={getVehicleTypeImage(v.vehicleType)}
                                        className='h-full min-h-28 w-full object-cover'
                                        loading='lazy'
                                        onError={event => {
                                            const fallbackSrc = event.currentTarget.dataset.fallbackSrc

                                            if (!fallbackSrc) {
                                                return
                                            }

                                            if (event.currentTarget.src.endsWith(fallbackSrc)) {
                                                if (fallbackSrc !== fallbackVehicleTypeImage) {
                                                    event.currentTarget.src = fallbackVehicleTypeImage
                                                }

                                                return
                                            }

                                            event.currentTarget.src = fallbackSrc
                                        }}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}

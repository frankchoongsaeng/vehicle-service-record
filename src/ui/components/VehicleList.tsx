import { Pencil, Plus, Trash2 } from 'lucide-react'

import { Badge } from './ui/badge.js'
import { Button } from './ui/button.js'
import { Card, CardContent } from './ui/card.js'
import type { Vehicle } from '../types/index.js'

interface Props {
    vehicles: Vehicle[]
    onSelect: (vehicle: Vehicle) => void
    onEdit: (vehicle: Vehicle) => void
    onDelete: (vehicle: Vehicle) => void
    onAdd: () => void
}

export default function VehicleList({ vehicles, onSelect, onEdit, onDelete, onAdd }: Props) {
    return (
        <div className='space-y-5'>
            <header className='flex flex-wrap items-start justify-between gap-3'>
                <div>
                    <h1 className='text-2xl font-semibold text-slate-900'>My Vehicles</h1>
                    <p className='mt-1 text-sm text-slate-600'>Select a vehicle to view its service history.</p>
                </div>
                <Button onClick={onAdd}>
                    <Plus className='h-4 w-4' />
                    Add Vehicle
                </Button>
            </header>

            {vehicles.length === 0 ? (
                <Card>
                    <CardContent className='flex flex-col items-center gap-3 py-12 text-center'>
                        <p className='text-lg font-semibold text-slate-800'>No vehicles yet</p>
                        <p className='max-w-md text-sm text-slate-600'>
                            Add your first vehicle to start tracking service records.
                        </p>
                        <Button onClick={onAdd}>
                            <Plus className='h-4 w-4' />
                            Add Vehicle
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                    {vehicles.map(v => (
                        <Card
                            key={v.id}
                            className='cursor-pointer border-slate-200 transition-all hover:border-slate-300 hover:shadow-md'
                            onClick={() => onSelect(v)}
                            role='button'
                            tabIndex={0}
                            onKeyDown={e => e.key === 'Enter' && onSelect(v)}
                        >
                            <CardContent className='space-y-3 p-4'>
                                <div>
                                    <p className='text-xs font-medium uppercase tracking-wide text-slate-500'>
                                        {v.year}
                                    </p>
                                    <p className='text-lg font-semibold text-slate-900'>
                                        {v.make} {v.model}
                                    </p>
                                </div>

                                <div className='flex flex-wrap gap-2'>
                                    {v.color && <Badge variant='neutral'>Color: {v.color}</Badge>}
                                    {v.mileage != null && (
                                        <Badge variant='neutral'>{v.mileage.toLocaleString()} mi</Badge>
                                    )}
                                </div>

                                {v.vin && (
                                    <p className='truncate text-xs text-slate-500' title={v.vin}>
                                        VIN: {v.vin}
                                    </p>
                                )}

                                <div className='flex justify-end gap-2' onClick={e => e.stopPropagation()}>
                                    <Button
                                        variant='outline'
                                        size='icon'
                                        title='Edit vehicle'
                                        onClick={() => onEdit(v)}
                                        aria-label='Edit vehicle'
                                    >
                                        <Pencil className='h-4 w-4' />
                                    </Button>
                                    <Button
                                        variant='outline'
                                        size='icon'
                                        title='Delete vehicle'
                                        onClick={() => onDelete(v)}
                                        aria-label='Delete vehicle'
                                        className='text-rose-700 hover:bg-rose-50 hover:text-rose-700'
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

import { Pencil, Trash2 } from 'lucide-react'

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
        <div className='space-y-5'>
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
                            <CardContent className='space-y-3 p-4'>
                                <div>
                                    <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                                        {v.year} vehicle profile
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

                                {v.vin && (
                                    <p className='truncate text-xs text-muted-foreground' title={v.vin}>
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

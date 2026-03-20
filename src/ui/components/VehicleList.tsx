import { EllipsisVertical, Pencil, Trash2 } from 'lucide-react'

import { fallbackVehicleTypeImage, getVehicleTypeImage } from '../lib/vehicleTypes.js'
import { Badge } from './ui/badge.js'
import { Button } from './ui/button.js'
import { Card, CardContent } from './ui/card.js'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger
} from './ui/dropdown-menu.js'
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
                            className='cursor-pointer overflow-hidden shadow-none transition-colors hover:border-ring/50'
                            onClick={() => onSelect(v)}
                            role='button'
                            tabIndex={0}
                            onKeyDown={e => e.key === 'Enter' && onSelect(v)}
                        >
                            <CardContent className='grid grid-cols-[minmax(0,1fr)_7rem] p-0 sm:grid-cols-[minmax(0,1fr)_9rem]'>
                                <div className='flex min-w-0 flex-col gap-3 p-4'>
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

                                </div>

                                <div
                                    className='flex h-full flex-col items-stretch'
                                    onClick={event => event.stopPropagation()}
                                >
                                    <div className='flex justify-end pr-2 pt-2'>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant='ghost'
                                                    size='icon'
                                                    aria-label={`Open actions for ${v.year} ${v.make} ${v.model}`}
                                                    className='text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground focus-visible:ring-0'
                                                >
                                                    <EllipsisVertical />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align='end'>
                                                <DropdownMenuGroup>
                                                    <DropdownMenuItem onClick={() => onEdit(v)}>
                                                        <Pencil />
                                                        Update
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => onDelete(v)}
                                                        className='text-destructive focus:text-destructive'
                                                    >
                                                        <Trash2 />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuGroup>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <div className='flex flex-1 items-center justify-center'>
                                    <img
                                        src={v.imageUrl ?? getVehicleTypeImage(v.vehicleType)}
                                        alt={`${v.year} ${v.make} ${v.model}`}
                                        data-fallback-src={getVehicleTypeImage(v.vehicleType)}
                                        className='block h-full min-h-28 w-full object-contain'
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
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}

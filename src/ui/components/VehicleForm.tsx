import { useState } from 'react'
import { Info } from 'lucide-react'

import { Button } from './ui/button.js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.js'
import { Input } from './ui/input.js'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select.js'
import { Textarea } from './ui/textarea.js'
import type { Vehicle, VehicleInput } from '../types/index.js'

const vinHelperText = 'Add the VIN to help us auto-fill the rest of the vehicle details for you.'
const transmissionOptions = ['Automatic', 'Manual', 'CVT', 'Dual-clutch', 'Semi-automatic'] as const
const fuelTypeOptions = ['Gasoline', 'Diesel', 'Hybrid', 'Plug-in Hybrid', 'Electric', 'Flex Fuel'] as const
const vehicleTypeOptions = [
    'Car',
    'SUV',
    'Truck',
    'Van',
    'Minivan',
    'Motorcycle',
    'Scooter',
    'ATV',
    'UTV',
    'RV',
    'Trailer',
    'Boat',
    'Other'
] as const

function normalizeOptionalNumber(value: number | string | undefined) {
    if (value === '' || value === undefined) {
        return undefined
    }

    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
}

interface Props {
    initial?: Vehicle
    onSubmit: (data: VehicleInput) => Promise<void>
    onCancel: () => void
    layout?: 'default' | 'feature'
}

export default function VehicleForm({ initial, onSubmit, onCancel, layout = 'default' }: Props) {
    const [form, setForm] = useState<VehicleInput>({
        make: initial?.make ?? '',
        model: initial?.model ?? '',
        year: initial?.year ?? new Date().getFullYear(),
        trim: initial?.trim ?? '',
        vehicleType: initial?.vehicleType ?? '',
        plateNumber: initial?.plateNumber ?? '',
        vin: initial?.vin ?? '',
        engine: initial?.engine ?? '',
        transmission: initial?.transmission ?? '',
        fuelType: initial?.fuelType ?? '',
        purchaseMileage: initial?.purchaseMileage ?? undefined,
        mileage: initial?.mileage ?? undefined,
        color: initial?.color ?? '',
        notes: initial?.notes ?? ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const isFeatureLayout = layout === 'feature'
    const computedVehicleName = `${form.year} ${form.make} ${form.model}`.trim()
    const hasLegacyVehicleType = Boolean(
        form.vehicleType && !vehicleTypeOptions.includes(form.vehicleType as (typeof vehicleTypeOptions)[number])
    )

    const set = (field: keyof VehicleInput, value: string | number) => setForm(prev => ({ ...prev, [field]: value }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            await onSubmit({
                ...form,
                year: Number(form.year),
                purchaseMileage: normalizeOptionalNumber(form.purchaseMileage),
                mileage: normalizeOptionalNumber(form.mileage),
                vehicleType: form.vehicleType || undefined,
                plateNumber: form.plateNumber || undefined,
                vin: form.vin || undefined,
                engine: form.engine || undefined,
                color: form.color || undefined,
                notes: form.notes || undefined
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    if (isFeatureLayout) {
        return (
            <section className='mx-auto max-w-5xl'>
                <div className='space-y-2 border-b border-border/70 pb-6 text-center'>
                    <h1 className='text-xl font-semibold uppercase text-foreground'>Add Vehicle</h1>
                    <p className='mx-auto max-w-2xl text-sm leading-6 text-muted-foreground'>
                        Capture the core details first. You can always refine notes and identifiers later.
                    </p>
                </div>

                <form className='space-y-6 pt-6' onSubmit={handleSubmit}>
                    {error && (
                        <p className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
                            {error}
                        </p>
                    )}

                    <div className='grid gap-5 md:grid-cols-2'>
                        <div className='space-y-2 md:col-span-2'>
                            <label className='text-sm font-medium text-foreground'>Name</label>
                            <Input type='text' value={computedVehicleName} disabled placeholder='Vehicle name' />
                        </div>
                        <div className='space-y-2 md:col-span-2'>
                            <label className='flex items-center gap-2 text-sm font-medium text-foreground'>
                                <span>VIN</span>
                                <span className='group relative inline-flex items-center'>
                                    <Info className='h-4 w-4 text-muted-foreground' aria-hidden='true' />
                                    <span className='pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-64 -translate-x-1/2 rounded-md border bg-popover px-3 py-2 text-xs font-normal leading-5 text-popover-foreground shadow-md group-hover:block'>
                                        {vinHelperText}
                                    </span>
                                </span>
                            </label>
                            <Input
                                type='text'
                                value={form.vin ?? ''}
                                onChange={e => set('vin', e.target.value)}
                                placeholder='Vehicle Identification Number'
                                maxLength={17}
                            />
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Make *</label>
                            <Input
                                type='text'
                                value={form.make}
                                onChange={e => set('make', e.target.value)}
                                placeholder='e.g. Toyota'
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Model *</label>
                            <Input
                                type='text'
                                value={form.model}
                                onChange={e => set('model', e.target.value)}
                                placeholder='e.g. Camry'
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Year *</label>
                            <Input
                                type='number'
                                value={form.year}
                                onChange={e => set('year', e.target.value)}
                                min='1900'
                                max={new Date().getFullYear() + 1}
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Trim *</label>
                            <Input
                                type='text'
                                value={form.trim}
                                onChange={e => set('trim', e.target.value)}
                                placeholder='e.g. XLE'
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Vehicle Type</label>
                            <Select
                                value={form.vehicleType || undefined}
                                onValueChange={value => set('vehicleType', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder='Select vehicle type' />
                                </SelectTrigger>
                                <SelectContent>
                                    {hasLegacyVehicleType && form.vehicleType ? (
                                        <SelectItem value={form.vehicleType}>{form.vehicleType}</SelectItem>
                                    ) : null}
                                    {vehicleTypeOptions.map(option => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Plate Number</label>
                            <Input
                                type='text'
                                value={form.plateNumber ?? ''}
                                onChange={e => set('plateNumber', e.target.value)}
                                placeholder='e.g. ABC-1234'
                            />
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Engine</label>
                            <Input
                                type='text'
                                value={form.engine ?? ''}
                                onChange={e => set('engine', e.target.value)}
                                placeholder='e.g. 2.5L I4'
                            />
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Transmission *</label>
                            <Select
                                value={form.transmission || undefined}
                                onValueChange={value => set('transmission', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder='Select transmission' />
                                </SelectTrigger>
                                <SelectContent>
                                    {transmissionOptions.map(option => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Fuel Type *</label>
                            <Select value={form.fuelType || undefined} onValueChange={value => set('fuelType', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder='Select fuel type' />
                                </SelectTrigger>
                                <SelectContent>
                                    {fuelTypeOptions.map(option => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Purchase Mileage</label>
                            <Input
                                type='number'
                                value={form.purchaseMileage ?? ''}
                                onChange={e => set('purchaseMileage', e.target.value)}
                                placeholder='e.g. 12000'
                                min='0'
                            />
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Current Mileage</label>
                            <Input
                                type='number'
                                value={form.mileage ?? ''}
                                onChange={e => set('mileage', e.target.value)}
                                placeholder='e.g. 45000'
                                min='0'
                            />
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Color</label>
                            <Input
                                type='text'
                                value={form.color ?? ''}
                                onChange={e => set('color', e.target.value)}
                                placeholder='e.g. Silver'
                            />
                        </div>
                        <div className='space-y-2 md:col-span-2'>
                            <label className='text-sm font-medium text-foreground'>Notes</label>
                            <Textarea
                                value={form.notes ?? ''}
                                onChange={e => set('notes', e.target.value)}
                                placeholder='Any additional notes about this vehicle'
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className='mx-auto max-w-3xl rounded-xl border bg-muted/40 p-4 text-center'>
                        <p className='text-sm font-medium text-foreground'>Profile completeness</p>
                        <p className='mt-1 text-sm text-muted-foreground'>
                            VIN, current mileage, and notes make future records easier to trust and search.
                        </p>
                    </div>

                    <div className='flex justify-center gap-2 pt-2'>
                        <Button type='button' variant='secondary' onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button type='submit' disabled={loading}>
                            {loading ? 'Saving…' : initial ? 'Save Changes' : 'Add Vehicle'}
                        </Button>
                    </div>
                </form>
            </section>
        )
    }

    return (
        <Card className='mx-auto max-w-3xl'>
            <CardHeader className='space-y-2'>
                <CardTitle>{initial ? 'Edit Vehicle' : 'Add Vehicle'}</CardTitle>
                <CardDescription>
                    Capture the core details first. You can always refine notes and identifiers later.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form className='space-y-4' onSubmit={handleSubmit}>
                    {error && (
                        <p className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
                            {error}
                        </p>
                    )}

                    <div className='grid gap-4 md:grid-cols-2'>
                        <div className='space-y-2 md:col-span-2'>
                            <label className='text-sm font-medium text-foreground'>Name</label>
                            <Input type='text' value={computedVehicleName} disabled placeholder='Vehicle name' />
                        </div>
                        <div className='space-y-2 md:col-span-2'>
                            <label className='flex items-center gap-2 text-sm font-medium text-foreground'>
                                <span>VIN</span>
                                <span className='group relative inline-flex items-center'>
                                    <Info className='h-4 w-4 text-muted-foreground' aria-hidden='true' />
                                    <span className='pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-64 -translate-x-1/2 rounded-md border bg-popover px-3 py-2 text-xs font-normal leading-5 text-popover-foreground shadow-md group-hover:block'>
                                        {vinHelperText}
                                    </span>
                                </span>
                            </label>
                            <Input
                                type='text'
                                value={form.vin ?? ''}
                                onChange={e => set('vin', e.target.value)}
                                placeholder='Vehicle Identification Number'
                                maxLength={17}
                            />
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Make *</label>
                            <Input
                                type='text'
                                value={form.make}
                                onChange={e => set('make', e.target.value)}
                                placeholder='e.g. Toyota'
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Model *</label>
                            <Input
                                type='text'
                                value={form.model}
                                onChange={e => set('model', e.target.value)}
                                placeholder='e.g. Camry'
                                required
                            />
                        </div>
                    </div>

                    <div className='grid gap-4 md:grid-cols-2'>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Year *</label>
                            <Input
                                type='number'
                                value={form.year}
                                onChange={e => set('year', e.target.value)}
                                min='1900'
                                max={new Date().getFullYear() + 1}
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Trim *</label>
                            <Input
                                type='text'
                                value={form.trim}
                                onChange={e => set('trim', e.target.value)}
                                placeholder='e.g. XLE'
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Vehicle Type</label>
                            <Select
                                value={form.vehicleType || undefined}
                                onValueChange={value => set('vehicleType', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder='Select vehicle type' />
                                </SelectTrigger>
                                <SelectContent>
                                    {hasLegacyVehicleType && form.vehicleType ? (
                                        <SelectItem value={form.vehicleType}>{form.vehicleType}</SelectItem>
                                    ) : null}
                                    {vehicleTypeOptions.map(option => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className='grid gap-4 md:grid-cols-2'>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Plate Number</label>
                            <Input
                                type='text'
                                value={form.plateNumber ?? ''}
                                onChange={e => set('plateNumber', e.target.value)}
                                placeholder='e.g. ABC-1234'
                            />
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Engine</label>
                            <Input
                                type='text'
                                value={form.engine ?? ''}
                                onChange={e => set('engine', e.target.value)}
                                placeholder='e.g. 2.5L I4'
                            />
                        </div>
                    </div>

                    <div className='grid gap-4 md:grid-cols-2'>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Transmission *</label>
                            <Select
                                value={form.transmission || undefined}
                                onValueChange={value => set('transmission', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder='Select transmission' />
                                </SelectTrigger>
                                <SelectContent>
                                    {transmissionOptions.map(option => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Fuel Type *</label>
                            <Select value={form.fuelType || undefined} onValueChange={value => set('fuelType', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder='Select fuel type' />
                                </SelectTrigger>
                                <SelectContent>
                                    {fuelTypeOptions.map(option => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className='grid gap-4 md:grid-cols-2'>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Purchase Mileage</label>
                            <Input
                                type='number'
                                value={form.purchaseMileage ?? ''}
                                onChange={e => set('purchaseMileage', e.target.value)}
                                placeholder='e.g. 12000'
                                min='0'
                            />
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Current Mileage</label>
                            <Input
                                type='number'
                                value={form.mileage ?? ''}
                                onChange={e => set('mileage', e.target.value)}
                                placeholder='e.g. 45000'
                                min='0'
                            />
                        </div>
                    </div>

                    <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>Color</label>
                        <Input
                            type='text'
                            value={form.color ?? ''}
                            onChange={e => set('color', e.target.value)}
                            placeholder='e.g. Silver'
                        />
                    </div>

                    <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>Notes</label>
                        <Textarea
                            value={form.notes ?? ''}
                            onChange={e => set('notes', e.target.value)}
                            placeholder='Any additional notes about this vehicle'
                            rows={3}
                        />
                    </div>

                    <div className='rounded-xl border bg-muted/40 p-4'>
                        <p className='text-sm font-medium text-foreground'>Profile completeness</p>
                        <p className='mt-1 text-sm text-muted-foreground'>
                            VIN, current mileage, and notes make future records easier to trust and search.
                        </p>
                    </div>

                    <div className='flex justify-end gap-2'>
                        <Button type='button' variant='secondary' onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button type='submit' disabled={loading}>
                            {loading ? 'Saving…' : initial ? 'Save Changes' : 'Add Vehicle'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}

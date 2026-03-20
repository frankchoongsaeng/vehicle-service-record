import { useEffect, useRef, useState } from 'react'
import { Info } from 'lucide-react'

import * as api from '../api/client.js'
import { isKnownVehicleType, vehicleTypeOptions } from '../lib/vehicleTypes.js'
import { cn } from '../lib/utils.js'
import type { VinLookupResult, Vehicle, VehicleInput } from '../types/index.js'
import { Button } from './ui/button.js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.js'
import { Input } from './ui/input.js'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select.js'
import { Textarea } from './ui/textarea.js'

const vinHelperText = 'Add the VIN to help us auto-fill the rest of the vehicle details for you.'
const transmissionOptions = ['Automatic', 'Manual', 'CVT', 'Dual-clutch', 'Semi-automatic'] as const
const fuelTypeOptions = ['Gasoline', 'Diesel', 'Hybrid', 'Plug-in Hybrid', 'Electric', 'Flex Fuel'] as const
const VIN_LENGTH = 17
const VIN_POSITION_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2] as const
const VIN_TRANSLITERATION: Record<string, number> = {
    A: 1,
    B: 2,
    C: 3,
    D: 4,
    E: 5,
    F: 6,
    G: 7,
    H: 8,
    J: 1,
    K: 2,
    L: 3,
    M: 4,
    N: 5,
    P: 7,
    R: 9,
    S: 2,
    T: 3,
    U: 4,
    V: 5,
    W: 6,
    X: 7,
    Y: 8,
    Z: 9,
    '0': 0,
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9
}

type VinLookupStatus = 'idle' | 'loading' | 'success' | 'error'
type RequiredVehicleField = 'make' | 'model' | 'year' | 'trim' | 'transmission' | 'fuelType'
type AutoFilledVehicleFields = Partial<
    Pick<VehicleInput, 'make' | 'model' | 'year' | 'trim' | 'vehicleType' | 'engine' | 'transmission' | 'fuelType'>
>

const requiredVehicleFields: RequiredVehicleField[] = ['make', 'model', 'year', 'trim', 'transmission', 'fuelType']

function normalizeVin(rawVin: string): string {
    return rawVin
        .trim()
        .toUpperCase()
        .replace(/[^A-HJ-NPR-Z0-9]/g, '')
        .slice(0, VIN_LENGTH)
}

function decodeVinCheckDigit(vin: string): string {
    const total = vin.split('').reduce((sum, character, index) => {
        const value = VIN_TRANSLITERATION[character]
        return sum + value * VIN_POSITION_WEIGHTS[index]
    }, 0)

    const remainder = total % 11
    return remainder === 10 ? 'X' : String(remainder)
}

function isValidVin(vin: string): boolean {
    return vin.length === VIN_LENGTH && vin[8] === decodeVinCheckDigit(vin)
}

function hasMeaningfulValue(value: string | number | undefined): boolean {
    if (value === undefined) {
        return false
    }

    if (typeof value === 'number') {
        return Number.isFinite(value)
    }

    return value.trim().length > 0
}

function shouldApplyLookupValue(
    currentValue: string | number | undefined,
    lookupValue: string | number | undefined,
    previousAutoFilledValue: string | number | undefined,
    fallbackValue?: string | number
): boolean {
    if (!hasMeaningfulValue(lookupValue)) {
        return false
    }

    if (!hasMeaningfulValue(currentValue)) {
        return true
    }

    if (currentValue === previousAutoFilledValue) {
        return true
    }

    if (fallbackValue !== undefined && currentValue === fallbackValue) {
        return true
    }

    return false
}

function buildLookupMessage(result: VinLookupResult): string {
    const name = [result.year, result.make, result.model, result.trim].filter(Boolean).join(' ')
    return name ? `${name} decoded from VIN.` : 'Vehicle details decoded from VIN.'
}

function applyLookupToForm(
    currentForm: VehicleInput,
    result: VinLookupResult,
    previousAutoFilled: AutoFilledVehicleFields,
    yearFallback: number
): { nextForm: VehicleInput; autoFilled: AutoFilledVehicleFields } {
    const lookupValues: AutoFilledVehicleFields = {
        make: result.make,
        model: result.model,
        year: result.year,
        trim: result.trim,
        vehicleType: result.vehicleType,
        engine: result.engine,
        transmission: result.transmission,
        fuelType: result.fuelType
    }
    const nextForm = { ...currentForm }
    const autoFilled: AutoFilledVehicleFields = {}

    if (shouldApplyLookupValue(currentForm.make, lookupValues.make, previousAutoFilled.make)) {
        nextForm.make = lookupValues.make ?? currentForm.make
        autoFilled.make = lookupValues.make
    }
    if (shouldApplyLookupValue(currentForm.model, lookupValues.model, previousAutoFilled.model)) {
        nextForm.model = lookupValues.model ?? currentForm.model
        autoFilled.model = lookupValues.model
    }
    if (shouldApplyLookupValue(currentForm.year, lookupValues.year, previousAutoFilled.year, yearFallback)) {
        nextForm.year = lookupValues.year ?? currentForm.year
        autoFilled.year = lookupValues.year
    }
    if (shouldApplyLookupValue(currentForm.trim, lookupValues.trim, previousAutoFilled.trim)) {
        nextForm.trim = lookupValues.trim ?? currentForm.trim
        autoFilled.trim = lookupValues.trim
    }
    if (shouldApplyLookupValue(currentForm.vehicleType, lookupValues.vehicleType, previousAutoFilled.vehicleType)) {
        nextForm.vehicleType = lookupValues.vehicleType ?? currentForm.vehicleType
        autoFilled.vehicleType = lookupValues.vehicleType
    }
    if (shouldApplyLookupValue(currentForm.engine, lookupValues.engine, previousAutoFilled.engine)) {
        nextForm.engine = lookupValues.engine ?? currentForm.engine
        autoFilled.engine = lookupValues.engine
    }
    if (shouldApplyLookupValue(currentForm.transmission, lookupValues.transmission, previousAutoFilled.transmission)) {
        nextForm.transmission = lookupValues.transmission ?? currentForm.transmission
        autoFilled.transmission = lookupValues.transmission
    }
    if (shouldApplyLookupValue(currentForm.fuelType, lookupValues.fuelType, previousAutoFilled.fuelType)) {
        nextForm.fuelType = lookupValues.fuelType ?? currentForm.fuelType
        autoFilled.fuelType = lookupValues.fuelType
    }

    return { nextForm, autoFilled }
}

function normalizeOptionalNumber(value: number | string | undefined) {
    if (value === '' || value === undefined) {
        return undefined
    }

    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
}

function hasFieldValue(value: string | number | undefined) {
    if (value === undefined) {
        return false
    }

    if (typeof value === 'number') {
        return Number.isFinite(value)
    }

    return value.trim().length > 0
}

function getMissingRequiredFields(form: VehicleInput): RequiredVehicleField[] {
    return requiredVehicleFields.filter(field => !hasFieldValue(form[field]))
}

function isRequiredField(field: keyof VehicleInput): field is RequiredVehicleField {
    return requiredVehicleFields.includes(field as RequiredVehicleField)
}

interface Props {
    initial?: Vehicle
    onSubmit: (data: VehicleInput) => Promise<void>
    onCancel: () => void
    onVehicleTypeChange?: (vehicleType: string) => void
    layout?: 'default' | 'feature'
}

export default function VehicleForm({ initial, onSubmit, onCancel, onVehicleTypeChange, layout = 'default' }: Props) {
    const initialYear = initial?.year ?? new Date().getFullYear()
    const [form, setForm] = useState<VehicleInput>({
        make: initial?.make ?? '',
        model: initial?.model ?? '',
        year: initialYear,
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
    const [invalidFields, setInvalidFields] = useState<Partial<Record<RequiredVehicleField, true>>>({})
    const [vinLookupStatus, setVinLookupStatus] = useState<VinLookupStatus>('idle')
    const [vinLookupMessage, setVinLookupMessage] = useState(vinHelperText)
    const isFeatureLayout = layout === 'feature'
    const canAutoLookupVin = !initial
    const trimmedMake = form.make.trim()
    const trimmedModel = form.model.trim()
    const computedVehicleName = [trimmedMake, trimmedModel].some(Boolean)
        ? [String(form.year).trim(), trimmedMake, trimmedModel].filter(Boolean).join(' ')
        : ''
    const title = initial ? 'Edit Vehicle' : computedVehicleName || 'Add Vehicle'
    const hasLegacyVehicleType = Boolean(form.vehicleType && !isKnownVehicleType(form.vehicleType))
    const lastLookedUpVinRef = useRef('')
    const autoFilledFieldsRef = useRef<AutoFilledVehicleFields>({})

    const set = (field: keyof VehicleInput, value: string | number) => {
        setForm(prev => ({ ...prev, [field]: value }))

        if (isRequiredField(field) && hasFieldValue(value)) {
            setInvalidFields(prev => {
                if (!prev[field]) {
                    return prev
                }

                const next = { ...prev }
                delete next[field]
                return next
            })
        }
    }

    useEffect(() => {
        if (!canAutoLookupVin) {
            return
        }

        const normalizedVin = normalizeVin(form.vin ?? '')
        if (normalizedVin !== (form.vin ?? '')) {
            setForm(prev => ({ ...prev, vin: normalizedVin }))
            return
        }

        if (!normalizedVin) {
            lastLookedUpVinRef.current = ''
            autoFilledFieldsRef.current = {}
            setVinLookupStatus('idle')
            setVinLookupMessage(vinHelperText)
            return
        }

        if (normalizedVin.length < VIN_LENGTH) {
            setVinLookupStatus('idle')
            setVinLookupMessage('Enter all 17 VIN characters to decode the vehicle details.')
            return
        }

        if (!isValidVin(normalizedVin)) {
            setVinLookupStatus('error')
            setVinLookupMessage('This VIN does not pass validation. Check the characters and try again.')
            return
        }

        if (lastLookedUpVinRef.current === normalizedVin) {
            return
        }

        let active = true
        const timeout = window.setTimeout(async () => {
            setVinLookupStatus('loading')
            setVinLookupMessage('Looking up VIN details…')

            try {
                const result = await api.lookupVin(normalizedVin)
                if (!active) {
                    return
                }

                setForm(currentForm => {
                    const applied = applyLookupToForm(currentForm, result, autoFilledFieldsRef.current, initialYear)
                    autoFilledFieldsRef.current = applied.autoFilled
                    return applied.nextForm
                })
                lastLookedUpVinRef.current = normalizedVin
                setVinLookupStatus('success')
                setVinLookupMessage(buildLookupMessage(result))
            } catch (lookupError) {
                if (!active) {
                    return
                }

                lastLookedUpVinRef.current = ''
                setVinLookupStatus('error')
                setVinLookupMessage(
                    lookupError instanceof Error
                        ? lookupError.message
                        : 'Unable to decode this VIN right now. You can continue filling out the form manually.'
                )
            }
        }, 350)

        return () => {
            active = false
            window.clearTimeout(timeout)
        }
    }, [canAutoLookupVin, form.vin, initialYear])

    useEffect(() => {
        onVehicleTypeChange?.(form.vehicleType ?? '')
    }, [form.vehicleType, onVehicleTypeChange])

    const vinMessageClassName = cn('text-xs leading-5 text-muted-foreground', {
        'text-foreground': vinLookupStatus === 'success',
        'text-destructive': vinLookupStatus === 'error'
    })
    const getFieldLabelClassName = (field: RequiredVehicleField) =>
        cn('text-sm font-medium text-foreground', { 'text-destructive': invalidFields[field] })
    const getInputClassName = (field: RequiredVehicleField) =>
        cn({
            'border-destructive focus-visible:ring-destructive/30': invalidFields[field]
        })
    const getSelectTriggerClassName = (field: RequiredVehicleField) =>
        cn({
            'border-destructive focus:ring-destructive/30': invalidFields[field]
        })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        const missingRequiredFields = getMissingRequiredFields(form)
        if (missingRequiredFields.length > 0) {
            setInvalidFields(
                Object.fromEntries(missingRequiredFields.map(field => [field, true])) as Partial<
                    Record<RequiredVehicleField, true>
                >
            )
            setError('Fill in the required fields highlighted in red.')
            return
        }

        setInvalidFields({})
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
                    <h1 className='text-xl font-semibold uppercase text-foreground'>{title}</h1>
                    <p className='mx-auto max-w-2xl text-sm leading-6 text-muted-foreground'>
                        Capture the core details first. You can always refine notes and identifiers later.
                    </p>
                </div>

                <form className='space-y-6 pt-6' onSubmit={handleSubmit} noValidate>
                    {error && (
                        <p className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
                            {error}
                        </p>
                    )}

                    <div className='grid gap-5 md:grid-cols-2'>
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
                                onChange={e => set('vin', normalizeVin(e.target.value))}
                                placeholder='Vehicle Identification Number'
                                maxLength={17}
                            />
                            <p className={vinMessageClassName}>{vinLookupMessage}</p>
                        </div>
                        <div className='space-y-2'>
                            <label className={getFieldLabelClassName('make')}>Make *</label>
                            <Input
                                type='text'
                                value={form.make}
                                onChange={e => set('make', e.target.value)}
                                placeholder='e.g. Toyota'
                                className={getInputClassName('make')}
                                aria-invalid={invalidFields.make ? true : undefined}
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <label className={getFieldLabelClassName('model')}>Model *</label>
                            <Input
                                type='text'
                                value={form.model}
                                onChange={e => set('model', e.target.value)}
                                placeholder='e.g. Camry'
                                className={getInputClassName('model')}
                                aria-invalid={invalidFields.model ? true : undefined}
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <label className={getFieldLabelClassName('year')}>Year *</label>
                            <Input
                                type='number'
                                value={form.year}
                                onChange={e => set('year', e.target.value)}
                                min='1900'
                                max={new Date().getFullYear() + 1}
                                className={getInputClassName('year')}
                                aria-invalid={invalidFields.year ? true : undefined}
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <label className={getFieldLabelClassName('trim')}>Trim *</label>
                            <Input
                                type='text'
                                value={form.trim}
                                onChange={e => set('trim', e.target.value)}
                                placeholder='e.g. XLE'
                                className={getInputClassName('trim')}
                                aria-invalid={invalidFields.trim ? true : undefined}
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Vehicle Type</label>
                            <Select value={form.vehicleType} onValueChange={value => set('vehicleType', value)}>
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
                            <label className={getFieldLabelClassName('transmission')}>Transmission *</label>
                            <Select value={form.transmission} onValueChange={value => set('transmission', value)}>
                                <SelectTrigger
                                    className={getSelectTriggerClassName('transmission')}
                                    aria-invalid={invalidFields.transmission ? true : undefined}
                                >
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
                            <label className={getFieldLabelClassName('fuelType')}>Fuel Type *</label>
                            <Select value={form.fuelType} onValueChange={value => set('fuelType', value)}>
                                <SelectTrigger
                                    className={getSelectTriggerClassName('fuelType')}
                                    aria-invalid={invalidFields.fuelType ? true : undefined}
                                >
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
                <CardTitle>{title}</CardTitle>
                <CardDescription>
                    Capture the core details first. You can always refine notes and identifiers later.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form className='space-y-4' onSubmit={handleSubmit} noValidate>
                    {error && (
                        <p className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
                            {error}
                        </p>
                    )}

                    <div className='grid gap-4 md:grid-cols-2'>
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
                                onChange={e => set('vin', normalizeVin(e.target.value))}
                                placeholder='Vehicle Identification Number'
                                maxLength={17}
                            />
                            <p className={vinMessageClassName}>{vinLookupMessage}</p>
                        </div>
                        <div className='space-y-2'>
                            <label className={getFieldLabelClassName('make')}>Make *</label>
                            <Input
                                type='text'
                                value={form.make}
                                onChange={e => set('make', e.target.value)}
                                placeholder='e.g. Toyota'
                                className={getInputClassName('make')}
                                aria-invalid={invalidFields.make ? true : undefined}
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <label className={getFieldLabelClassName('model')}>Model *</label>
                            <Input
                                type='text'
                                value={form.model}
                                onChange={e => set('model', e.target.value)}
                                placeholder='e.g. Camry'
                                className={getInputClassName('model')}
                                aria-invalid={invalidFields.model ? true : undefined}
                                required
                            />
                        </div>
                    </div>

                    <div className='grid gap-4 md:grid-cols-2'>
                        <div className='space-y-2'>
                            <label className={getFieldLabelClassName('year')}>Year *</label>
                            <Input
                                type='number'
                                value={form.year}
                                onChange={e => set('year', e.target.value)}
                                min='1900'
                                max={new Date().getFullYear() + 1}
                                className={getInputClassName('year')}
                                aria-invalid={invalidFields.year ? true : undefined}
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <label className={getFieldLabelClassName('trim')}>Trim *</label>
                            <Input
                                type='text'
                                value={form.trim}
                                onChange={e => set('trim', e.target.value)}
                                placeholder='e.g. XLE'
                                className={getInputClassName('trim')}
                                aria-invalid={invalidFields.trim ? true : undefined}
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Vehicle Type</label>
                            <Select value={form.vehicleType} onValueChange={value => set('vehicleType', value)}>
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
                            <label className={getFieldLabelClassName('transmission')}>Transmission *</label>
                            <Select value={form.transmission} onValueChange={value => set('transmission', value)}>
                                <SelectTrigger
                                    className={getSelectTriggerClassName('transmission')}
                                    aria-invalid={invalidFields.transmission ? true : undefined}
                                >
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
                            <label className={getFieldLabelClassName('fuelType')}>Fuel Type *</label>
                            <Select value={form.fuelType} onValueChange={value => set('fuelType', value)}>
                                <SelectTrigger
                                    className={getSelectTriggerClassName('fuelType')}
                                    aria-invalid={invalidFields.fuelType ? true : undefined}
                                >
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

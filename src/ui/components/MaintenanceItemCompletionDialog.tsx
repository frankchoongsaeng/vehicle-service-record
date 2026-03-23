import { useEffect, useState } from 'react'
import { CircleDollarSign, Gauge, Wrench } from 'lucide-react'

import { useAuth } from '../auth/useAuth.js'
import { DEFAULT_PREFERRED_CURRENCY } from '../lib/currency.js'
import { formatDistance, getDistanceUnitSuffix } from '../lib/distance.js'
import {
    SERVICE_TYPES,
    getServiceTypeLabel,
    type MaintenancePlan,
    type ServiceRecordInput,
    type ServiceTypeValue,
    type Vehicle
} from '../types/index.js'
import { Badge } from './ui/badge.js'
import { Button } from './ui/button.js'
import { DatePicker } from './ui/date-picker.js'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from './ui/dialog.js'
import { Input } from './ui/input.js'
import { InputGroup, InputGroupAddon, InputGroupInput } from './ui/input-group.js'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select.js'
import { Textarea } from './ui/textarea.js'

type FormState = {
    service_type: ServiceTypeValue
    description: string
    date: string
    mileage: string
    cost: string
    notes: string
}

interface Props {
    open: boolean
    plan: MaintenancePlan
    vehicle: Vehicle
    onOpenChange: (open: boolean) => void
    onSubmit: (data: ServiceRecordInput) => Promise<void>
}

function normalizeText(value: string) {
    return value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
}

function formatPlanCadence(plan: MaintenancePlan, distanceUnit: Vehicle['distanceUnit']) {
    const parts: string[] = []

    if (plan.intervalMonths != null) {
        parts.push(`every ${plan.intervalMonths} month${plan.intervalMonths === 1 ? '' : 's'}`)
    }

    if (plan.intervalMileage != null) {
        parts.push(`every ${plan.intervalMileage.toLocaleString()} ${getDistanceUnitSuffix(distanceUnit)}`)
    }

    return parts.join(' or ')
}

function buildDefaultDescription(plan: MaintenancePlan) {
    const serviceLabel = getServiceTypeLabel(plan.serviceType)
    const trimmedPlanTitle = plan.title.trim()

    if (trimmedPlanTitle && normalizeText(trimmedPlanTitle) !== normalizeText(serviceLabel)) {
        return trimmedPlanTitle
    }

    return serviceLabel
}

function ensurePlanTitleInDescription(plan: MaintenancePlan, description: string) {
    const serviceLabel = getServiceTypeLabel(plan.serviceType)
    const planTitle = plan.title.trim()
    const trimmedDescription = description.trim()

    if (!planTitle || normalizeText(planTitle) === normalizeText(serviceLabel)) {
        return trimmedDescription || serviceLabel
    }

    if (!trimmedDescription) {
        return planTitle
    }

    if (normalizeText(trimmedDescription).includes(normalizeText(planTitle))) {
        return trimmedDescription
    }

    return `${planTitle}: ${trimmedDescription}`
}

function createDefaultFormState(plan: MaintenancePlan, vehicle: Vehicle): FormState {
    return {
        service_type: plan.serviceType,
        description: buildDefaultDescription(plan),
        date: new Date().toISOString().slice(0, 10),
        mileage: vehicle.mileage != null ? String(vehicle.mileage) : '',
        cost: '',
        notes: plan.description?.trim() ?? ''
    }
}

export default function MaintenanceItemCompletionDialog({ open, plan, vehicle, onOpenChange, onSubmit }: Props) {
    const auth = useAuth()
    const [form, setForm] = useState<FormState>(() => createDefaultFormState(plan, vehicle))
    const [error, setError] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const today = new Date()
    const preferredCurrency = auth.user?.preferredCurrency ?? DEFAULT_PREFERRED_CURRENCY

    useEffect(() => {
        setForm(createDefaultFormState(plan, vehicle))
        setError('')
    }, [plan, vehicle])

    const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
        setForm(previous => ({ ...previous, [field]: value }))
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError('')

        const description = ensurePlanTitleInDescription(plan, form.description)

        if (!form.date) {
            setError('Date is required')
            return
        }

        if (!description) {
            setError('Service details are required')
            return
        }

        setIsSaving(true)

        try {
            await onSubmit({
                service_type: form.service_type,
                description,
                date: form.date,
                maintenance_plan_id: plan.id,
                mileage: form.mileage ? Number(form.mileage) : undefined,
                cost: form.cost ? Number(form.cost) : undefined,
                notes: form.notes.trim() || undefined
            })
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Something went wrong')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='max-w-2xl'>
                <DialogHeader>
                    <DialogTitle>Mark Maintenance Plan Complete</DialogTitle>
                    <DialogDescription>
                        Log this recurring service as a completed record. Defaults are pulled from the selected plan and
                        current vehicle mileage when available.
                    </DialogDescription>
                </DialogHeader>

                <form className='flex flex-col gap-5' onSubmit={handleSubmit}>
                    {error ? (
                        <p className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
                            {error}
                        </p>
                    ) : null}

                    <div className='flex flex-col gap-3 rounded-xl border bg-accent/20 p-4'>
                        <div className='flex flex-wrap items-center gap-2'>
                            <Badge variant='secondary'>{getServiceTypeLabel(plan.serviceType)}</Badge>
                            <p className='text-sm font-medium text-foreground'>{plan.title}</p>
                        </div>

                        <div className='grid gap-2 text-sm text-muted-foreground sm:grid-cols-3'>
                            <p>
                                {formatPlanCadence(plan, vehicle.distanceUnit) ||
                                    'Recurring cadence saved on this plan'}
                            </p>
                            <p>Current mileage: {formatDistance(vehicle.mileage, vehicle.distanceUnit)}</p>
                            <p>
                                Last completed:{' '}
                                {plan.lastCompletedDate ?? plan.lastCompletedMileage != null
                                    ? `${plan.lastCompletedDate ?? 'Date not set'}${
                                          plan.lastCompletedMileage != null
                                              ? ` at ${formatDistance(
                                                    plan.lastCompletedMileage,
                                                    vehicle.distanceUnit,
                                                    'Not recorded'
                                                )}`
                                              : ''
                                      }`
                                    : 'No baseline saved'}
                            </p>
                        </div>
                    </div>

                    <div className='grid gap-4 md:grid-cols-2'>
                        <div className='flex flex-col gap-2'>
                            <label className='text-sm font-medium text-foreground'>Service Type *</label>
                            <Select
                                value={form.service_type}
                                onValueChange={value => update('service_type', value as ServiceTypeValue)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder='Select a service type' />
                                </SelectTrigger>
                                <SelectContent>
                                    {SERVICE_TYPES.map(serviceType => (
                                        <SelectItem key={serviceType.value} value={serviceType.value}>
                                            {serviceType.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className='flex flex-col gap-2'>
                            <label className='text-sm font-medium text-foreground'>Completed On *</label>
                            <DatePicker
                                value={form.date}
                                onChange={value => update('date', value)}
                                required
                                minDate='1900-01-01'
                                maxDate={today}
                            />
                        </div>
                    </div>

                    <div className='flex flex-col gap-2'>
                        <label className='text-sm font-medium text-foreground'>Service Details *</label>
                        <Input
                            value={form.description}
                            onChange={event => update('description', event.target.value)}
                            placeholder='Describe what was completed for this maintenance item'
                            required
                        />
                    </div>

                    <div className='grid gap-4 md:grid-cols-2'>
                        <div className='flex flex-col gap-2'>
                            <label className='text-sm font-medium text-foreground'>Mileage</label>
                            <InputGroup>
                                <InputGroupInput
                                    type='number'
                                    min='0'
                                    value={form.mileage}
                                    onChange={event => update('mileage', event.target.value)}
                                    placeholder='e.g. 45200'
                                />
                                <InputGroupAddon align='inline-end'>
                                    <span className='text-sm text-muted-foreground'>
                                        {getDistanceUnitSuffix(vehicle.distanceUnit)}
                                    </span>
                                    <Gauge className='text-muted-foreground' />
                                </InputGroupAddon>
                            </InputGroup>
                        </div>

                        <div className='flex flex-col gap-2'>
                            <label className='text-sm font-medium text-foreground'>{`Price / Cost (${preferredCurrency})`}</label>
                            <InputGroup>
                                <InputGroupInput
                                    type='number'
                                    min='0'
                                    step='0.01'
                                    value={form.cost}
                                    onChange={event => update('cost', event.target.value)}
                                    placeholder='e.g. 89.95'
                                />
                                <InputGroupAddon align='inline-end'>
                                    <CircleDollarSign className='text-muted-foreground' />
                                </InputGroupAddon>
                            </InputGroup>
                        </div>
                    </div>

                    <div className='flex flex-col gap-2'>
                        <label className='text-sm font-medium text-foreground'>Notes</label>
                        <Textarea
                            value={form.notes}
                            onChange={event => update('notes', event.target.value)}
                            placeholder='Add extra notes, parts used, or follow-up reminders.'
                            rows={4}
                        />
                    </div>

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type='button' variant='secondary' disabled={isSaving}>
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button type='submit' disabled={isSaving}>
                            {isSaving ? (
                                'Saving…'
                            ) : (
                                <>
                                    <Wrench data-icon='inline-start' />
                                    Add Service Record
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

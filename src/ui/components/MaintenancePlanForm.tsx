import { useState } from 'react'
import { CalendarClock, Milestone, Trash2 } from 'lucide-react'

import * as api from '../api/client.js'
import {
    SERVICE_TYPES,
    getServiceTypeLabel,
    isServiceTypeValue,
    type MaintenancePlan,
    type MaintenancePlanInput,
    type ServiceTypeValue
} from '../types/index.js'
import { BillingGateNotice } from './BillingGateNotice.js'
import { Button } from './ui/button.js'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card.js'
import { DatePicker } from './ui/date-picker.js'
import { Input } from './ui/input.js'
import { InputGroup, InputGroupAddon, InputGroupInput } from './ui/input-group.js'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select.js'
import { Textarea } from './ui/textarea.js'

interface Props {
    initial?: MaintenancePlan
    onSubmit: (data: MaintenancePlanInput) => Promise<void>
    onCancel: () => void
    onDelete?: () => Promise<void>
}

type FormState = {
    serviceType: ServiceTypeValue | ''
    title: string
    description: string
    intervalMonths: string
    intervalMileage: string
    lastCompletedDate: string
    lastCompletedMileage: string
}

function toFormState(initial?: MaintenancePlan): FormState {
    return {
        serviceType: initial?.serviceType ?? '',
        title: initial?.title ?? '',
        description: initial?.description ?? '',
        intervalMonths: initial?.intervalMonths != null ? String(initial.intervalMonths) : '',
        intervalMileage: initial?.intervalMileage != null ? String(initial.intervalMileage) : '',
        lastCompletedDate: initial?.lastCompletedDate ?? '',
        lastCompletedMileage: initial?.lastCompletedMileage != null ? String(initial.lastCompletedMileage) : ''
    }
}

export default function MaintenancePlanForm({ initial, onSubmit, onCancel, onDelete }: Props) {
    const [form, setForm] = useState<FormState>(() => toFormState(initial))
    const [error, setError] = useState('')
    const [billingError, setBillingError] = useState<ReturnType<typeof api.getBillingGateResponse>>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const today = new Date()

    const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
        setForm(previous => ({ ...previous, [field]: value }))
    }

    const handleServiceTypeChange = (value: string) => {
        if (!isServiceTypeValue(value)) {
            return
        }

        setForm(previous => ({
            ...previous,
            serviceType: value,
            title: getServiceTypeLabel(value)
        }))
    }

    const validate = () => {
        if (!form.serviceType) {
            return 'Service type is required'
        }

        if (!form.title.trim()) {
            return 'Plan title is required'
        }

        return ''
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError('')
        setBillingError(null)

        const serviceType = form.serviceType

        const validationError = validate()

        if (validationError) {
            setError(validationError)
            return
        }

        if (!serviceType) {
            setError('Service type is required')
            return
        }

        setIsSaving(true)

        try {
            await onSubmit({
                serviceType,
                title: form.title.trim(),
                description: form.description.trim() || undefined,
                intervalMonths: form.intervalMonths ? Number(form.intervalMonths) : undefined,
                intervalMileage: form.intervalMileage ? Number(form.intervalMileage) : undefined,
                lastCompletedDate: form.lastCompletedDate || undefined,
                lastCompletedMileage: form.lastCompletedMileage ? Number(form.lastCompletedMileage) : undefined
            })
        } catch (submitError) {
            setBillingError(api.getBillingGateResponse(submitError))
            setError(submitError instanceof Error ? submitError.message : 'Something went wrong')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!onDelete) {
            return
        }

        const confirmationMessage = initial?.title
            ? `Delete the maintenance plan "${initial.title}"? This cannot be undone.`
            : 'Delete this maintenance plan? This cannot be undone.'

        if (!window.confirm(confirmationMessage)) {
            return
        }

        setError('')
        setBillingError(null)
        setIsDeleting(true)

        try {
            await onDelete()
        } catch (deleteError) {
            setBillingError(api.getBillingGateResponse(deleteError))
            setError(deleteError instanceof Error ? deleteError.message : 'Something went wrong')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <Card className='mx-auto w-full shadow-sm'>
            <CardHeader>
                <CardTitle>{initial ? 'Edit Maintenance Plan' : 'Add Maintenance Plan'}</CardTitle>
                <CardDescription>
                    Define one recurring service by time, mileage, or both, and keep its cadence tied to a single
                    service type.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form className='flex flex-col gap-5' onSubmit={handleSubmit}>
                    {billingError ? <BillingGateNotice billingError={billingError} compact /> : null}
                    {error ? (
                        <p className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
                            {error}
                        </p>
                    ) : null}

                    <div className='grid gap-4 md:grid-cols-2'>
                        <div className='flex flex-col gap-2 md:col-span-2'>
                            <label className='text-sm font-medium text-foreground'>Service Type *</label>
                            <Select value={form.serviceType} onValueChange={handleServiceTypeChange}>
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
                            <label className='text-sm font-medium text-foreground'>Plan Title *</label>
                            <Input
                                value={form.title}
                                onChange={event => update('title', event.target.value)}
                                placeholder='Auto-filled from service type'
                                required
                            />
                        </div>

                        <div className='flex flex-col gap-2'>
                            <label className='text-sm font-medium text-foreground'>Last Completed Date</label>
                            <DatePicker
                                value={form.lastCompletedDate}
                                onChange={value => update('lastCompletedDate', value)}
                                placeholder='Pick a completion date'
                                minDate='1900-01-01'
                                maxDate={today}
                            />
                        </div>
                    </div>

                    <div className='flex flex-col gap-2'>
                        <label className='text-sm font-medium text-foreground'>Plan Notes</label>
                        <Textarea
                            value={form.description}
                            onChange={event => update('description', event.target.value)}
                            placeholder='Optional notes about the cadence, parts, or preferred shop.'
                            rows={3}
                        />
                    </div>

                    <div className='grid gap-4 md:grid-cols-2'>
                        <div className='flex flex-col gap-2'>
                            <label className='text-sm font-medium text-foreground'>Repeat Every Months</label>
                            <InputGroup>
                                <InputGroupInput
                                    type='number'
                                    min='1'
                                    value={form.intervalMonths}
                                    onChange={event => update('intervalMonths', event.target.value)}
                                    placeholder='3'
                                />
                                <InputGroupAddon>
                                    <CalendarClock className='text-muted-foreground' />
                                </InputGroupAddon>
                            </InputGroup>
                        </div>

                        <div className='flex flex-col gap-2'>
                            <label className='text-sm font-medium text-foreground'>Repeat Every Mileage</label>
                            <InputGroup>
                                <InputGroupInput
                                    type='number'
                                    min='1'
                                    value={form.intervalMileage}
                                    onChange={event => update('intervalMileage', event.target.value)}
                                    placeholder='3000'
                                />
                                <InputGroupAddon>
                                    <Milestone className='text-muted-foreground' />
                                </InputGroupAddon>
                            </InputGroup>
                        </div>
                    </div>

                    <div className='flex flex-col gap-2'>
                        <label className='text-sm font-medium text-foreground'>Last Completed Mileage</label>
                        <InputGroup>
                            <InputGroupInput
                                type='number'
                                min='0'
                                value={form.lastCompletedMileage}
                                onChange={event => update('lastCompletedMileage', event.target.value)}
                                placeholder='45200'
                            />
                            <InputGroupAddon>
                                <Milestone className='text-muted-foreground' />
                            </InputGroupAddon>
                        </InputGroup>
                    </div>

                    <CardFooter className='justify-between px-0 pb-0'>
                        <div>
                            {onDelete ? (
                                <Button
                                    type='button'
                                    variant='destructive'
                                    onClick={handleDelete}
                                    disabled={isDeleting || isSaving}
                                >
                                    <Trash2 data-icon='inline-start' />
                                    {isDeleting ? 'Deleting…' : 'Delete Plan'}
                                </Button>
                            ) : null}
                        </div>
                        <div className='flex items-center gap-2'>
                            <Button
                                type='button'
                                variant='secondary'
                                onClick={onCancel}
                                disabled={isSaving || isDeleting}
                            >
                                Cancel
                            </Button>
                            <Button type='submit' disabled={isSaving || isDeleting}>
                                {isSaving ? 'Saving…' : initial ? 'Save Changes' : 'Create Plan'}
                            </Button>
                        </div>
                    </CardFooter>
                </form>
            </CardContent>
        </Card>
    )
}

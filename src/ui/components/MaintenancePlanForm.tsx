import { useState } from 'react'
import { CalendarClock, Milestone, Plus, Trash2, Wrench } from 'lucide-react'

import type { MaintenancePlan, MaintenancePlanInput } from '../types/index.js'
import { Button } from './ui/button.js'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card.js'
import { Input } from './ui/input.js'
import { Textarea } from './ui/textarea.js'

interface Props {
    initial?: MaintenancePlan
    onSubmit: (data: MaintenancePlanInput) => Promise<void>
    onCancel: () => void
    onDelete?: () => Promise<void>
}

type FormState = {
    title: string
    description: string
    intervalMonths: string
    intervalMileage: string
    lastCompletedDate: string
    lastCompletedMileage: string
    items: string[]
}

function toFormState(initial?: MaintenancePlan): FormState {
    return {
        title: initial?.title ?? '',
        description: initial?.description ?? '',
        intervalMonths: initial?.intervalMonths != null ? String(initial.intervalMonths) : '',
        intervalMileage: initial?.intervalMileage != null ? String(initial.intervalMileage) : '',
        lastCompletedDate: initial?.lastCompletedDate ?? '',
        lastCompletedMileage: initial?.lastCompletedMileage != null ? String(initial.lastCompletedMileage) : '',
        items: initial?.items.map(item => item.name) ?? ['']
    }
}

export default function MaintenancePlanForm({ initial, onSubmit, onCancel, onDelete }: Props) {
    const [form, setForm] = useState<FormState>(() => toFormState(initial))
    const [error, setError] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
        setForm(previous => ({ ...previous, [field]: value }))
    }

    const updateItem = (index: number, value: string) => {
        setForm(previous => ({
            ...previous,
            items: previous.items.map((item, itemIndex) => (itemIndex === index ? value : item))
        }))
    }

    const addItem = () => {
        setForm(previous => ({ ...previous, items: [...previous.items, ''] }))
    }

    const removeItem = (index: number) => {
        setForm(previous => {
            const nextItems = previous.items.filter((_, itemIndex) => itemIndex !== index)
            return {
                ...previous,
                items: nextItems.length > 0 ? nextItems : ['']
            }
        })
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError('')
        setIsSaving(true)

        try {
            await onSubmit({
                title: form.title.trim(),
                description: form.description.trim() || undefined,
                intervalMonths: form.intervalMonths ? Number(form.intervalMonths) : undefined,
                intervalMileage: form.intervalMileage ? Number(form.intervalMileage) : undefined,
                lastCompletedDate: form.lastCompletedDate || undefined,
                lastCompletedMileage: form.lastCompletedMileage ? Number(form.lastCompletedMileage) : undefined,
                items: form.items.map(item => item.trim()).filter(item => item.length > 0)
            })
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Something went wrong')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!onDelete) {
            return
        }

        setError('')
        setIsDeleting(true)

        try {
            await onDelete()
        } catch (deleteError) {
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
                    Define recurring work by time, mileage, or both, and bundle multiple maintenance items into one
                    plan.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form className='flex flex-col gap-5' onSubmit={handleSubmit}>
                    {error ? (
                        <p className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
                            {error}
                        </p>
                    ) : null}

                    <div className='grid gap-4 md:grid-cols-2'>
                        <div className='flex flex-col gap-2'>
                            <label className='text-sm font-medium text-foreground'>Plan Title *</label>
                            <Input
                                value={form.title}
                                onChange={event => update('title', event.target.value)}
                                placeholder='Quarterly servicing'
                                required
                            />
                        </div>

                        <div className='flex flex-col gap-2'>
                            <label className='text-sm font-medium text-foreground'>Last Completed Date</label>
                            <div className='relative'>
                                <CalendarClock className='pointer-events-none absolute left-3 top-2.5 text-muted-foreground' />
                                <Input
                                    type='date'
                                    className='pl-9'
                                    value={form.lastCompletedDate}
                                    onChange={event => update('lastCompletedDate', event.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className='flex flex-col gap-2'>
                        <label className='text-sm font-medium text-foreground'>Plan Notes</label>
                        <Textarea
                            value={form.description}
                            onChange={event => update('description', event.target.value)}
                            placeholder='Optional notes about the cadence, bundled service visit, or preferred shop.'
                            rows={3}
                        />
                    </div>

                    <div className='grid gap-4 md:grid-cols-2'>
                        <div className='flex flex-col gap-2'>
                            <label className='text-sm font-medium text-foreground'>Repeat Every Months</label>
                            <div className='relative'>
                                <CalendarClock className='pointer-events-none absolute left-3 top-2.5 text-muted-foreground' />
                                <Input
                                    type='number'
                                    min='1'
                                    className='pl-9'
                                    value={form.intervalMonths}
                                    onChange={event => update('intervalMonths', event.target.value)}
                                    placeholder='3'
                                />
                            </div>
                        </div>

                        <div className='flex flex-col gap-2'>
                            <label className='text-sm font-medium text-foreground'>Repeat Every Mileage</label>
                            <div className='relative'>
                                <Milestone className='pointer-events-none absolute left-3 top-2.5 text-muted-foreground' />
                                <Input
                                    type='number'
                                    min='1'
                                    className='pl-9'
                                    value={form.intervalMileage}
                                    onChange={event => update('intervalMileage', event.target.value)}
                                    placeholder='3000'
                                />
                            </div>
                        </div>
                    </div>

                    <div className='flex flex-col gap-2'>
                        <label className='text-sm font-medium text-foreground'>Last Completed Mileage</label>
                        <div className='relative'>
                            <Milestone className='pointer-events-none absolute left-3 top-2.5 text-muted-foreground' />
                            <Input
                                type='number'
                                min='0'
                                className='pl-9'
                                value={form.lastCompletedMileage}
                                onChange={event => update('lastCompletedMileage', event.target.value)}
                                placeholder='45200'
                            />
                        </div>
                    </div>

                    <div className='flex flex-col gap-3'>
                        <div className='flex items-center justify-between gap-3'>
                            <div>
                                <p className='text-sm font-medium text-foreground'>Bundled Maintenance Items *</p>
                                <p className='text-sm text-muted-foreground'>
                                    Add each item included in this recurring plan.
                                </p>
                            </div>
                            <Button type='button' variant='outline' size='sm' onClick={addItem}>
                                <Plus data-icon='inline-start' />
                                Add Item
                            </Button>
                        </div>

                        <div className='flex flex-col gap-3'>
                            {form.items.map((item, index) => (
                                <div key={`${index}-${item}`} className='flex items-center gap-2'>
                                    <div className='relative flex-1'>
                                        <Wrench className='pointer-events-none absolute left-3 top-2.5 text-muted-foreground' />
                                        <Input
                                            value={item}
                                            onChange={event => updateItem(index, event.target.value)}
                                            className='pl-9'
                                            placeholder={index === 0 ? 'Oil change' : 'Cabin filter'}
                                        />
                                    </div>
                                    <Button
                                        type='button'
                                        variant='ghost'
                                        size='icon'
                                        onClick={() => removeItem(index)}
                                        aria-label={`Remove maintenance item ${index + 1}`}
                                    >
                                        <Trash2 />
                                    </Button>
                                </div>
                            ))}
                        </div>
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

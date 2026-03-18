import { useState } from 'react'

import { Button } from './ui/button.js'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.js'
import { Input } from './ui/input.js'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select.js'
import { Textarea } from './ui/textarea.js'
import type { ServiceRecord, ServiceRecordInput } from '../types/index.js'
import { SERVICE_TYPES } from '../types/index.js'

interface Props {
    initial?: ServiceRecord
    onSubmit: (data: ServiceRecordInput) => Promise<void>
    onCancel: () => void
}

export default function ServiceRecordForm({ initial, onSubmit, onCancel }: Props) {
    const [form, setForm] = useState<ServiceRecordInput>({
        service_type: initial?.service_type ?? 'oil_change',
        description: initial?.description ?? '',
        date: initial?.date ?? new Date().toISOString().slice(0, 10),
        mileage: initial?.mileage ?? undefined,
        cost: initial?.cost ?? undefined,
        notes: initial?.notes ?? ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const set = <K extends keyof ServiceRecordInput>(field: K, value: ServiceRecordInput[K]) =>
        setForm(prev => ({ ...prev, [field]: value }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            await onSubmit({
                ...form,
                mileage: form.mileage ? Number(form.mileage) : undefined,
                cost: form.cost ? Number(form.cost) : undefined,
                notes: form.notes || undefined
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className='mx-auto max-w-3xl'>
            <CardHeader>
                <CardTitle>{initial ? 'Edit Service Record' : 'Add Service Record'}</CardTitle>
            </CardHeader>
            <CardContent>
                <form className='space-y-4' onSubmit={handleSubmit}>
                    {error && (
                        <p className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
                            {error}
                        </p>
                    )}

                    <div className='grid gap-4 md:grid-cols-2'>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Service Type *</label>
                            <Select
                                value={form.service_type}
                                onValueChange={value =>
                                    set('service_type', value as ServiceRecordInput['service_type'])
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder='Select a service type' />
                                </SelectTrigger>
                                <SelectContent>
                                    {SERVICE_TYPES.map(type => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Date *</label>
                            <Input type='date' value={form.date} onChange={e => set('date', e.target.value)} required />
                        </div>
                    </div>

                    <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>Description *</label>
                        <Input
                            type='text'
                            value={form.description}
                            onChange={e => set('description', e.target.value)}
                            placeholder='e.g. Full synthetic 5W-30 oil change + filter'
                            required
                        />
                    </div>

                    <div className='grid gap-4 md:grid-cols-2'>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Mileage at Service</label>
                            <Input
                                type='number'
                                value={form.mileage ?? ''}
                                onChange={e => set('mileage', e.target.value ? Number(e.target.value) : undefined)}
                                placeholder='e.g. 45000'
                                min='0'
                            />
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground'>Cost ($)</label>
                            <Input
                                type='number'
                                value={form.cost ?? ''}
                                onChange={e => set('cost', e.target.value ? Number(e.target.value) : undefined)}
                                placeholder='e.g. 75.00'
                                min='0'
                                step='0.01'
                            />
                        </div>
                    </div>

                    <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>Notes</label>
                        <Textarea
                            value={form.notes ?? ''}
                            onChange={e => set('notes', e.target.value)}
                            placeholder='Any additional notes'
                            rows={3}
                        />
                    </div>

                    <div className='flex justify-end gap-2'>
                        <Button type='button' variant='secondary' onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button type='submit' disabled={loading}>
                            {loading ? 'Saving…' : initial ? 'Save Changes' : 'Add Record'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}

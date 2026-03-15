import { useState } from 'react'

import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import type { Vehicle, VehicleInput } from '../types'

interface Props {
    initial?: Vehicle
    onSubmit: (data: VehicleInput) => Promise<void>
    onCancel: () => void
}

export default function VehicleForm({ initial, onSubmit, onCancel }: Props) {
    const [form, setForm] = useState<VehicleInput>({
        make: initial?.make ?? '',
        model: initial?.model ?? '',
        year: initial?.year ?? new Date().getFullYear(),
        vin: initial?.vin ?? '',
        mileage: initial?.mileage ?? undefined,
        color: initial?.color ?? '',
        notes: initial?.notes ?? ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const set = (field: keyof VehicleInput, value: string | number) => setForm(prev => ({ ...prev, [field]: value }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            await onSubmit({
                ...form,
                year: Number(form.year),
                mileage: form.mileage ? Number(form.mileage) : undefined,
                vin: form.vin || undefined,
                color: form.color || undefined,
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
                <CardTitle>{initial ? 'Edit Vehicle' : 'Add Vehicle'}</CardTitle>
            </CardHeader>
            <CardContent>
                <form className='space-y-4' onSubmit={handleSubmit}>
                    {error && (
                        <p className='rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
                            {error}
                        </p>
                    )}

                    <div className='grid gap-4 md:grid-cols-2'>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-slate-700'>Make *</label>
                            <Input
                                type='text'
                                value={form.make}
                                onChange={e => set('make', e.target.value)}
                                placeholder='e.g. Toyota'
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-slate-700'>Model *</label>
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
                            <label className='text-sm font-medium text-slate-700'>Year *</label>
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
                            <label className='text-sm font-medium text-slate-700'>Color</label>
                            <Input
                                type='text'
                                value={form.color ?? ''}
                                onChange={e => set('color', e.target.value)}
                                placeholder='e.g. Silver'
                            />
                        </div>
                    </div>

                    <div className='grid gap-4 md:grid-cols-2'>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-slate-700'>Current Mileage</label>
                            <Input
                                type='number'
                                value={form.mileage ?? ''}
                                onChange={e => set('mileage', e.target.value)}
                                placeholder='e.g. 45000'
                                min='0'
                            />
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-slate-700'>VIN</label>
                            <Input
                                type='text'
                                value={form.vin ?? ''}
                                onChange={e => set('vin', e.target.value)}
                                placeholder='Vehicle Identification Number'
                                maxLength={17}
                            />
                        </div>
                    </div>

                    <div className='space-y-2'>
                        <label className='text-sm font-medium text-slate-700'>Notes</label>
                        <Textarea
                            value={form.notes ?? ''}
                            onChange={e => set('notes', e.target.value)}
                            placeholder='Any additional notes about this vehicle'
                            rows={3}
                        />
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

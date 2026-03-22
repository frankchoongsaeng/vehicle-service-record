import { useId, useMemo, useState } from 'react'

import type { ServiceRecord, ServiceRecordUpdateInput, Workshop } from '../types/index.js'
import { Button } from './ui/button.js'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.js'
import { Input } from './ui/input.js'
import { Textarea } from './ui/textarea.js'

interface Props {
    initial: ServiceRecord
    availableWorkshops?: Workshop[]
    onSubmit: (data: ServiceRecordUpdateInput) => Promise<void>
    onCancel: () => void
}

export default function ServiceRecordEditForm({ initial, availableWorkshops = [], onSubmit, onCancel }: Props) {
    const workshopListId = useId()
    const [form, setForm] = useState<ServiceRecordUpdateInput>({
        workshop: initial.workshop ?? '',
        description: initial.description,
        cost: initial.cost ?? undefined,
        notes: initial.notes ?? ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const workshopSuggestions = useMemo(
        () =>
            [...availableWorkshops]
                .sort((left, right) => left.name.localeCompare(right.name) || right.id - left.id)
                .map(workshop => workshop.name),
        [availableWorkshops]
    )

    const set = <K extends keyof ServiceRecordUpdateInput>(field: K, value: ServiceRecordUpdateInput[K]) =>
        setForm(prev => ({ ...prev, [field]: value }))

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setError('')

        if (!form.description?.trim()) {
            setError('Description is required')
            return
        }

        setLoading(true)

        try {
            await onSubmit({
                workshop: form.workshop?.trim() || undefined,
                description: form.description.trim(),
                cost: form.cost != null ? Number(form.cost) : undefined,
                notes: form.notes?.trim() || undefined
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
                <CardTitle>Edit Service Record</CardTitle>
            </CardHeader>
            <CardContent>
                <form className='space-y-4' onSubmit={handleSubmit}>
                    {error ? (
                        <p className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
                            {error}
                        </p>
                    ) : null}

                    <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>Workshop</label>
                        <Input
                            type='text'
                            list={workshopListId}
                            value={form.workshop ?? ''}
                            onChange={event => set('workshop', event.target.value)}
                            placeholder='e.g. Northside Auto Care'
                        />
                        <p className='text-xs text-muted-foreground'>
                            Pick a saved workshop or type a new one. New workshop names are added automatically when you
                            save the record.
                        </p>
                        <datalist id={workshopListId}>
                            {workshopSuggestions.map(workshopName => (
                                <option key={workshopName} value={workshopName} />
                            ))}
                        </datalist>
                    </div>

                    <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>Description *</label>
                        <Input
                            type='text'
                            value={form.description}
                            onChange={event => set('description', event.target.value)}
                            placeholder='Describe the completed service'
                            required
                        />
                    </div>

                    <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>Cost ($)</label>
                        <Input
                            type='number'
                            value={form.cost ?? ''}
                            onChange={event => set('cost', event.target.value ? Number(event.target.value) : undefined)}
                            placeholder='e.g. 75.00'
                            min='0'
                            step='0.01'
                        />
                    </div>

                    <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>Notes</label>
                        <Textarea
                            value={form.notes ?? ''}
                            onChange={event => set('notes', event.target.value)}
                            placeholder='Any additional notes'
                            rows={4}
                        />
                    </div>

                    <div className='flex justify-end gap-2'>
                        <Button type='button' variant='secondary' onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button type='submit' disabled={loading}>
                            {loading ? 'Saving…' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}

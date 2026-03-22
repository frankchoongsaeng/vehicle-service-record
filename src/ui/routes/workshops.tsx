/* eslint-disable react-refresh/only-export-components */

import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node'
import { useLoaderData, useLocation, useNavigate, useSearchParams } from '@remix-run/react'
import { Building2, MapPinned, Pencil, Phone, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'

import * as api from '../api/client.js'
import { ApiError } from '../api/client.js'
import { useAuth } from '../auth/useAuth.js'
import { AuthenticatedShell } from '../components/AuthenticatedShell.js'
import BrandedLoadingScreen from '../components/BrandedLoadingScreen.js'
import { PageHeader } from '../components/PageHeader.js'
import { Button } from '../components/ui/button.js'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card.js'
import { Input } from '../components/ui/input.js'
import { Textarea } from '../components/ui/textarea.js'
import { fetchApiData } from '../lib/maintenance.js'
import type { Workshop, WorkshopInput } from '../types/index.js'

export const meta: MetaFunction = () => {
    return [
        { title: 'Manage Workshops | Duralog' },
        { name: 'description', content: 'Create and maintain the workshops you use for vehicle service.' }
    ]
}

export async function loader({ request }: LoaderFunctionArgs) {
    const workshops = await fetchApiData<Workshop[]>(request, '/api/workshops')

    return { workshops }
}

type View = { type: 'list' } | { type: 'create' } | { type: 'edit'; workshop: Workshop }
type ViewMode = 'create' | 'edit'

const modeValues: ReadonlySet<ViewMode> = new Set(['create', 'edit'])

function parsePositiveInt(value: string | null): number | null {
    if (!value) {
        return null
    }

    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed < 1) {
        return null
    }

    return parsed
}

function buildSearchParams(view: View): URLSearchParams {
    const params = new URLSearchParams()

    if (view.type === 'create') {
        params.set('mode', 'create')
    }

    if (view.type === 'edit') {
        params.set('mode', 'edit')
        params.set('workshopId', String(view.workshop.id))
    }

    return params
}

function mergeViewSearchParams(existingParams: URLSearchParams, view: View): URLSearchParams {
    const params = new URLSearchParams(existingParams)
    const viewParams = buildSearchParams(view)

    params.delete('mode')
    params.delete('workshopId')

    for (const [key, value] of viewParams.entries()) {
        params.set(key, value)
    }

    return params
}

function formatLastUpdated(value: string) {
    return new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

type WorkshopFormProps = {
    initial?: Workshop
    submitting: boolean
    error: string
    onSubmit: (input: WorkshopInput) => Promise<void>
    onCancel: () => void
}

function WorkshopForm({ initial, submitting, error, onSubmit, onCancel }: WorkshopFormProps) {
    const [name, setName] = useState(initial?.name ?? '')
    const [address, setAddress] = useState(initial?.address ?? '')
    const [phone, setPhone] = useState(initial?.phone ?? '')
    const [validationError, setValidationError] = useState('')

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        const normalizedName = name.trim()

        if (!normalizedName) {
            setValidationError('Workshop name is required.')
            return
        }

        setValidationError('')

        await onSubmit({
            name: normalizedName,
            address: address.trim() || undefined,
            phone: phone.trim() || undefined
        })
    }

    const title = initial ? 'Edit workshop' : 'Add workshop'
    const description = initial
        ? 'Update the contact details you keep on hand for this workshop.'
        : 'Save the shops, mechanics, and specialists you use most often.'

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <form className='flex flex-col gap-4' onSubmit={handleSubmit}>
                    {(validationError || error) && (
                        <div className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
                            {validationError || error}
                        </div>
                    )}

                    <div className='flex flex-col gap-2'>
                        <label htmlFor='workshop-name' className='text-sm font-medium text-foreground'>
                            Workshop name *
                        </label>
                        <Input
                            id='workshop-name'
                            value={name}
                            onChange={event => setName(event.target.value)}
                            aria-invalid={Boolean(validationError) || undefined}
                            required
                        />
                    </div>

                    <div className='flex flex-col gap-2'>
                        <label htmlFor='workshop-address' className='text-sm font-medium text-foreground'>
                            Address
                        </label>
                        <Textarea
                            id='workshop-address'
                            value={address}
                            onChange={event => setAddress(event.target.value)}
                            rows={4}
                        />
                    </div>

                    <div className='flex flex-col gap-2'>
                        <label htmlFor='workshop-phone' className='text-sm font-medium text-foreground'>
                            Phone number
                        </label>
                        <Input
                            id='workshop-phone'
                            type='tel'
                            value={phone}
                            onChange={event => setPhone(event.target.value)}
                        />
                    </div>

                    <div className='flex flex-wrap gap-2'>
                        <Button type='submit' disabled={submitting}>
                            {submitting ? 'Saving…' : initial ? 'Save Changes' : 'Create Workshop'}
                        </Button>
                        <Button type='button' variant='outline' onClick={onCancel} disabled={submitting}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}

export default function WorkshopsRoute() {
    const auth = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const { workshops: initialWorkshops } = useLoaderData<typeof loader>()
    const [searchParams, setSearchParams] = useSearchParams()
    const [workshops, setWorkshops] = useState(initialWorkshops)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        setWorkshops(initialWorkshops)
    }, [initialWorkshops])

    useEffect(() => {
        if (auth.status !== 'unauthenticated') {
            return
        }

        const redirectTo = `${location.pathname}${location.search}${location.hash}` || '/workshops'
        navigate(`/login?redirectTo=${encodeURIComponent(redirectTo)}`, { replace: true })
    }, [auth.status, location.hash, location.pathname, location.search, navigate])

    const setViewAndSyncUrl = (nextView: View, replace = false) => {
        const nextParams = mergeViewSearchParams(searchParams, nextView)
        if (nextParams.toString() !== searchParams.toString()) {
            setSearchParams(nextParams, { replace })
        }
    }

    const view = useMemo<View>(() => {
        const requestedMode = searchParams.get('mode')
        const isKnownMode = requestedMode && modeValues.has(requestedMode as ViewMode)
        const mode: ViewMode | null = isKnownMode ? (requestedMode as ViewMode) : null
        const workshopId = parsePositiveInt(searchParams.get('workshopId'))
        const selectedWorkshop = workshopId ? workshops.find(workshop => workshop.id === workshopId) : undefined

        if (mode === 'create') {
            return { type: 'create' }
        }

        if (mode === 'edit' && selectedWorkshop) {
            return { type: 'edit', workshop: selectedWorkshop }
        }

        return { type: 'list' }
    }, [searchParams, workshops])

    useEffect(() => {
        const canonicalParams = mergeViewSearchParams(searchParams, view)
        if (canonicalParams.toString() !== searchParams.toString()) {
            setSearchParams(canonicalParams, { replace: true })
        }
    }, [searchParams, setSearchParams, view])

    async function handleCreateWorkshop(input: WorkshopInput) {
        try {
            setSubmitting(true)
            setError('')
            const createdWorkshop = await api.createWorkshop(input)
            setWorkshops(current =>
                [...current, createdWorkshop].sort(
                    (left, right) => left.name.localeCompare(right.name) || right.id - left.id
                )
            )
            setViewAndSyncUrl({ type: 'edit', workshop: createdWorkshop })
        } catch (submitError) {
            if (submitError instanceof ApiError) {
                setError(submitError.message)
                return
            }

            setError('Unable to create the workshop right now.')
        } finally {
            setSubmitting(false)
        }
    }

    async function handleUpdateWorkshop(input: WorkshopInput) {
        if (view.type !== 'edit') {
            return
        }

        try {
            setSubmitting(true)
            setError('')
            const updatedWorkshop = await api.updateWorkshop(view.workshop.id, input)
            setWorkshops(current =>
                current
                    .map(workshop => (workshop.id === updatedWorkshop.id ? updatedWorkshop : workshop))
                    .sort((left, right) => left.name.localeCompare(right.name) || right.id - left.id)
            )
            setViewAndSyncUrl({ type: 'edit', workshop: updatedWorkshop }, true)
        } catch (submitError) {
            if (submitError instanceof ApiError) {
                setError(submitError.message)
                return
            }

            setError('Unable to update the workshop right now.')
        } finally {
            setSubmitting(false)
        }
    }

    async function handleDeleteWorkshop(workshop: Workshop) {
        if (!window.confirm(`Delete ${workshop.name}?`)) {
            return
        }

        try {
            setError('')
            await api.deleteWorkshop(workshop.id)
            setWorkshops(current => current.filter(entry => entry.id !== workshop.id))

            if (view.type === 'edit' && view.workshop.id === workshop.id) {
                setViewAndSyncUrl({ type: 'list' })
            }
        } catch (submitError) {
            if (submitError instanceof ApiError) {
                setError(submitError.message)
                return
            }

            setError('Unable to delete the workshop right now.')
        }
    }

    if (auth.status === 'loading') {
        return <BrandedLoadingScreen message='Checking your session…' />
    }

    if (!auth.user) {
        return <div className='grid min-h-screen place-items-center text-muted-foreground'>Redirecting to login…</div>
    }

    const activeWorkshop = view.type === 'edit' ? view.workshop : undefined

    return (
        <AuthenticatedShell currentUser={auth.user} onLogout={auth.logout}>
            <div className='flex flex-col gap-6'>
                {error && view.type === 'list' && (
                    <Card className='border-destructive/30 bg-destructive/10 shadow-none'>
                        <CardContent className='flex items-center justify-between p-3 text-sm text-destructive'>
                            <span>{error}</span>
                            <Button variant='ghost' size='sm' onClick={() => setError('')}>
                                Dismiss
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <PageHeader
                    eyebrow='Directory'
                    title='Manage workshops'
                    description='Keep a reusable list of service shops and mechanics with the contact details you need.'
                    actions={
                        <Button onClick={() => setViewAndSyncUrl({ type: 'create' })}>
                            <Plus data-icon='inline-start' />
                            Add Workshop
                        </Button>
                    }
                />

                <div className='grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]'>
                    <section className='flex flex-col gap-4'>
                        {workshops.length === 0 ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle>No workshops yet</CardTitle>
                                    <CardDescription>
                                        Start your directory with the garages, mechanics, and tire shops you rely on.
                                    </CardDescription>
                                </CardHeader>
                                <CardFooter>
                                    <Button onClick={() => setViewAndSyncUrl({ type: 'create' })}>
                                        <Plus data-icon='inline-start' />
                                        Add Your First Workshop
                                    </Button>
                                </CardFooter>
                            </Card>
                        ) : (
                            workshops.map(workshop => {
                                const isActive = activeWorkshop?.id === workshop.id

                                return (
                                    <Card
                                        key={workshop.id}
                                        className={isActive ? 'border-primary/40 bg-primary/5' : ''}
                                    >
                                        <CardHeader>
                                            <div className='flex items-start justify-between gap-4'>
                                                <div className='flex min-w-0 flex-col gap-1'>
                                                    <CardTitle className='flex items-center gap-2'>
                                                        <Building2 className='size-4 text-muted-foreground' />
                                                        <span className='truncate'>{workshop.name}</span>
                                                    </CardTitle>
                                                    <CardDescription>
                                                        Updated {formatLastUpdated(workshop.updated_at)}
                                                    </CardDescription>
                                                </div>
                                                <div className='flex shrink-0 gap-2'>
                                                    <Button
                                                        type='button'
                                                        variant='outline'
                                                        size='sm'
                                                        onClick={() => setViewAndSyncUrl({ type: 'edit', workshop })}
                                                    >
                                                        <Pencil data-icon='inline-start' />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        type='button'
                                                        variant='outline'
                                                        size='sm'
                                                        onClick={() => handleDeleteWorkshop(workshop)}
                                                    >
                                                        <Trash2 data-icon='inline-start' />
                                                        Delete
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className='flex flex-col gap-4'>
                                            <div className='flex items-start gap-3 text-sm text-muted-foreground'>
                                                <MapPinned className='mt-0.5 size-4 shrink-0' />
                                                <span>{workshop.address?.trim() || 'No address saved'}</span>
                                            </div>
                                            <div className='flex items-start gap-3 text-sm text-muted-foreground'>
                                                <Phone className='mt-0.5 size-4 shrink-0' />
                                                <span>{workshop.phone?.trim() || 'No phone number saved'}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })
                        )}
                    </section>

                    <section>
                        {view.type === 'create' ? (
                            <WorkshopForm
                                key='create-workshop-form'
                                submitting={submitting}
                                error={error}
                                onSubmit={handleCreateWorkshop}
                                onCancel={() => {
                                    setError('')
                                    setViewAndSyncUrl({ type: 'list' })
                                }}
                            />
                        ) : view.type === 'edit' ? (
                            <WorkshopForm
                                key={`edit-workshop-${view.workshop.id}`}
                                initial={view.workshop}
                                submitting={submitting}
                                error={error}
                                onSubmit={handleUpdateWorkshop}
                                onCancel={() => {
                                    setError('')
                                    setViewAndSyncUrl({ type: 'list' })
                                }}
                            />
                        ) : (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Workshop details</CardTitle>
                                    <CardDescription>
                                        Select a workshop to edit it, or create a new one from here.
                                    </CardDescription>
                                </CardHeader>
                                <CardFooter>
                                    <Button onClick={() => setViewAndSyncUrl({ type: 'create' })}>
                                        <Plus data-icon='inline-start' />
                                        Add Workshop
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}
                    </section>
                </div>
            </div>
        </AuthenticatedShell>
    )
}

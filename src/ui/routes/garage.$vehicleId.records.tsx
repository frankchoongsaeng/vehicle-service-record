/* eslint-disable react-refresh/only-export-components */
import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node'
import { Link, Outlet, useLoaderData, useNavigate, useParams, useRevalidator, useSearchParams } from '@remix-run/react'
import {
    CheckCircle2,
    ChevronLeft,
    ClipboardList,
    LayoutPanelLeft,
    ListFilter,
    Plus,
    RotateCw,
    Search,
    TriangleAlert,
    Wrench
} from 'lucide-react'
import { useEffect, useMemo } from 'react'

import * as api from '../api/client.js'
import { AuthenticatedShell } from '../components/AuthenticatedShell'
import BrandedLoadingScreen from '../components/BrandedLoadingScreen'
import MaintenanceItemCompletionDialog from '../components/MaintenanceItemCompletionDialog.js'
import MaintenancePlanForm from '../components/MaintenancePlanForm.js'
import { StatusBadge } from '../components/dashboard/StatusBadge'
import { PageHeader } from '../components/PageHeader'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { InputGroup, InputGroupAddon, InputGroupInput } from '../components/ui/input-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { useAuth } from '../auth/useAuth'
import {
    buildDisplayServiceRecords,
    evaluateMaintenancePlans,
    fetchApiData,
    getServiceLabel
} from '../lib/maintenance.js'
import { cn } from '../lib/utils'
import { fallbackVehicleTypeImage, getVehicleTypeImage } from '../lib/vehicleTypes.js'
import type { ServiceStatus } from '../components/dashboard/types'
import type {
    MaintenancePlan,
    MaintenancePlanInput,
    ServiceRecord as ApiServiceRecord,
    ServiceRecordInput,
    Vehicle
} from '../types/index.js'

export const meta: MetaFunction = () => [{ title: 'Service Records — Duralog' }]

type RecordsView = 'history' | 'plans'

export async function loader({ params, request }: LoaderFunctionArgs) {
    const vehicleId = Number(params.vehicleId)

    if (!Number.isInteger(vehicleId) || vehicleId < 1) {
        throw new Response('Not found', { status: 404 })
    }

    const [vehicle, rawRecords, plans] = await Promise.all([
        fetchApiData<Vehicle>(request, `/api/vehicles/${vehicleId}`),
        fetchApiData<ApiServiceRecord[]>(request, `/api/vehicles/${vehicleId}/records`),
        fetchApiData<MaintenancePlan[]>(request, `/api/vehicles/${vehicleId}/maintenance-plans`)
    ])

    const records = buildDisplayServiceRecords(rawRecords, new Date())
    const vehicleLabel = `${vehicle.year} ${vehicle.make} ${vehicle.model}`
    const vehicleImageFallback = getVehicleTypeImage(vehicle.vehicleType)
    const vehicleImageSrc = vehicle.imageUrl ?? vehicleImageFallback

    return {
        vehicle,
        vehicleId: String(vehicleId),
        records,
        plans,
        vehicleLabel,
        vehicleImageFallback,
        vehicleImageSrc
    }
}

const statusFilters: Array<ServiceStatus | 'All'> = ['All', 'Completed', 'Upcoming', 'Planned', 'Overdue']

export default function RecordsRoute() {
    const { vehicle, vehicleId, records, plans, vehicleLabel, vehicleImageFallback, vehicleImageSrc } =
        useLoaderData<typeof loader>()
    const { recordId } = useParams()
    const auth = useAuth()
    const navigate = useNavigate()
    const revalidator = useRevalidator()
    const [searchParams, setSearchParams] = useSearchParams()

    useEffect(() => {
        if (auth.status !== 'unauthenticated') return
        navigate(`/login?redirectTo=${encodeURIComponent(`/garage/${vehicleId}/records`)}`, { replace: true })
    }, [auth.status, navigate, vehicleId])

    const activeView: RecordsView = recordId ? 'history' : searchParams.get('view') === 'plans' ? 'plans' : 'history'
    const selectedPlanId = activeView === 'plans' ? searchParams.get('plan') : null

    const query = searchParams.get('q') ?? ''
    const statusFilter = (searchParams.get('status') ?? 'All') as ServiceStatus | 'All'
    const categoryFilter = searchParams.get('category') ?? 'All'

    const categories = useMemo(() => ['All', ...new Set(records.map(record => record.category))], [records])
    const safeStatus = statusFilters.includes(statusFilter) ? statusFilter : 'All'
    const safeCategory = categories.includes(categoryFilter) ? categoryFilter : 'All'

    const filteredRecords = useMemo(() => {
        const lowered = query.toLowerCase().trim()
        return records.filter(record => {
            const matchesQuery =
                lowered.length === 0 ||
                record.service.toLowerCase().includes(lowered) ||
                record.workshop.toLowerCase().includes(lowered)
            const matchesStatus = safeStatus === 'All' || record.status === safeStatus
            const matchesCategory = safeCategory === 'All' || record.category === safeCategory

            return matchesQuery && matchesStatus && matchesCategory
        })
    }, [records, query, safeStatus, safeCategory])

    const evaluatedPlans = useMemo(() => evaluateMaintenancePlans(plans, vehicle, new Date()), [plans, vehicle])
    const plansById = useMemo(() => new Map(plans.map(plan => [String(plan.id), plan])), [plans])
    const planCards = useMemo(
        () =>
            evaluatedPlans
                .map(summary => {
                    const plan = plansById.get(summary.id)

                    if (!plan) {
                        return null
                    }

                    return { plan, summary }
                })
                .filter(
                    (card): card is { plan: MaintenancePlan; summary: (typeof evaluatedPlans)[number] } => card != null
                ),
        [evaluatedPlans, plansById]
    )
    const actionPlans = evaluatedPlans.filter(plan => plan.status === 'Overdue' || plan.status === 'Upcoming').length
    const selectedPlan = selectedPlanId && selectedPlanId !== 'new' ? plansById.get(selectedPlanId) : undefined
    const completionPlanId = activeView === 'plans' ? searchParams.get('completePlan') : null
    const completionPlan = completionPlanId ? plansById.get(completionPlanId) : undefined
    const isCompletionDialogOpen = Boolean(completionPlan)
    const isPlanPanelOpen = activeView === 'plans' && Boolean(selectedPlanId)
    const isDetailOpen = activeView === 'history' ? Boolean(recordId) : isPlanPanelOpen

    const buildRecordsUrl = (updates: Record<string, string | null | undefined>) => {
        const next = new URLSearchParams(searchParams)

        for (const [key, value] of Object.entries(updates)) {
            if (!value) {
                next.delete(key)
            } else {
                next.set(key, value)
            }
        }

        const nextView = next.get('view') === 'plans' ? 'plans' : 'history'

        if (nextView === 'history') {
            next.delete('view')
            next.delete('plan')
            next.delete('completePlan')
        }

        if (nextView === 'plans') {
            next.delete('q')
            next.delete('status')
            next.delete('category')
        }

        const queryString = next.toString()
        return `/garage/${vehicleId}/records${queryString ? `?${queryString}` : ''}`
    }

    const updateFilter = (key: 'q' | 'status' | 'category', value: string) => {
        const next = new URLSearchParams(searchParams)
        if (!value || value === 'All') {
            next.delete(key)
        } else {
            next.set(key, value)
        }
        setSearchParams(next, { replace: true })
    }

    const handleRowClick = (id: string) => {
        navigate(recordId === id ? `/garage/${vehicleId}/records` : `/garage/${vehicleId}/records/${id}`)
    }

    const handleCreatePlan = async (data: MaintenancePlanInput) => {
        const createdPlan = await api.createMaintenancePlan(Number(vehicleId), data)
        navigate(buildRecordsUrl({ view: 'plans', plan: String(createdPlan.id) }), { replace: true })
    }

    const handleUpdatePlan = async (planId: number, data: MaintenancePlanInput) => {
        await api.updateMaintenancePlan(Number(vehicleId), planId, data)
        revalidator.revalidate()
    }

    const handleDeletePlan = async (planId: number) => {
        await api.deleteMaintenancePlan(Number(vehicleId), planId)
        navigate(buildRecordsUrl({ view: 'plans', plan: null }), { replace: true })
        revalidator.revalidate()
    }

    const handleCompletePlanItem = async (planId: number, data: ServiceRecordInput) => {
        await api.createRecord(Number(vehicleId), data)
        navigate(buildRecordsUrl({ view: 'plans', plan: String(planId), completePlan: null }), {
            replace: true
        })
        revalidator.revalidate()
    }

    if (auth.status === 'loading') {
        return <BrandedLoadingScreen message='Checking your session…' />
    }

    if (!auth.user) {
        return <div className='grid min-h-screen place-items-center text-muted-foreground'>Redirecting to login…</div>
    }

    return (
        <AuthenticatedShell
            currentUser={auth.user}
            onLogout={auth.logout}
            selectedVehicleLabel={vehicleLabel}
            selectedVehicleTo={`/garage/${vehicleId}`}
        >
            <div className='space-y-6'>
                <PageHeader
                    eyebrow='Records'
                    title={vehicleLabel}
                    description='Review history or manage maintenance plans without leaving records.'
                    cardClassName='border-none bg-transparent shadow-none'
                    media={
                        <img
                            src={vehicleImageSrc}
                            alt={vehicleLabel}
                            data-fallback-src={vehicleImageFallback}
                            className='block h-full min-h-48 w-full object-contain'
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
                    }
                    actions={
                        <Button asChild variant='outline'>
                            <Link to={`/garage/${vehicleId}`}>
                                <ChevronLeft data-icon='inline-start' />
                                Back to Overview
                            </Link>
                        </Button>
                    }
                />

                <section className='flex flex-wrap gap-2'>
                    <Button asChild variant={activeView === 'history' ? 'secondary' : 'outline'}>
                        <Link to={buildRecordsUrl({ view: null, plan: null })}>
                            <ClipboardList data-icon='inline-start' />
                            Service Records
                        </Link>
                    </Button>
                    <Button asChild variant={activeView === 'plans' ? 'secondary' : 'outline'}>
                        <Link to={buildRecordsUrl({ view: 'plans' })}>
                            <Wrench data-icon='inline-start' />
                            Maintenance Plans
                        </Link>
                    </Button>
                </section>

                <section className='grid gap-3 sm:grid-cols-3'>
                    {activeView === 'history' ? (
                        <>
                            <Card className='shadow-none'>
                                <CardContent className='p-4'>
                                    <p className='text-sm text-muted-foreground'>Total records</p>
                                    <p className='mt-1 text-2xl font-semibold text-foreground'>{records.length}</p>
                                </CardContent>
                            </Card>
                            <Card className='shadow-none'>
                                <CardContent className='p-4'>
                                    <p className='text-sm text-muted-foreground'>Filtered records</p>
                                    <p className='mt-1 text-2xl font-semibold text-foreground'>
                                        {filteredRecords.length}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className='shadow-none'>
                                <CardContent className='flex items-center gap-3 p-4'>
                                    <div className='rounded-xl border bg-secondary/50 p-2'>
                                        <LayoutPanelLeft className='h-4 w-4' />
                                    </div>
                                    <div>
                                        <p className='text-sm text-muted-foreground'>Detail panel</p>
                                        <p className='mt-1 font-medium text-foreground'>
                                            {isDetailOpen
                                                ? 'Open for selected record'
                                                : 'Select a row to inspect details'}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        <>
                            <Card className='shadow-none'>
                                <CardContent className='p-4'>
                                    <p className='text-sm text-muted-foreground'>Total plans</p>
                                    <p className='mt-1 text-2xl font-semibold text-foreground'>{plans.length}</p>
                                </CardContent>
                            </Card>
                            <Card className='shadow-none'>
                                <CardContent className='p-4'>
                                    <p className='text-sm text-muted-foreground'>Action needed</p>
                                    <p className='mt-1 text-2xl font-semibold text-foreground'>{actionPlans}</p>
                                </CardContent>
                            </Card>
                            <Card className='shadow-none'>
                                <CardContent className='flex items-center gap-3 p-4'>
                                    <div className='rounded-xl border bg-secondary/50 p-2'>
                                        <LayoutPanelLeft className='h-4 w-4' />
                                    </div>
                                    <div>
                                        <p className='text-sm text-muted-foreground'>Planner panel</p>
                                        <p className='mt-1 font-medium text-foreground'>
                                            {isPlanPanelOpen
                                                ? 'Open for selected plan'
                                                : 'Create a plan or select one to edit'}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </section>

                {activeView === 'history' ? (
                    <div className={cn('grid gap-6', isDetailOpen && 'xl:grid-cols-[minmax(0,1fr)_420px]')}>
                        <Card>
                            <CardHeader className='space-y-4'>
                                <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                                    <div className='flex flex-col gap-1.5'>
                                        <CardTitle>All Records</CardTitle>
                                    </div>
                                    <Button asChild size='sm'>
                                        <Link to={`/garage/${vehicleId}/records/new`}>
                                            <Plus data-icon='inline-start' />
                                            New Record
                                        </Link>
                                    </Button>
                                </div>
                                <div className='grid gap-3 sm:grid-cols-[1fr_220px_200px]'>
                                    <InputGroup>
                                        <InputGroupInput
                                            value={query}
                                            onChange={event => updateFilter('q', event.target.value)}
                                            placeholder='Search by service or workshop'
                                            aria-label='Search records'
                                        />
                                        <InputGroupAddon>
                                            <Search className='text-muted-foreground' />
                                        </InputGroupAddon>
                                    </InputGroup>

                                    <Select
                                        value={safeCategory}
                                        onValueChange={value => updateFilter('category', value)}
                                    >
                                        <div className='flex items-center gap-2'>
                                            <label
                                                htmlFor='records-category-filter'
                                                className='shrink-0 text-sm font-medium text-foreground'
                                            >
                                                Category
                                            </label>
                                            <SelectTrigger id='records-category-filter'>
                                                <SelectValue placeholder='Category' />
                                            </SelectTrigger>
                                        </div>
                                        <SelectContent>
                                            {categories.map(item => (
                                                <SelectItem key={item} value={item}>
                                                    {item}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select value={safeStatus} onValueChange={value => updateFilter('status', value)}>
                                        <div className='flex items-center gap-2'>
                                            <label
                                                htmlFor='records-status-filter'
                                                className='shrink-0 text-sm font-medium text-foreground'
                                            >
                                                Status
                                            </label>
                                            <SelectTrigger id='records-status-filter'>
                                                <SelectValue placeholder='Status' />
                                            </SelectTrigger>
                                        </div>
                                        <SelectContent>
                                            {statusFilters.map(item => (
                                                <SelectItem key={item} value={item}>
                                                    {item}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardHeader>

                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Mileage</TableHead>
                                            <TableHead>Service</TableHead>
                                            {!isDetailOpen && <TableHead>Workshop</TableHead>}
                                            <TableHead className='text-right'>Cost</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredRecords.map(record => (
                                            <TableRow
                                                key={record.id}
                                                className={cn(
                                                    'cursor-pointer',
                                                    recordId === record.id && 'bg-accent/60'
                                                )}
                                                onClick={() => handleRowClick(record.id)}
                                            >
                                                <TableCell className='whitespace-nowrap'>{record.date}</TableCell>
                                                <TableCell className='whitespace-nowrap text-muted-foreground'>
                                                    {record.mileage}
                                                </TableCell>
                                                <TableCell className='font-medium text-foreground'>
                                                    {record.service}
                                                </TableCell>
                                                {!isDetailOpen && <TableCell>{record.workshop}</TableCell>}
                                                <TableCell className='text-right'>{record.cost}</TableCell>
                                                <TableCell>
                                                    <StatusBadge status={record.status} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {filteredRecords.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={isDetailOpen ? 5 : 6}
                                                    className='py-8 text-center text-sm text-muted-foreground'
                                                >
                                                    No records match the selected filters.
                                                </TableCell>
                                            </TableRow>
                                        ) : null}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Outlet context={{ records, vehicleId }} />
                    </div>
                ) : (
                    <div className={cn('grid gap-6', isPlanPanelOpen && 'xl:grid-cols-[minmax(0,1fr)_420px]')}>
                        <Card>
                            <CardHeader className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                                <div className='flex flex-col gap-1.5'>
                                    <CardTitle>Maintenance Plans</CardTitle>
                                    <CardDescription>
                                        Track one recurring service per plan and let time or mileage trigger the next
                                        action.
                                    </CardDescription>
                                </div>
                                <Button asChild size='sm'>
                                    <Link to={buildRecordsUrl({ view: 'plans', plan: 'new' })}>
                                        <Plus data-icon='inline-start' />
                                        New Plan
                                    </Link>
                                </Button>
                            </CardHeader>
                            <CardContent className='flex flex-col gap-4'>
                                {evaluatedPlans.length === 0 ? (
                                    <div className='flex flex-col gap-3 rounded-xl border border-dashed p-6 text-sm text-muted-foreground'>
                                        <div className='flex items-center gap-2 text-foreground'>
                                            <ListFilter className='h-4 w-4' />
                                            <span className='font-medium'>No maintenance plans yet</span>
                                        </div>
                                        <p>
                                            Create a recurring plan for one service type, then track it here using time
                                            and mileage thresholds.
                                        </p>
                                        <div>
                                            <Button asChild size='sm'>
                                                <Link to={buildRecordsUrl({ view: 'plans', plan: 'new' })}>
                                                    <Plus data-icon='inline-start' />
                                                    Create First Plan
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    planCards.map(({ plan, summary }) => {
                                        const isSelected = selectedPlanId === String(plan.id)

                                        return (
                                            <div
                                                key={plan.id}
                                                className={cn(
                                                    'flex flex-col gap-3 rounded-xl border p-4 text-left',
                                                    isSelected && 'border-primary/40 bg-primary/5'
                                                )}
                                            >
                                                <div className='flex flex-wrap items-start justify-between gap-3'>
                                                    <div className='flex flex-col gap-1'>
                                                        <p className='font-semibold text-foreground'>{summary.title}</p>
                                                    </div>
                                                    <div className='flex flex-wrap items-center gap-2'>
                                                        <Button
                                                            type='button'
                                                            variant='outline'
                                                            size='sm'
                                                            onClick={() => {
                                                                navigate(
                                                                    buildRecordsUrl({
                                                                        view: 'plans',
                                                                        plan: String(plan.id)
                                                                    })
                                                                )
                                                            }}
                                                        >
                                                            Edit Plan
                                                        </Button>
                                                        <Button
                                                            type='button'
                                                            variant='outline'
                                                            size='sm'
                                                            onClick={() => {
                                                                navigate(
                                                                    buildRecordsUrl({
                                                                        view: 'plans',
                                                                        completePlan: String(plan.id)
                                                                    })
                                                                )
                                                            }}
                                                        >
                                                            <CheckCircle2 data-icon='inline-start' />
                                                            Mark Complete
                                                        </Button>
                                                    </div>
                                                </div>

                                                {summary.description ? (
                                                    <p className='text-sm leading-6 text-muted-foreground'>
                                                        {summary.description}
                                                    </p>
                                                ) : null}

                                                <div className='flex flex-wrap items-center gap-2'>
                                                    <Badge
                                                        variant={
                                                            summary.status === 'Overdue'
                                                                ? 'destructive'
                                                                : summary.status === 'Upcoming'
                                                                ? 'secondary'
                                                                : summary.status === 'Planned'
                                                                ? 'outline'
                                                                : 'default'
                                                        }
                                                        className='gap-1 [&>svg]:size-3'
                                                    >
                                                        {summary.status === 'Overdue' ? <TriangleAlert /> : null}
                                                        {summary.status === 'Overdue'
                                                            ? summary.due.replace(/^Overdue by (.+)$/, '$1 overdue')
                                                            : summary.status}
                                                    </Badge>
                                                    <Badge variant='secondary' className='gap-1 [&>svg]:size-3'>
                                                        <Wrench />
                                                        {getServiceLabel(plan.serviceType)}
                                                    </Badge>
                                                    <Badge variant='secondary' className='gap-1 [&>svg]:size-3'>
                                                        <RotateCw />
                                                        {summary.interval}
                                                    </Badge>
                                                </div>

                                                <div className='pt-1 text-sm text-muted-foreground'>
                                                    <p>{summary.lastCompleted}</p>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </CardContent>
                        </Card>

                        {isPlanPanelOpen ? (
                            <aside className='sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl'>
                                {selectedPlanId === 'new' ? (
                                    <MaintenancePlanForm
                                        onSubmit={handleCreatePlan}
                                        onCancel={() => navigate(buildRecordsUrl({ view: 'plans', plan: null }))}
                                    />
                                ) : selectedPlan ? (
                                    <MaintenancePlanForm
                                        initial={selectedPlan}
                                        onSubmit={data => handleUpdatePlan(selectedPlan.id, data)}
                                        onDelete={() => handleDeletePlan(selectedPlan.id)}
                                        onCancel={() => navigate(buildRecordsUrl({ view: 'plans', plan: null }))}
                                    />
                                ) : (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Plan Not Found</CardTitle>
                                            <CardDescription>
                                                The selected maintenance plan could not be found. It may have been
                                                removed.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <Button asChild variant='secondary'>
                                                <Link to={buildRecordsUrl({ view: 'plans', plan: null })}>
                                                    Back to Plans
                                                </Link>
                                            </Button>
                                        </CardContent>
                                    </Card>
                                )}
                            </aside>
                        ) : null}
                    </div>
                )}

                {isCompletionDialogOpen && completionPlan ? (
                    <MaintenanceItemCompletionDialog
                        open={isCompletionDialogOpen}
                        plan={completionPlan}
                        vehicle={vehicle}
                        onOpenChange={open => {
                            if (open) {
                                return
                            }

                            navigate(buildRecordsUrl({ view: 'plans', completePlan: null }), { replace: true })
                        }}
                        onSubmit={data => handleCompletePlanItem(completionPlan.id, data)}
                    />
                ) : null}
            </div>
        </AuthenticatedShell>
    )
}

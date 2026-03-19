/* eslint-disable react-refresh/only-export-components */
import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Link, Outlet, useLoaderData, useNavigate, useParams, useSearchParams } from '@remix-run/react'
import { ChevronLeft, LayoutPanelLeft, Plus, Search } from 'lucide-react'
import { useEffect, useMemo } from 'react'

import { AuthenticatedShell } from '../components/AuthenticatedShell'
import BrandedLoadingScreen from '../components/BrandedLoadingScreen'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { StatusBadge } from '../components/dashboard/StatusBadge'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { useAuth } from '../auth/useAuth'
import { cn } from '../lib/utils'
import type { ServiceRecord, ServiceStatus } from '../components/dashboard/types'

export const meta: MetaFunction = () => [{ title: 'Service Records — Duralog' }]

const mockRecords: ServiceRecord[] = [
    {
        id: 'record-001',
        date: '2026-02-28',
        mileage: '124,060 km',
        service: 'ABS Sensor Replacement',
        workshop: 'Northside Auto Care',
        category: 'Electrical',
        cost: '$245.00',
        status: 'Completed'
    },
    {
        id: 'record-002',
        date: '2026-02-11',
        mileage: '123,640 km',
        service: 'Power Steering Fluid Refresh',
        workshop: 'Precision Garage',
        category: 'Fluids',
        cost: '$95.00',
        status: 'Completed'
    },
    {
        id: 'record-003',
        date: '2026-03-22',
        mileage: '125,500 km',
        service: 'Brake Inspection & Cleaning',
        workshop: 'Precision Garage',
        category: 'Brakes',
        cost: '$80.00',
        status: 'Upcoming'
    },
    {
        id: 'record-004',
        date: '2026-04-04',
        mileage: '126,100 km',
        service: 'Coolant Cap Replacement',
        workshop: 'Metro Car Service',
        category: 'Cooling System',
        cost: '$36.00',
        status: 'Planned'
    },
    {
        id: 'record-005',
        date: '2026-02-01',
        mileage: '123,100 km',
        service: 'Front Brake Pads',
        workshop: 'Northside Auto Care',
        category: 'Brakes',
        cost: '$220.00',
        status: 'Overdue'
    },
    {
        id: 'record-006',
        date: '2026-01-15',
        mileage: '122,480 km',
        service: 'Engine Oil & Filter Change',
        workshop: 'Precision Garage',
        category: 'Engine',
        cost: '$75.00',
        status: 'Completed'
    },
    {
        id: 'record-007',
        date: '2025-12-03',
        mileage: '121,900 km',
        service: 'Tyre Rotation',
        workshop: 'Metro Car Service',
        category: 'Tyres',
        cost: '$40.00',
        status: 'Completed'
    }
]

export async function loader({ params }: LoaderFunctionArgs) {
    const vehicleId = params.vehicleId
    return json({ vehicleId, records: mockRecords, vehicleLabel: '2010 Kia Forte' })
}

const statusFilters: Array<ServiceStatus | 'All'> = ['All', 'Completed', 'Upcoming', 'Planned', 'Overdue']

export default function RecordsRoute() {
    const { vehicleId, records, vehicleLabel } = useLoaderData<typeof loader>()
    const { recordId } = useParams()
    const auth = useAuth()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()

    useEffect(() => {
        if (auth.status !== 'unauthenticated') return
        navigate(`/login?redirectTo=${encodeURIComponent(`/garage/${vehicleId}/records`)}`, { replace: true })
    }, [auth.status, navigate, vehicleId])

    const query = searchParams.get('q') ?? ''
    const statusFilter = (searchParams.get('status') ?? 'All') as ServiceStatus | 'All'
    const categoryFilter = searchParams.get('category') ?? 'All'

    const categories = useMemo(() => ['All', ...new Set(records.map(r => r.category))], [records])

    const safeStatus = statusFilters.includes(statusFilter) ? statusFilter : 'All'
    const safeCategory = categories.includes(categoryFilter) ? categoryFilter : 'All'

    const filteredRecords = useMemo(() => {
        const lowered = query.toLowerCase().trim()
        return records.filter(r => {
            const matchesQuery =
                lowered.length === 0 ||
                r.service.toLowerCase().includes(lowered) ||
                r.workshop.toLowerCase().includes(lowered)
            const matchesStatus = safeStatus === 'All' || r.status === safeStatus
            const matchesCategory = safeCategory === 'All' || r.category === safeCategory
            return matchesQuery && matchesStatus && matchesCategory
        })
    }, [records, query, safeStatus, safeCategory])

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

    const isDetailOpen = Boolean(recordId)

    if (auth.status === 'loading') {
        return <BrandedLoadingScreen message='Checking your session…' />
    }

    if (!auth.user) {
        return <div className='grid min-h-screen place-items-center text-muted-foreground'>Redirecting to login…</div>
    }

    return (
        <AuthenticatedShell currentUser={auth.user} onLogout={auth.logout}>
            <div className='space-y-6'>
                <PageHeader
                    eyebrow={vehicleLabel}
                    title='Service records'
                    description='Filter maintenance history, inspect record details, and keep planned work visible without leaving the page.'
                    actions={
                        <>
                            <Button asChild variant='outline'>
                                <Link to='/'>
                                    <ChevronLeft className='h-4 w-4' />
                                    Back to Garage
                                </Link>
                            </Button>
                            <Button>
                                <Plus className='h-4 w-4' />
                                Add Record
                            </Button>
                        </>
                    }
                >
                    <div className='grid gap-3 sm:grid-cols-3'>
                        <Card className='shadow-none'>
                            <CardContent className='p-4'>
                                <p className='text-sm text-muted-foreground'>Total records</p>
                                <p className='mt-1 text-2xl font-semibold text-foreground'>{records.length}</p>
                            </CardContent>
                        </Card>
                        <Card className='shadow-none'>
                            <CardContent className='p-4'>
                                <p className='text-sm text-muted-foreground'>Filtered records</p>
                                <p className='mt-1 text-2xl font-semibold text-foreground'>{filteredRecords.length}</p>
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
                                        {isDetailOpen ? 'Open for selected record' : 'Select a row to inspect details'}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </PageHeader>

                <div className={cn('grid gap-6', isDetailOpen && 'xl:grid-cols-[minmax(0,1fr)_420px]')}>
                    <Card>
                        <CardHeader className='space-y-4'>
                            <CardTitle>All Records</CardTitle>
                            <div className='grid gap-3 sm:grid-cols-[1fr_180px_180px]'>
                                <div className='relative'>
                                    <Search className='pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground' />
                                    <Input
                                        value={query}
                                        onChange={e => updateFilter('q', e.target.value)}
                                        className='pl-9'
                                        placeholder='Search by service or workshop'
                                        aria-label='Search records'
                                    />
                                </div>

                                <Select value={safeCategory} onValueChange={v => updateFilter('category', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder='Category' />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map(item => (
                                            <SelectItem key={item} value={item}>
                                                {item}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={safeStatus} onValueChange={v => updateFilter('status', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder='Status' />
                                    </SelectTrigger>
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
                                            className={cn('cursor-pointer', recordId === record.id && 'bg-accent/60')}
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
                                    {filteredRecords.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={isDetailOpen ? 5 : 6}
                                                className='py-8 text-center text-sm text-muted-foreground'
                                            >
                                                No records match the selected filters.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Outlet context={{ records, vehicleId }} />
                </div>
            </div>
        </AuthenticatedShell>
    )
}

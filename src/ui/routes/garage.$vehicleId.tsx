/* eslint-disable react-refresh/only-export-components */

import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Link, useLoaderData, useLocation, useNavigate, useOutlet } from '@remix-run/react'
import { Activity, CalendarClock, CircleDollarSign, Download, Plus, TriangleAlert } from 'lucide-react'
import { useEffect } from 'react'

import { AuthenticatedShell } from '../components/AuthenticatedShell'
import BrandedLoadingScreen from '../components/BrandedLoadingScreen'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/ui/button'
import { QuickAddServiceForm } from '../components/dashboard/QuickAddServiceForm'
import { MaintenanceTimeline } from '../components/dashboard/MaintenanceTimeline'
import { ServiceRecordTable } from '../components/dashboard/ServiceRecordTable'
import { StatCard } from '../components/dashboard/StatCard'
import type {
    ServiceRecord as DashboardServiceRecord,
    SnapshotField,
    SummaryStat,
    TimelineEvent,
    UpcomingItem
} from '../components/dashboard/types'
import { UpcomingMaintenancePanel } from '../components/dashboard/UpcomingMaintenancePanel'
import { VehicleSnapshotCard } from '../components/dashboard/VehicleSnapshotCard'
import { useAuth } from '../auth/useAuth'
import type { ServiceRecord as ApiServiceRecord, Vehicle } from '../types/index.js'
import {
    buildDisplayServiceRecords,
    buildSummaryStats,
    buildTimeline,
    buildUpcomingItems,
    fetchApiData
} from '../lib/maintenance.js'

export const meta: MetaFunction = () => {
    return [
        { title: 'Vehicle Dashboard | Duralog' },
        {
            name: 'description',
            content: 'A practical service logbook dashboard for tracking vehicle maintenance history and upcoming work.'
        }
    ]
}

interface DashboardLoaderData {
    vehicleId: string | undefined
    vehicleLabel: string
    summaryStats: SummaryStat[]
    serviceRecords: DashboardServiceRecord[]
    upcomingItems: UpcomingItem[]
    snapshot: SnapshotField[]
    timeline: TimelineEvent[]
}

export async function loader({ params, request }: LoaderFunctionArgs) {
    const vehicleId = Number(params.vehicleId)

    if (!Number.isInteger(vehicleId) || vehicleId < 1) {
        throw new Response('Not found', { status: 404 })
    }

    const [vehicle, records] = await Promise.all([
        fetchApiData<Vehicle>(request, `/api/vehicles/${vehicleId}`),
        fetchApiData<ApiServiceRecord[]>(request, `/api/vehicles/${vehicleId}/records`)
    ])

    const now = new Date()
    const vehicleLabel = `${vehicle.year} ${vehicle.make} ${vehicle.model}`
    const serviceRecords: DashboardServiceRecord[] = buildDisplayServiceRecords(records, now)
    const upcomingItems = buildUpcomingItems(vehicle, records, now)
    const summaryStats: SummaryStat[] = buildSummaryStats(vehicle, records, upcomingItems, now)

    const snapshot: SnapshotField[] = [
        { label: 'Trim', value: vehicle.trim },
        { label: 'Plate Number', value: vehicle.plateNumber || 'Not recorded' },
        { label: 'VIN', value: vehicle.vin || 'Not recorded' },
        { label: 'Engine', value: vehicle.engine || 'Not recorded' },
        { label: 'Transmission', value: vehicle.transmission },
        { label: 'Fuel Type', value: vehicle.fuelType },
        {
            label: 'Purchase Mileage',
            value: vehicle.purchaseMileage != null ? `${vehicle.purchaseMileage.toLocaleString()} mi` : 'Not recorded'
        }
    ]

    const timeline: TimelineEvent[] = buildTimeline(records, upcomingItems, now)

    return json<DashboardLoaderData>({
        vehicleId: params.vehicleId,
        vehicleLabel,
        summaryStats,
        serviceRecords,
        upcomingItems,
        snapshot,
        timeline
    })
}

const summaryIcons = [Activity, CircleDollarSign, TriangleAlert, CalendarClock] as const

export default function VehicleDashboardRoute() {
    const auth = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const outlet = useOutlet()
    const { vehicleId, vehicleLabel, summaryStats, serviceRecords, upcomingItems, snapshot, timeline } =
        useLoaderData<typeof loader>()

    useEffect(() => {
        if (auth.status !== 'unauthenticated') {
            return
        }

        const redirectTo = `${location.pathname}${location.search}${location.hash}` || `/garage/${vehicleId ?? ''}`
        navigate(`/login?redirectTo=${encodeURIComponent(redirectTo)}`, { replace: true })
    }, [auth.status, location.hash, location.pathname, location.search, navigate, vehicleId])

    if (outlet) {
        return outlet
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
                    eyebrow='Dashboard'
                    title='Vehicle maintenance dashboard'
                    description={`Service activity, upcoming work, and vehicle health snapshots for ${vehicleLabel}.`}
                    actions={
                        <>
                            <Button asChild variant='outline'>
                                <Link to={`/garage/${vehicleId}/records`}>
                                    <Download className='h-4 w-4' />
                                    Review Records
                                </Link>
                            </Button>
                            <Button asChild>
                                <Link to={`/garage/${vehicleId}/records/new`}>
                                    <Plus className='h-4 w-4' />
                                    Add Service Record
                                </Link>
                            </Button>
                        </>
                    }
                />

                <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
                    {summaryStats.map((stat, index) => (
                        <StatCard
                            key={stat.title}
                            label={stat.title}
                            value={stat.value}
                            hint={stat.hint}
                            icon={summaryIcons[index]}
                        />
                    ))}
                </section>

                <section className='grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'>
                    <ServiceRecordTable records={serviceRecords} />

                    <div className='space-y-6'>
                        <UpcomingMaintenancePanel items={upcomingItems} />
                        <VehicleSnapshotCard vehicleLabel={vehicleLabel} fields={snapshot} />
                    </div>
                </section>

                <section className='grid gap-6 xl:grid-cols-2'>
                    <MaintenanceTimeline events={timeline} />
                    <QuickAddServiceForm />
                </section>
            </div>
        </AuthenticatedShell>
    )
}

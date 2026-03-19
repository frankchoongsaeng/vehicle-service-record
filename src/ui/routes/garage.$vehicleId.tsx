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
    ServiceRecord,
    SnapshotField,
    SummaryStat,
    TimelineEvent,
    UpcomingItem
} from '../components/dashboard/types'
import { UpcomingMaintenancePanel } from '../components/dashboard/UpcomingMaintenancePanel'
import { VehicleSnapshotCard } from '../components/dashboard/VehicleSnapshotCard'
import { useAuth } from '../auth/useAuth'

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
    serviceRecords: ServiceRecord[]
    upcomingItems: UpcomingItem[]
    snapshot: SnapshotField[]
    timeline: TimelineEvent[]
}

export async function loader({ params }: LoaderFunctionArgs) {
    const summaryStats: SummaryStat[] = [
        {
            title: 'Current Mileage',
            value: '125,240 km',
            hint: 'Up 1,180 km since last month'
        },
        {
            title: 'Total Maintenance Cost',
            value: '$3,420.50',
            hint: 'Rolling 12-month total'
        },
        {
            title: 'Overdue Items',
            value: '2',
            hint: 'Front brake pads and cabin filter'
        },
        {
            title: 'Last Service',
            value: '2026-02-28',
            hint: 'ABS Sensor Replacement'
        }
    ]

    const serviceRecords: ServiceRecord[] = [
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
        }
    ]

    const upcomingItems: UpcomingItem[] = [
        {
            id: 'upcoming-001',
            title: 'Engine Oil & Filter',
            due: 'Due in 320 km',
            status: 'Upcoming'
        },
        {
            id: 'upcoming-002',
            title: 'Front Brake Pads',
            due: 'Overdue by 140 km',
            status: 'Overdue'
        },
        {
            id: 'upcoming-003',
            title: 'Wheel Alignment',
            due: 'Planned for next service window',
            status: 'Planned'
        }
    ]

    const snapshot: SnapshotField[] = [
        { label: 'Plate Number', value: 'ABC-2010' },
        { label: 'VIN', value: 'KNAFU4A23A5123456' },
        { label: 'Engine', value: '2.0L DOHC' },
        { label: 'Transmission', value: '4-speed automatic' },
        { label: 'Fuel Type', value: 'Gasoline' }
    ]

    const timeline: TimelineEvent[] = [
        {
            id: 'event-001',
            title: 'ABS Sensor Replacement Completed',
            date: '2026-02-28',
            detail: 'Fault code cleared and road test passed at Northside Auto Care.',
            tone: 'success'
        },
        {
            id: 'event-002',
            title: 'Front Brake Pads Service Overdue',
            date: '2026-03-08',
            detail: 'Recommended replacement interval exceeded by 140 km.',
            tone: 'warning'
        },
        {
            id: 'event-003',
            title: 'Brake Inspection & Cleaning Scheduled',
            date: '2026-03-22',
            detail: 'Booking confirmed with Precision Garage for routine brake check.',
            tone: 'neutral'
        }
    ]

    return json<DashboardLoaderData>({
        vehicleId: params.vehicleId,
        vehicleLabel: '2010 Kia Forte',
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
        <AuthenticatedShell currentUser={auth.user} onLogout={auth.logout}>
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
                            <Button>
                                <Plus className='h-4 w-4' />
                                Add Service Record
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

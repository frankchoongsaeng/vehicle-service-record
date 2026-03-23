import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node'
import { Link, useLoaderData, useLocation, useNavigate, useOutlet } from '@remix-run/react'
import { Activity, CalendarClock, CircleDollarSign, FileText, Plus, TriangleAlert } from 'lucide-react'
import { useEffect } from 'react'

import { AuthenticatedShell } from '../components/AuthenticatedShell'
import BrandedLoadingScreen from '../components/BrandedLoadingScreen'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/ui/button'
import { MaintenanceTimeline } from '../components/dashboard/MaintenanceTimeline'
import { StatCard } from '../components/dashboard/StatCard'
import type { SnapshotField, SummaryStat, TimelineEvent, UpcomingItem } from '../components/dashboard/types'
import { UpcomingMaintenancePanel } from '../components/dashboard/UpcomingMaintenancePanel'
import { VehicleSnapshotCard } from '../components/dashboard/VehicleSnapshotCard'
import { useAuth } from '../auth/useAuth'
import { fallbackVehicleTypeImage, getVehicleTypeImage } from '../lib/vehicleTypes.js'
import type { MaintenancePlan, ServiceRecord as ApiServiceRecord, Vehicle } from '../types/index.js'
import {
    buildSummaryStats,
    buildTimeline,
    buildUpcomingItems,
    fetchApiData,
    fetchAuthenticatedUser
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
    vehicleImageFallback: string
    vehicleImageSrc: string
    summaryStats: SummaryStat[]
    upcomingItems: UpcomingItem[]
    snapshot: SnapshotField[]
    timeline: TimelineEvent[]
}

export async function loader({ params, request }: LoaderFunctionArgs) {
    const vehicleId = Number(params.vehicleId)

    if (!Number.isInteger(vehicleId) || vehicleId < 1) {
        throw new Response('Not found', { status: 404 })
    }

    const [vehicle, records, plans, authUser] = await Promise.all([
        fetchApiData<Vehicle>(request, `/api/vehicles/${vehicleId}`),
        fetchApiData<ApiServiceRecord[]>(request, `/api/vehicles/${vehicleId}/records`),
        fetchApiData<MaintenancePlan[]>(request, `/api/vehicles/${vehicleId}/maintenance-plans`),
        fetchAuthenticatedUser(request)
    ])

    const now = new Date()
    const vehicleLabel = `${vehicle.year} ${vehicle.make} ${vehicle.model}`
    const vehicleImageFallback = getVehicleTypeImage(vehicle.vehicleType)
    const vehicleImageSrc = vehicle.imageUrl ?? vehicleImageFallback
    const upcomingItems = buildUpcomingItems(vehicle, plans, now)
    const summaryStats: SummaryStat[] = buildSummaryStats(vehicle, records, plans, now, authUser.preferredCurrency)

    const snapshot: SnapshotField[] = [
        { label: 'Vehicle Type', value: vehicle.vehicleType || 'Not recorded' },
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

    return {
        vehicleId: params.vehicleId,
        vehicleLabel,
        vehicleImageFallback,
        vehicleImageSrc,
        summaryStats,
        upcomingItems,
        snapshot,
        timeline
    } satisfies DashboardLoaderData
}

const summaryIcons = [Activity, CircleDollarSign, TriangleAlert, CalendarClock] as const

const summaryCardStyles = [
    {
        cardClassName: 'border-primary/20 bg-primary/5',
        iconClassName: 'text-primary'
    },
    {
        cardClassName: 'border-secondary bg-secondary/60',
        iconClassName: 'text-secondary-foreground',
        labelClassName: 'text-secondary-foreground/80',
        valueClassName: 'text-secondary-foreground',
        hintClassName: 'text-secondary-foreground/70'
    },
    {
        cardClassName: 'border-accent bg-accent',
        iconClassName: 'text-accent-foreground',
        labelClassName: 'text-accent-foreground/80',
        valueClassName: 'text-accent-foreground',
        hintClassName: 'text-accent-foreground/70'
    },
    {
        cardClassName: 'border-border bg-card'
    }
] as const

export default function VehicleDashboardRoute() {
    const auth = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const outlet = useOutlet()
    const {
        vehicleId,
        vehicleImageFallback,
        vehicleImageSrc,
        vehicleLabel,
        summaryStats,
        upcomingItems,
        snapshot,
        timeline
    } = useLoaderData<typeof loader>()

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
                    eyebrow='Overview'
                    title={vehicleLabel}
                    description='Service activity, upcoming work, and vehicle health snapshots.'
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
                        <>
                            <Button asChild variant='secondary'>
                                <Link to={`/garage/${vehicleId}/records`}>
                                    <FileText className='h-4 w-4' />
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
                            {...summaryCardStyles[index]}
                        />
                    ))}
                </section>

                <VehicleSnapshotCard fields={snapshot} />

                <section className='grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'>
                    <MaintenanceTimeline events={timeline} />

                    <UpcomingMaintenancePanel items={upcomingItems} />
                </section>
            </div>
        </AuthenticatedShell>
    )
}

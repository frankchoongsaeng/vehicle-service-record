import { Link, useNavigate, useOutletContext, useParams } from '@remix-run/react'
import { X } from 'lucide-react'

import * as api from '../api/client.js'
import ServiceRecordForm from '../components/ServiceRecordForm.js'
import { StatusBadge } from '../components/dashboard/StatusBadge'
import type { ServiceRecord } from '../components/dashboard/types'

interface OutletContext {
    records: ServiceRecord[]
    vehicleId: string | undefined
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className='flex flex-col gap-0.5'>
            <span className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>{label}</span>
            <span className='text-sm text-foreground'>{value}</span>
        </div>
    )
}

export default function RecordDetailRoute() {
    const { vehicleId, recordId } = useParams()
    const navigate = useNavigate()
    const { records } = useOutletContext<OutletContext>()
    const record = records.find(r => r.id === recordId)

    if (recordId === 'new' && vehicleId) {
        return (
            <aside className='sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl'>
                <ServiceRecordForm
                    onSubmit={async data => {
                        const createdRecord = await api.createRecord(Number(vehicleId), data)
                        navigate(`/garage/${vehicleId}/records/${createdRecord.id}`, { replace: true })
                    }}
                    onCancel={() => navigate(`/garage/${vehicleId}/records`)}
                />
            </aside>
        )
    }

    if (!record) {
        return (
            <aside className='rounded-xl border bg-card shadow-sm'>
                <div className='flex items-center justify-between border-b p-4'>
                    <h2 className='font-semibold text-foreground'>Record Details</h2>
                    <Link
                        to={`/garage/${vehicleId}/records`}
                        className='rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
                        aria-label='Close panel'
                    >
                        <X className='h-4 w-4' />
                    </Link>
                </div>
                <p className='p-4 text-sm text-muted-foreground'>Record not found.</p>
            </aside>
        )
    }

    return (
        <aside className='sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border bg-card shadow-sm'>
            <div className='flex items-center justify-between border-b p-4'>
                <div>
                    <p className='text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground'>Inspector</p>
                    <h2 className='font-semibold text-foreground'>Record Details</h2>
                </div>
                <Link
                    to={`/garage/${vehicleId}/records`}
                    className='rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
                    aria-label='Close panel'
                >
                    <X className='h-4 w-4' />
                </Link>
            </div>

            <div className='divide-y'>
                <div className='space-y-4 p-4'>
                    <h3 className='text-base font-semibold text-foreground'>{record.service}</h3>
                    <StatusBadge status={record.status} />
                </div>

                <div className='grid grid-cols-2 gap-4 p-4'>
                    <DetailRow label='Date' value={record.date} />
                    <DetailRow label='Mileage' value={record.mileage} />
                    <DetailRow label='Cost' value={record.cost} />
                    <DetailRow label='Category' value={record.category} />
                </div>

                <div className='space-y-4 p-4'>
                    {record.detail ? <DetailRow label='Description' value={record.detail} /> : null}
                    <DetailRow label='Workshop' value={record.workshop} />
                    {record.notes ? <DetailRow label='Notes' value={record.notes} /> : null}
                </div>
            </div>
        </aside>
    )
}

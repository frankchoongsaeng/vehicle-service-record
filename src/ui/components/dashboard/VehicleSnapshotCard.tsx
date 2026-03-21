import type { SnapshotField } from './types.js'
import { SnapshotRow } from './SnapshotRow.js'

interface VehicleSnapshotCardProps {
    fields: SnapshotField[]
}

export function VehicleSnapshotCard({ fields }: VehicleSnapshotCardProps) {
    return (
        <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
            {fields.map(field => (
                <SnapshotRow key={field.label} label={field.label} value={field.value} />
            ))}
        </div>
    )
}

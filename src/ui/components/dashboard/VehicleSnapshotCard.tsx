import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.js'
import type { SnapshotField } from './types.js'
import { SnapshotRow } from './SnapshotRow.js'

interface VehicleSnapshotCardProps {
    vehicleLabel: string
    fields: SnapshotField[]
}

export function VehicleSnapshotCard({ vehicleLabel, fields }: VehicleSnapshotCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Vehicle Snapshot</CardTitle>
                <p className='text-sm text-slate-500'>{vehicleLabel}</p>
            </CardHeader>
            <CardContent className='space-y-1'>
                {fields.map(field => (
                    <SnapshotRow key={field.label} label={field.label} value={field.value} />
                ))}
            </CardContent>
        </Card>
    )
}

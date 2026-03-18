interface SnapshotRowProps {
    label: string
    value: string
}

export function SnapshotRow({ label, value }: SnapshotRowProps) {
    return (
        <div className='grid grid-cols-[130px_1fr] items-start gap-3 py-2 text-sm'>
            <span className='text-muted-foreground'>{label}</span>
            <span className='font-medium text-foreground'>{value}</span>
        </div>
    )
}

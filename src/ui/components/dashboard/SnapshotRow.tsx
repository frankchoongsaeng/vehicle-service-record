interface SnapshotRowProps {
    label: string
    value: string
}

export function SnapshotRow({ label, value }: SnapshotRowProps) {
    return (
        <div className='flex flex-col gap-1 rounded-lg border bg-muted/30 px-4 py-3 text-sm'>
            <span className='text-xs font-medium normal-case text-muted-foreground'>{label}</span>
            <span className='font-bold text-foreground'>{value}</span>
        </div>
    )
}

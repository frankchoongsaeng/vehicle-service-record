interface SnapshotRowProps {
    label: string
    value: string
}

export function SnapshotRow({ label, value }: SnapshotRowProps) {
    return (
        <div className='grid grid-cols-[130px_1fr] items-start gap-3 py-2 text-sm'>
            <span className='text-slate-500'>{label}</span>
            <span className='font-medium text-slate-800'>{value}</span>
        </div>
    )
}

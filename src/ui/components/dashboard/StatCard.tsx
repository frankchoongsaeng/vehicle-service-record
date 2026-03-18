import type { LucideIcon } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.js'

interface StatCardProps {
    label: string
    value: string
    hint: string
    icon: LucideIcon
}

export function StatCard({ label, value, hint, icon: Icon }: StatCardProps) {
    return (
        <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>{label}</CardTitle>
                <Icon className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
                <div className='text-2xl font-semibold text-foreground'>{value}</div>
                <p className='mt-1 text-xs text-muted-foreground'>{hint}</p>
            </CardContent>
        </Card>
    )
}

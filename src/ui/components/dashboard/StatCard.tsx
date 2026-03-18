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
                <CardTitle className='text-sm font-medium text-slate-600'>{label}</CardTitle>
                <Icon className='h-4 w-4 text-slate-500' />
            </CardHeader>
            <CardContent>
                <div className='text-2xl font-semibold text-slate-900'>{value}</div>
                <p className='mt-1 text-xs text-slate-500'>{hint}</p>
            </CardContent>
        </Card>
    )
}

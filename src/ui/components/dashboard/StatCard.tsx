import type { LucideIcon } from 'lucide-react'

import { cn } from '../../lib/utils.js'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.js'

interface StatCardProps {
    label: string
    value: string
    hint: string
    icon: LucideIcon
    cardClassName?: string
    iconClassName?: string
    labelClassName?: string
    valueClassName?: string
    hintClassName?: string
}

export function StatCard({
    label,
    value,
    hint,
    icon: Icon,
    cardClassName,
    iconClassName,
    labelClassName,
    valueClassName,
    hintClassName
}: StatCardProps) {
    return (
        <Card className={cn(cardClassName)}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className={cn('text-sm font-medium text-muted-foreground', labelClassName)}>
                    {label}
                </CardTitle>
                <Icon className={cn('h-4 w-4 text-muted-foreground', iconClassName)} />
            </CardHeader>
            <CardContent>
                <div className={cn('text-2xl font-semibold text-foreground', valueClassName)}>{value}</div>
                <p className={cn('mt-1 text-xs text-muted-foreground', hintClassName)}>{hint}</p>
            </CardContent>
        </Card>
    )
}

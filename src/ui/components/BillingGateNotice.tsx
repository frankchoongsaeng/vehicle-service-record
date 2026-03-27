import { Link } from '@remix-run/react'
import { ArrowRight, LockKeyhole } from 'lucide-react'

import type { BillingGateResponse } from '../types/index.js'
import { Badge } from './ui/badge.js'
import { Button } from './ui/button.js'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card.js'

type BillingGateNoticeProps = {
    billingError: BillingGateResponse
    title?: string
    compact?: boolean
}

function getUpgradeLabel(billingError: BillingGateResponse): string {
    if (billingError.requiredPlan === 'garage') {
        return 'Upgrade to Garage'
    }

    if (billingError.requiredPlan === 'plus') {
        return 'Upgrade to Plus'
    }

    return 'View plans'
}

export function BillingGateNotice({
    billingError,
    title = 'Upgrade required',
    compact = false
}: BillingGateNoticeProps) {
    return (
        <Card className='border-primary/25 bg-primary/5 shadow-none'>
            <CardHeader className={compact ? 'p-4 pb-2' : undefined}>
                <div className='flex flex-wrap items-center gap-2'>
                    <Badge variant='secondary'>Billing</Badge>
                    <Badge variant='outline'>{billingError.currentPlan.toUpperCase()}</Badge>
                </div>
                <CardTitle className='flex items-center gap-2 text-base'>
                    <LockKeyhole data-icon='inline-start' />
                    {title}
                </CardTitle>
                <CardDescription>{billingError.error}</CardDescription>
            </CardHeader>
            <CardContent className={compact ? 'px-4 pb-0' : undefined}>
                {billingError.requiredPlan ? (
                    <p className='text-sm text-muted-foreground'>
                        {billingError.requiredPlan === 'garage'
                            ? 'Garage unlocks the higher vehicle limit for this action.'
                            : 'Plus unlocks this feature and removes the free-plan blocker.'}
                    </p>
                ) : (
                    <p className='text-sm text-muted-foreground'>
                        Your current plan limit has been reached. Review your billing page for the current usage.
                    </p>
                )}
            </CardContent>
            <CardFooter className={compact ? 'flex-wrap gap-2 p-4 pt-3' : 'flex-wrap gap-2'}>
                <Button asChild size='sm'>
                    <Link to='/pricing'>
                        {getUpgradeLabel(billingError)}
                        <ArrowRight data-icon='inline-end' />
                    </Link>
                </Button>
                <Button asChild variant='outline' size='sm'>
                    <Link to='/settings?tab=billing'>Manage billing</Link>
                </Button>
            </CardFooter>
        </Card>
    )
}

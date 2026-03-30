import { Prisma } from '@prisma/client'

import { prisma } from '../db.js'
import { withServerMonitoringSpan } from '../monitoring/server.js'
import type {
    BillingEntitlementSnapshot,
    BillingFeature,
    BillingInterval,
    BillingLimitSnapshot,
    BillingLimitType,
    BillingSubscriptionState,
    BillingUsageSnapshot,
    PlanCode,
    SubscriptionStatus
} from '../types/billing.js'
import { BILLING_PLANS, isBillingInterval, isPlanCode, isSubscriptionStatus } from '../types/billing.js'
import { createFeatureUnavailableError, createPlanLimitReachedError } from './error.js'

const ACTIVE_SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>(['active', 'trialing', 'past_due'])
const PLAN_ORDER: Record<PlanCode, number> = { free: 0, plus: 1, garage: 2 }

export const billingUserSelect = {
    id: true,
    email: true,
    stripe_customer_id: true,
    plan_code: true,
    billing_interval: true,
    subscription_status: true,
    current_period_end: true,
    cancel_at_period_end: true,
    provider_subscription_id: true,
    provider_price_id: true
} satisfies Prisma.UserSelect

type BillingUserRecord = Prisma.UserGetPayload<{ select: typeof billingUserSelect }>

function normalizePlanCode(value: string | null | undefined): PlanCode {
    return isPlanCode(value) ? value : 'free'
}

function normalizeBillingIntervalValue(value: string | null | undefined): BillingInterval | null {
    return isBillingInterval(value) ? value : null
}

function normalizeSubscriptionStatusValue(value: string | null | undefined): SubscriptionStatus {
    return isSubscriptionStatus(value) ? value : 'free'
}

function isActivePaidSubscription(user: BillingUserRecord): boolean {
    const planCode = normalizePlanCode(user.plan_code)
    const status = normalizeSubscriptionStatusValue(user.subscription_status)

    return planCode !== 'free' && ACTIVE_SUBSCRIPTION_STATUSES.has(status)
}

export function resolveCurrentPlanFromUser(user: BillingUserRecord): PlanCode {
    if (!isActivePaidSubscription(user)) {
        return 'free'
    }

    return normalizePlanCode(user.plan_code)
}

export function getPlanLimits(planCode: PlanCode): BillingLimitSnapshot {
    const plan = BILLING_PLANS[planCode]

    return {
        vehicles: plan.vehicleLimit,
        serviceRecords: plan.serviceRecordLimit,
        workshops: plan.workshopLimit
    }
}

export function hasFeatureAccess(planCode: PlanCode, feature: BillingFeature): boolean {
    return BILLING_PLANS[planCode].features.includes(feature)
}

function buildEntitlements(planCode: PlanCode, usage: BillingUsageSnapshot): BillingEntitlementSnapshot {
    const limits = getPlanLimits(planCode)

    return {
        features: BILLING_PLANS[planCode].features,
        limits,
        usage,
        overLimit: {
            vehicles: limits.vehicles != null && usage.vehicles > limits.vehicles,
            serviceRecords: limits.serviceRecords != null && usage.serviceRecords > limits.serviceRecords,
            workshops: limits.workshops != null && usage.workshops > limits.workshops
        }
    }
}

export async function getUsageCounts(userId: string): Promise<BillingUsageSnapshot> {
    return withServerMonitoringSpan('billing.get_usage_counts', { userId }, async () => {
        const [vehicles, serviceRecords, workshops] = await prisma.$transaction([
            prisma.vehicle.count({ where: { user_id: userId } }),
            prisma.serviceRecord.count({ where: { user_id: userId } }),
            prisma.workshop.count({ where: { user_id: userId } })
        ])

        return {
            vehicles,
            serviceRecords,
            workshops
        }
    })
}

export async function getBillingUser(userId: string): Promise<BillingUserRecord> {
    return withServerMonitoringSpan('billing.get_user', { userId }, async () => {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: billingUserSelect
        })

        if (!user) {
            throw new Error('User not found')
        }

        return user
    })
}

export async function getCurrentPlan(userId: string): Promise<PlanCode> {
    const user = await getBillingUser(userId)
    return resolveCurrentPlanFromUser(user)
}

export async function getBillingSubscriptionState(userId: string): Promise<BillingSubscriptionState> {
    return withServerMonitoringSpan('billing.get_subscription_state', { userId }, async () => {
        const [user, usage] = await Promise.all([getBillingUser(userId), getUsageCounts(userId)])
        const planCode = resolveCurrentPlanFromUser(user)
        const status = normalizeSubscriptionStatusValue(user.subscription_status)

        return {
            planCode,
            planName: BILLING_PLANS[planCode].name,
            subscriptionStatus: status,
            billingInterval: normalizeBillingIntervalValue(user.billing_interval),
            currentPeriodEnd: user.current_period_end?.toISOString() ?? null,
            cancelAtPeriodEnd: Boolean(user.cancel_at_period_end),
            canManageBilling: Boolean(user.stripe_customer_id),
            entitlements: buildEntitlements(planCode, usage)
        }
    })
}

function getNextPlanForVehicleLimit(currentPlan: PlanCode): PlanCode | null {
    if (currentPlan === 'free') {
        return 'plus'
    }

    if (currentPlan === 'plus') {
        return 'garage'
    }

    return null
}

function getRequiredPlanForLimit(currentPlan: PlanCode, limitType: BillingLimitType): PlanCode | null {
    if (limitType === 'vehicles') {
        return getNextPlanForVehicleLimit(currentPlan)
    }

    if (limitType === 'serviceRecords' || limitType === 'workshops') {
        return currentPlan === 'free' ? 'plus' : null
    }

    return null
}

async function getCurrentPlanAndUsage(userId: string): Promise<{ planCode: PlanCode; usage: BillingUsageSnapshot }> {
    const [user, usage] = await Promise.all([getBillingUser(userId), getUsageCounts(userId)])

    return {
        planCode: resolveCurrentPlanFromUser(user),
        usage
    }
}

export async function assertCanCreateVehicle(userId: string): Promise<void> {
    await withServerMonitoringSpan('billing.assert_vehicle_limit', { userId }, async () => {
        const { planCode, usage } = await getCurrentPlanAndUsage(userId)
        const limit = BILLING_PLANS[planCode].vehicleLimit

        if (limit != null && usage.vehicles >= limit) {
            throw createPlanLimitReachedError(
                planCode,
                'vehicles',
                planCode === 'garage'
                    ? 'You have reached the Garage vehicle limit.'
                    : 'Vehicle limit reached for your current plan.',
                getRequiredPlanForLimit(planCode, 'vehicles')
            )
        }
    })
}

export async function assertCanCreateServiceRecord(userId: string): Promise<void> {
    await withServerMonitoringSpan('billing.assert_service_record_limit', { userId }, async () => {
        const { planCode, usage } = await getCurrentPlanAndUsage(userId)
        const limit = BILLING_PLANS[planCode].serviceRecordLimit

        if (limit != null && usage.serviceRecords >= limit) {
            throw createPlanLimitReachedError(
                planCode,
                'serviceRecords',
                'Service record limit reached for your current plan.',
                getRequiredPlanForLimit(planCode, 'serviceRecords')
            )
        }
    })
}

export async function assertCanCreateWorkshop(userId: string): Promise<void> {
    await withServerMonitoringSpan('billing.assert_workshop_limit', { userId }, async () => {
        const { planCode, usage } = await getCurrentPlanAndUsage(userId)
        const limit = BILLING_PLANS[planCode].workshopLimit

        if (limit != null && usage.workshops >= limit) {
            throw createPlanLimitReachedError(
                planCode,
                'workshops',
                'Workshop limit reached for your current plan.',
                getRequiredPlanForLimit(planCode, 'workshops')
            )
        }
    })
}

export async function assertCanUseFeature(userId: string, feature: BillingFeature, message: string): Promise<void> {
    await withServerMonitoringSpan('billing.assert_feature_access', { userId, feature }, async () => {
        const user = await getBillingUser(userId)
        const planCode = resolveCurrentPlanFromUser(user)

        if (!hasFeatureAccess(planCode, feature)) {
            throw createFeatureUnavailableError(planCode, feature, message)
        }
    })
}

export async function canUseFeature(userId: string, feature: BillingFeature): Promise<boolean> {
    const planCode = await getCurrentPlan(userId)
    return hasFeatureAccess(planCode, feature)
}

export async function assertCanManageMaintenancePlans(userId: string): Promise<void> {
    return assertCanUseFeature(userId, 'maintenancePlans', 'Maintenance plans are available on Plus and Garage.')
}

export async function assertCanUseVinLookup(userId: string): Promise<void> {
    return assertCanUseFeature(userId, 'vinLookup', 'VIN lookup is available on Plus and Garage.')
}

export async function assertCanUseVehicleImages(userId: string): Promise<void> {
    return assertCanUseFeature(userId, 'vehicleImages', 'Generated vehicle images are available on Plus and Garage.')
}

export async function assertCanEnableReminderEmails(userId: string): Promise<void> {
    return assertCanUseFeature(
        userId,
        'reminderEmails',
        'Reminder emails and digests are available on Plus and Garage.'
    )
}

export async function assertCanUseVehicleReminderOverrides(userId: string): Promise<void> {
    return assertCanUseFeature(
        userId,
        'vehicleReminderOverrides',
        'Per-vehicle reminder overrides are available on Plus and Garage.'
    )
}

export function comparePlans(left: PlanCode, right: PlanCode): number {
    return PLAN_ORDER[left] - PLAN_ORDER[right]
}

export function getPersistedPlanCodeForStatus(planCode: PlanCode, subscriptionStatus: SubscriptionStatus): PlanCode {
    return ACTIVE_SUBSCRIPTION_STATUSES.has(subscriptionStatus) ? planCode : 'free'
}

export function shouldPersistPaidPlan(subscriptionStatus: SubscriptionStatus): boolean {
    return ACTIVE_SUBSCRIPTION_STATUSES.has(subscriptionStatus)
}

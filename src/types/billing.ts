export const PLAN_CODES = ['free', 'plus', 'garage'] as const
export const BILLING_INTERVALS = ['month', 'year'] as const
export const BILLING_LIMIT_TYPES = ['vehicles', 'serviceRecords', 'workshops'] as const
export const BILLING_FEATURES = [
    'maintenancePlans',
    'reminderEmails',
    'vehicleReminderOverrides',
    'vinLookup',
    'vehicleImages'
] as const
export const SUBSCRIPTION_STATUSES = [
    'free',
    'active',
    'trialing',
    'past_due',
    'canceled',
    'unpaid',
    'incomplete',
    'incomplete_expired'
] as const

export type PlanCode = (typeof PLAN_CODES)[number]
export type BillingInterval = (typeof BILLING_INTERVALS)[number]
export type BillingLimitType = (typeof BILLING_LIMIT_TYPES)[number]
export type BillingFeature = (typeof BILLING_FEATURES)[number]
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]
export type LimitValue = number | null

export type PlanDefinition = {
    code: PlanCode
    name: string
    description: string
    monthlyPrice: number | null
    annualPrice: number | null
    vehicleLimit: LimitValue
    serviceRecordLimit: LimitValue
    workshopLimit: LimitValue
    features: BillingFeature[]
    highlighted?: boolean
}

export type BillingUsageSnapshot = {
    vehicles: number
    serviceRecords: number
    workshops: number
}

export type BillingLimitSnapshot = {
    vehicles: LimitValue
    serviceRecords: LimitValue
    workshops: LimitValue
}

export type BillingEntitlementSnapshot = {
    features: BillingFeature[]
    limits: BillingLimitSnapshot
    usage: BillingUsageSnapshot
    overLimit: Record<BillingLimitType, boolean>
}

export type BillingSubscriptionState = {
    planCode: PlanCode
    planName: string
    subscriptionStatus: SubscriptionStatus
    billingInterval: BillingInterval | null
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
    canManageBilling: boolean
    entitlements: BillingEntitlementSnapshot
}

export type BillingErrorCode = 'FEATURE_NOT_AVAILABLE' | 'PLAN_LIMIT_REACHED'

export type BillingGateResponse = {
    error: string
    code: BillingErrorCode
    currentPlan: PlanCode
    requiredPlan: PlanCode | null
    limitType?: BillingLimitType
    feature?: BillingFeature
}

export const BILLING_PLANS: Record<PlanCode, PlanDefinition> = {
    free: {
        code: 'free',
        name: 'Free',
        description: 'For a single vehicle and basic manual tracking.',
        monthlyPrice: null,
        annualPrice: null,
        vehicleLimit: 1,
        serviceRecordLimit: 25,
        workshopLimit: 1,
        features: []
    },
    plus: {
        code: 'plus',
        name: 'Plus',
        description: 'For households that want proactive maintenance tracking.',
        monthlyPrice: 4.99,
        annualPrice: 49,
        vehicleLimit: 5,
        serviceRecordLimit: null,
        workshopLimit: null,
        features: ['maintenancePlans', 'reminderEmails', 'vehicleReminderOverrides', 'vinLookup', 'vehicleImages'],
        highlighted: true
    },
    garage: {
        code: 'garage',
        name: 'Garage',
        description: 'For enthusiasts and multi-vehicle households.',
        monthlyPrice: 8.99,
        annualPrice: 89,
        vehicleLimit: 15,
        serviceRecordLimit: null,
        workshopLimit: null,
        features: ['maintenancePlans', 'reminderEmails', 'vehicleReminderOverrides', 'vinLookup', 'vehicleImages']
    }
}

export function isPlanCode(value: string | null | undefined): value is PlanCode {
    return Boolean(value && PLAN_CODES.includes(value as PlanCode))
}

export function isBillingInterval(value: string | null | undefined): value is BillingInterval {
    return Boolean(value && BILLING_INTERVALS.includes(value as BillingInterval))
}

export function isSubscriptionStatus(value: string | null | undefined): value is SubscriptionStatus {
    return Boolean(value && SUBSCRIPTION_STATUSES.includes(value as SubscriptionStatus))
}

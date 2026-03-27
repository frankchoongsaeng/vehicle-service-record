import type { Request } from 'express'
import Stripe from 'stripe'

import type { BillingInterval, PlanCode } from '../types/billing.js'

let stripeClient: Stripe | null = null

function trimEnv(value: string | undefined): string | null {
    const normalized = value?.trim()
    return normalized ? normalized : null
}

export function getStripeClient(): Stripe {
    const secretKey = trimEnv(process.env.STRIPE_SECRET_KEY)

    if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY is not configured')
    }

    if (!stripeClient) {
        stripeClient = new Stripe(secretKey)
    }

    return stripeClient
}

export function getStripeWebhookSecret(): string {
    const webhookSecret = trimEnv(process.env.STRIPE_WEBHOOK_SECRET)

    if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
    }

    return webhookSecret
}

const STRIPE_PRICE_IDS: Record<Exclude<PlanCode, 'free'>, Record<BillingInterval, string | null>> = {
    plus: {
        month: trimEnv(process.env.STRIPE_PRICE_ID_PLUS_MONTHLY),
        year: trimEnv(process.env.STRIPE_PRICE_ID_PLUS_YEARLY)
    },
    garage: {
        month: trimEnv(process.env.STRIPE_PRICE_ID_GARAGE_MONTHLY),
        year: trimEnv(process.env.STRIPE_PRICE_ID_GARAGE_YEARLY)
    }
}

export function getStripePriceId(planCode: Exclude<PlanCode, 'free'>, interval: BillingInterval): string {
    const priceId = STRIPE_PRICE_IDS[planCode][interval]

    if (!priceId) {
        throw new Error(`Missing Stripe price ID for ${planCode} ${interval}`)
    }

    return priceId
}

export function getPlanForPriceId(priceId: string | null | undefined): {
    planCode: Exclude<PlanCode, 'free'>
    billingInterval: BillingInterval
} | null {
    const normalizedPriceId = trimEnv(priceId ?? undefined)

    if (!normalizedPriceId) {
        return null
    }

    for (const [planCode, intervals] of Object.entries(STRIPE_PRICE_IDS) as Array<
        [Exclude<PlanCode, 'free'>, Record<BillingInterval, string | null>]
    >) {
        for (const [billingInterval, candidatePriceId] of Object.entries(intervals) as Array<
            [BillingInterval, string | null]
        >) {
            if (candidatePriceId === normalizedPriceId) {
                return { planCode, billingInterval }
            }
        }
    }

    return null
}

function resolveAppOrigin(req: Request): string {
    const configured = trimEnv(process.env.APP_ORIGIN)

    if (configured) {
        return configured.replace(/\/+$/, '')
    }

    return `${req.protocol}://${req.get('host')}`
}

export function getBillingReturnUrl(req: Request): string {
    return getBillingReturnUrlForPath(req, null)
}

export function getBillingReturnUrlForPath(req: Request, returnPath: string | null): string {
    if (returnPath) {
        return `${resolveAppOrigin(req)}${returnPath.startsWith('/') ? returnPath : `/${returnPath}`}`
    }

    const configured = trimEnv(process.env.APP_BILLING_RETURN_URL)

    if (configured) {
        if (/^https?:\/\//i.test(configured)) {
            return configured
        }

        return `${resolveAppOrigin(req)}${configured.startsWith('/') ? configured : `/${configured}`}`
    }

    return `${resolveAppOrigin(req)}/settings?tab=billing`
}

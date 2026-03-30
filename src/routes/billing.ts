import { raw, Request, type RequestHandler, Response, Router } from 'express'
import Stripe from 'stripe'

import { prisma } from '../db.js'
import { createLogger } from '../logging/logger.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { captureServerException } from '../monitoring/server.js'
import type { BillingInterval, PlanCode, SubscriptionStatus } from '../types/billing.js'
import { isBillingInterval, isPlanCode } from '../types/billing.js'
import { getBillingSubscriptionState, getBillingUser, getPersistedPlanCodeForStatus } from '../billing/service.js'
import {
    getBillingReturnUrl,
    getBillingReturnUrlForPath,
    getPlanForPriceId,
    getStripeClient,
    getStripePriceId,
    getStripeWebhookSecret
} from '../billing/stripe.js'

const router = Router()
const billingLogger = createLogger({ component: 'billing-routes' })

type CheckoutRequestBody = {
    planCode?: unknown
    billingInterval?: unknown
    returnPath?: unknown
}

function normalizePaidPlanCode(value: unknown): Exclude<PlanCode, 'free'> | null {
    if (typeof value !== 'string' || !isPlanCode(value) || value === 'free') {
        return null
    }

    return value
}

function normalizeBillingIntervalValue(value: unknown): BillingInterval | null {
    if (typeof value !== 'string' || !isBillingInterval(value)) {
        return null
    }

    return value
}

function normalizeReturnPath(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null
    }

    const normalized = value.trim()

    if (!normalized || !normalized.startsWith('/') || normalized.startsWith('//')) {
        return null
    }

    return normalized
}

async function ensureStripeCustomer(userId: string, email: string): Promise<string> {
    const user = await getBillingUser(userId)

    if (user.stripe_customer_id) {
        return user.stripe_customer_id
    }

    const stripe = getStripeClient()
    const customer = await stripe.customers.create({
        email,
        metadata: {
            userId
        }
    })

    await prisma.user.update({
        where: { id: userId },
        data: {
            stripe_customer_id: customer.id
        }
    })

    return customer.id
}

function normalizeStripeSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    switch (status) {
        case 'active':
        case 'trialing':
        case 'past_due':
        case 'canceled':
        case 'unpaid':
        case 'incomplete':
        case 'incomplete_expired':
            return status
        default:
            return 'free'
    }
}

async function syncStripeSubscription(subscription: Stripe.Subscription): Promise<string | null> {
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
    const priceId = subscription.items.data[0]?.price.id ?? null
    const currentPeriodEnd = subscription.items.data[0]?.current_period_end ?? null
    const plan = getPlanForPriceId(priceId)
    const userIdFromMetadata = subscription.metadata.userId?.trim() || null
    const targetUser = userIdFromMetadata
        ? await prisma.user.findUnique({ where: { id: userIdFromMetadata }, select: { id: true } })
        : await prisma.user.findFirst({
              where: { stripe_customer_id: customerId },
              select: { id: true }
          })

    if (!targetUser) {
        billingLogger.warn('billing.subscription_sync_user_not_found', {
            customerId,
            providerSubscriptionId: subscription.id
        })
        return null
    }

    const normalizedStatus = normalizeStripeSubscriptionStatus(subscription.status)
    const planCode = getPersistedPlanCodeForStatus(plan?.planCode ?? 'free', normalizedStatus)

    await prisma.user.update({
        where: { id: targetUser.id },
        data: {
            stripe_customer_id: customerId,
            plan_code: planCode,
            billing_interval: plan?.billingInterval ?? null,
            subscription_status: normalizedStatus,
            current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
            provider_subscription_id: subscription.id,
            provider_price_id: priceId
        }
    })

    return targetUser.id
}

async function handleStripeEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session
            const userId = session.metadata?.userId?.trim()
            const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id

            if (userId && customerId) {
                await prisma.user.update({
                    where: { id: userId },
                    data: { stripe_customer_id: customerId }
                })
            }

            if (typeof session.subscription === 'string') {
                const stripe = getStripeClient()
                const subscription = await stripe.subscriptions.retrieve(session.subscription)
                await syncStripeSubscription(subscription)
            }

            break
        }
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
            await syncStripeSubscription(event.data.object as Stripe.Subscription)
            break
        }
        default:
            break
    }
}

export const stripeWebhookRawParser = raw({ type: 'application/json' })

export const stripeWebhookHandler: RequestHandler = async (req, res) => {
    const signature = req.headers['stripe-signature']

    if (typeof signature !== 'string') {
        res.status(400).json({ error: 'Missing Stripe signature header.' })
        return
    }

    try {
        const stripe = getStripeClient()
        const webhookSecret = getStripeWebhookSecret()
        const event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret)

        await handleStripeEvent(event)

        billingLogger.info('billing.webhook_processed', {
            eventId: event.id,
            eventType: event.type
        })

        res.json({ received: true })
    } catch (error) {
        captureServerException(error, {
            requestId: req.requestId,
            route: 'billing.webhook',
            hasSignature: true
        })
        billingLogger.error('billing.webhook_failed', { error })
        res.status(400).json({ error: error instanceof Error ? error.message : 'Webhook processing failed.' })
    }
}

router.use(requireAuth)

router.get(
    '/subscription',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const subscription = await getBillingSubscriptionState(authUser.id)

        res.json(subscription)
    })
)

router.post(
    '/checkout-session',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const body = (req.body ?? {}) as CheckoutRequestBody
        const planCode = normalizePaidPlanCode(body.planCode)
        const billingInterval = normalizeBillingIntervalValue(body.billingInterval)
        const returnPath = normalizeReturnPath(body.returnPath)

        if (!planCode || !billingInterval) {
            res.status(400).json({ error: 'Choose a valid paid plan and billing interval.' })
            return
        }

        const stripe = getStripeClient()
        const customerId = await ensureStripeCustomer(authUser.id, authUser.email)
        const returnUrl = returnPath ? getBillingReturnUrlForPath(req, returnPath) : getBillingReturnUrl(req)
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            line_items: [
                {
                    price: getStripePriceId(planCode, billingInterval),
                    quantity: 1
                }
            ],
            allow_promotion_codes: true,
            client_reference_id: authUser.id,
            success_url: `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}checkout=success`,
            cancel_url: `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}checkout=canceled`,
            metadata: {
                userId: authUser.id,
                planCode,
                billingInterval
            },
            subscription_data: {
                metadata: {
                    userId: authUser.id,
                    planCode,
                    billingInterval
                }
            }
        })

        if (!session.url) {
            res.status(502).json({ error: 'Stripe did not return a checkout URL.' })
            return
        }

        billingLogger.info('billing.checkout_session_created', {
            requestId: req.requestId,
            userId: authUser.id,
            planCode,
            billingInterval,
            stripeCustomerId: customerId
        })

        res.status(201).json({ url: session.url })
    })
)

router.post(
    '/customer-portal-session',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const user = await getBillingUser(authUser.id)

        if (!user.stripe_customer_id) {
            res.status(400).json({ error: 'You do not have an active billing customer yet.' })
            return
        }

        const stripe = getStripeClient()
        const session = await stripe.billingPortal.sessions.create({
            customer: user.stripe_customer_id,
            return_url: getBillingReturnUrl(req)
        })

        res.status(201).json({ url: session.url })
    })
)

export default router

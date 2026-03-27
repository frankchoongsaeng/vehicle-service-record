import type { Response } from 'express'

import type { BillingFeature, BillingGateResponse, BillingLimitType, PlanCode } from '../types/billing.js'

export class BillingAccessError extends Error {
    status: number
    payload: BillingGateResponse

    constructor(status: number, payload: BillingGateResponse) {
        super(payload.error)
        this.name = 'BillingAccessError'
        this.status = status
        this.payload = payload
    }
}

export function isBillingAccessError(error: unknown): error is BillingAccessError {
    return error instanceof BillingAccessError
}

export function sendBillingError(res: Response, error: BillingAccessError): void {
    res.status(error.status).json(error.payload)
}

export function createFeatureUnavailableError(
    currentPlan: PlanCode,
    feature: BillingFeature,
    message: string,
    requiredPlan: PlanCode = 'plus'
): BillingAccessError {
    return new BillingAccessError(403, {
        error: message,
        code: 'FEATURE_NOT_AVAILABLE',
        currentPlan,
        requiredPlan,
        feature
    })
}

export function createPlanLimitReachedError(
    currentPlan: PlanCode,
    limitType: BillingLimitType,
    message: string,
    requiredPlan: PlanCode | null
): BillingAccessError {
    return new BillingAccessError(403, {
        error: message,
        code: 'PLAN_LIMIT_REACHED',
        currentPlan,
        requiredPlan,
        limitType
    })
}

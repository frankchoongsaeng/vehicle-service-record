import { Router, Request, Response } from 'express'

import { prisma } from '../db.js'
import { createLogger } from '../logging/logger.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { isServiceTypeValue, type ServiceTypeValue } from '../types/serviceTypes.js'

const router = Router({ mergeParams: true })
const maintenancePlansLogger = createLogger({ component: 'maintenance-plan-routes' })

type MaintenancePlanPayload = {
    serviceType: ServiceTypeValue
    title: string
    description?: string
    intervalMonths?: number
    intervalMileage?: number
    lastCompletedDate?: string
    lastCompletedMileage?: number
}

function isIsoDate(value: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function normalizeOptionalPositiveInteger(value: unknown): number | null {
    if (value == null || value === '') {
        return null
    }

    const normalized = Number(value)

    if (!Number.isInteger(normalized) || normalized <= 0) {
        return Number.NaN
    }

    return normalized
}

function normalizeOptionalDate(value: unknown): string | null {
    if (typeof value !== 'string' || value.trim().length === 0) {
        return null
    }

    const normalized = value.trim()

    if (!isIsoDate(normalized)) {
        return 'invalid'
    }

    return normalized
}

function normalizeMaintenancePlanPayload(body: unknown): { data?: MaintenancePlanPayload; error?: string } {
    const raw = (body ?? {}) as Record<string, unknown>
    const serviceType = typeof raw.serviceType === 'string' ? raw.serviceType.trim() : ''
    const title = typeof raw.title === 'string' ? raw.title.trim() : ''
    const description = typeof raw.description === 'string' ? raw.description.trim() : ''
    const intervalMonths = normalizeOptionalPositiveInteger(raw.intervalMonths)
    const intervalMileage = normalizeOptionalPositiveInteger(raw.intervalMileage)
    const lastCompletedMileage = normalizeOptionalPositiveInteger(raw.lastCompletedMileage)
    const lastCompletedDate = normalizeOptionalDate(raw.lastCompletedDate)

    if (!isServiceTypeValue(serviceType)) {
        return { error: 'Choose a valid service type.' }
    }

    if (!title) {
        return { error: 'Enter a plan title.' }
    }

    if (Number.isNaN(intervalMonths) || Number.isNaN(intervalMileage)) {
        return { error: 'Reminder intervals must be positive whole numbers.' }
    }

    if (intervalMonths == null && intervalMileage == null) {
        return { error: 'Add a time interval, a mileage interval, or both.' }
    }

    if (Number.isNaN(lastCompletedMileage)) {
        return { error: 'Last completed mileage must be a positive whole number.' }
    }

    if (lastCompletedDate === 'invalid') {
        return { error: 'Last completed date must use the YYYY-MM-DD format.' }
    }

    return {
        data: {
            serviceType,
            title,
            description: description || undefined,
            intervalMonths: intervalMonths ?? undefined,
            intervalMileage: intervalMileage ?? undefined,
            lastCompletedDate: lastCompletedDate ?? undefined,
            lastCompletedMileage: lastCompletedMileage ?? undefined
        }
    }
}

function serializeMaintenancePlan(plan: {
    id: number
    vehicle_id: number
    service_type: string
    title: string
    description: string | null
    interval_months: number | null
    interval_mileage: number | null
    last_completed_date: string | null
    last_completed_mileage: number | null
    created_at: Date
    updated_at: Date
}) {
    return {
        id: plan.id,
        vehicleId: plan.vehicle_id,
        serviceType: plan.service_type,
        title: plan.title,
        description: plan.description,
        intervalMonths: plan.interval_months,
        intervalMileage: plan.interval_mileage,
        lastCompletedDate: plan.last_completed_date,
        lastCompletedMileage: plan.last_completed_mileage,
        created_at: plan.created_at,
        updated_at: plan.updated_at
    }
}

async function findOwnedVehicle(userId: string, vehicleId: number) {
    return prisma.vehicle.findFirst({
        where: {
            id: vehicleId,
            user_id: userId
        }
    })
}

router.use(requireAuth)

router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const vehicleId = Number(req.params.vehicleId)
        const vehicle = await findOwnedVehicle(authUser.id, vehicleId)

        if (!vehicle) {
            maintenancePlansLogger.warn('maintenance_plans.list_vehicle_not_found', {
                requestId: req.requestId,
                userId: authUser.id,
                vehicleId
            })
            res.status(404).json({ error: 'Vehicle not found' })
            return
        }

        const plans = await prisma.maintenancePlan.findMany({
            where: {
                user_id: authUser.id,
                vehicle_id: vehicleId
            },
            orderBy: [{ updated_at: 'desc' }, { id: 'desc' }]
        })

        maintenancePlansLogger.debug('maintenance_plans.listed', {
            requestId: req.requestId,
            userId: authUser.id,
            vehicleId,
            count: plans.length
        })

        res.json(plans.map(serializeMaintenancePlan))
    })
)

router.get(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const vehicleId = Number(req.params.vehicleId)
        const planId = Number(req.params.id)

        const plan = await prisma.maintenancePlan.findFirst({
            where: {
                id: planId,
                user_id: authUser.id,
                vehicle_id: vehicleId
            }
        })

        if (!plan) {
            maintenancePlansLogger.warn('maintenance_plans.get_not_found', {
                requestId: req.requestId,
                userId: authUser.id,
                vehicleId,
                planId
            })
            res.status(404).json({ error: 'Maintenance plan not found' })
            return
        }

        maintenancePlansLogger.debug('maintenance_plans.fetched', {
            requestId: req.requestId,
            userId: authUser.id,
            vehicleId,
            planId
        })

        res.json(serializeMaintenancePlan(plan))
    })
)

router.post(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const vehicleId = Number(req.params.vehicleId)
        const vehicle = await findOwnedVehicle(authUser.id, vehicleId)

        if (!vehicle) {
            maintenancePlansLogger.warn('maintenance_plans.create_vehicle_not_found', {
                requestId: req.requestId,
                userId: authUser.id,
                vehicleId
            })
            res.status(404).json({ error: 'Vehicle not found' })
            return
        }

        const { data, error } = normalizeMaintenancePlanPayload(req.body)

        if (!data) {
            maintenancePlansLogger.warn('maintenance_plans.create_invalid_payload', {
                requestId: req.requestId,
                userId: authUser.id,
                vehicleId,
                error,
                bodyKeys: Object.keys((req.body ?? {}) as Record<string, unknown>)
            })
            res.status(400).json({ error })
            return
        }

        const createdPlan = await prisma.maintenancePlan.create({
            data: {
                user_id: authUser.id,
                vehicle_id: vehicleId,
                service_type: data.serviceType,
                title: data.title,
                description: data.description ?? null,
                interval_months: data.intervalMonths ?? null,
                interval_mileage: data.intervalMileage ?? null,
                last_completed_date: data.lastCompletedDate ?? null,
                last_completed_mileage: data.lastCompletedMileage ?? null
            }
        })

        maintenancePlansLogger.info('maintenance_plans.created', {
            requestId: req.requestId,
            userId: authUser.id,
            vehicleId,
            planId: createdPlan.id,
            title: createdPlan.title
        })

        res.status(201).json(serializeMaintenancePlan(createdPlan))
    })
)

router.put(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const vehicleId = Number(req.params.vehicleId)
        const planId = Number(req.params.id)
        const { data, error } = normalizeMaintenancePlanPayload(req.body)

        if (!data) {
            maintenancePlansLogger.warn('maintenance_plans.update_invalid_payload', {
                requestId: req.requestId,
                userId: authUser.id,
                vehicleId,
                planId,
                error,
                bodyKeys: Object.keys((req.body ?? {}) as Record<string, unknown>)
            })
            res.status(400).json({ error })
            return
        }

        const existingPlan = await prisma.maintenancePlan.findFirst({
            where: {
                id: planId,
                user_id: authUser.id,
                vehicle_id: vehicleId
            }
        })

        if (!existingPlan) {
            maintenancePlansLogger.warn('maintenance_plans.update_not_found', {
                requestId: req.requestId,
                userId: authUser.id,
                vehicleId,
                planId
            })
            res.status(404).json({ error: 'Maintenance plan not found' })
            return
        }

        const updatedPlan = await prisma.maintenancePlan.update({
            where: { id: planId },
            data: {
                service_type: data.serviceType,
                title: data.title,
                description: data.description ?? null,
                interval_months: data.intervalMonths ?? null,
                interval_mileage: data.intervalMileage ?? null,
                last_completed_date: data.lastCompletedDate ?? null,
                last_completed_mileage: data.lastCompletedMileage ?? null
            }
        })

        maintenancePlansLogger.info('maintenance_plans.updated', {
            requestId: req.requestId,
            userId: authUser.id,
            vehicleId,
            planId,
            title: updatedPlan.title
        })

        res.json(serializeMaintenancePlan(updatedPlan))
    })
)

router.delete(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const vehicleId = Number(req.params.vehicleId)
        const planId = Number(req.params.id)

        const existingPlan = await prisma.maintenancePlan.findFirst({
            where: {
                id: planId,
                user_id: authUser.id,
                vehicle_id: vehicleId
            }
        })

        if (!existingPlan) {
            maintenancePlansLogger.warn('maintenance_plans.delete_not_found', {
                requestId: req.requestId,
                userId: authUser.id,
                vehicleId,
                planId
            })
            res.status(404).json({ error: 'Maintenance plan not found' })
            return
        }

        await prisma.maintenancePlan.delete({ where: { id: planId } })

        maintenancePlansLogger.info('maintenance_plans.deleted', {
            requestId: req.requestId,
            userId: authUser.id,
            vehicleId,
            planId
        })

        res.status(204).send()
    })
)

export default router

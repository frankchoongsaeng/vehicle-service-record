import { Prisma } from '@prisma/client'
import { Router, Request, Response } from 'express'
import { prisma } from '../db.js'
import { createLogger } from '../logging/logger.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router({ mergeParams: true })
const recordsLogger = createLogger({ component: 'service-record-routes' })

const serviceTypeLabels = new Map<string, string>([
    ['oil_change', 'Oil Change'],
    ['tire_rotation', 'Tire Rotation'],
    ['brake_service', 'Brake Service'],
    ['tire_replacement', 'Tire Replacement'],
    ['battery', 'Battery Replacement'],
    ['air_filter', 'Air Filter'],
    ['cabin_filter', 'Cabin Filter'],
    ['transmission', 'Transmission Service'],
    ['coolant', 'Coolant Flush'],
    ['spark_plugs', 'Spark Plugs'],
    ['timing_belt', 'Timing Belt / Chain'],
    ['wiper_blades', 'Wiper Blades'],
    ['inspection', 'Inspection'],
    ['other', 'Other']
])

type ServiceRecordWriteInput = {
    service_type: string
    description: string
    date: string
    mileage: number | null
}

function normalizeMatchText(value: string) {
    return value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
}

function getRecordMatchKeys(record: ServiceRecordWriteInput) {
    const keys = new Set<string>()

    for (const candidate of [
        record.service_type,
        record.service_type.replace(/_/g, ' '),
        serviceTypeLabels.get(record.service_type),
        record.description
    ]) {
        if (!candidate) {
            continue
        }

        const normalized = normalizeMatchText(candidate)

        if (normalized) {
            keys.add(normalized)
        }
    }

    return keys
}

function shouldUpdateCompletedDate(nextDate: string, currentDate: string | null) {
    return currentDate == null || nextDate > currentDate
}

function shouldUpdateCompletedMileage(nextMileage: number | null, currentMileage: number | null) {
    return nextMileage != null && (currentMileage == null || nextMileage > currentMileage)
}

async function syncMatchingMaintenancePlans(
    transaction: Prisma.TransactionClient,
    userId: string,
    vehicleId: number,
    record: ServiceRecordWriteInput
) {
    const matchKeys = getRecordMatchKeys(record)

    if (matchKeys.size === 0) {
        return 0
    }

    const plans = await transaction.maintenancePlan.findMany({
        where: {
            user_id: userId,
            vehicle_id: vehicleId
        },
        select: {
            id: true,
            last_completed_date: true,
            last_completed_mileage: true,
            items: {
                select: {
                    name: true
                }
            }
        }
    })

    const matchingPlans = plans.filter(plan => plan.items.some(item => matchKeys.has(normalizeMatchText(item.name))))

    const updates = matchingPlans.flatMap(plan => {
        const data: {
            last_completed_date?: string
            last_completed_mileage?: number
        } = {}

        if (shouldUpdateCompletedDate(record.date, plan.last_completed_date)) {
            data.last_completed_date = record.date
        }

        if (shouldUpdateCompletedMileage(record.mileage, plan.last_completed_mileage)) {
            data.last_completed_mileage = record.mileage as number
        }

        if (Object.keys(data).length === 0) {
            return []
        }

        return [
            transaction.maintenancePlan.update({
                where: { id: plan.id },
                data
            })
        ]
    })

    if (updates.length === 0) {
        return 0
    }

    await Promise.all(updates)
    return updates.length
}

router.use(requireAuth)

// GET /api/vehicles/:vehicleId/records
router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const vehicleId = Number(req.params.vehicleId)
        const vehicle = await prisma.vehicle.findFirst({
            where: {
                id: vehicleId,
                user_id: authUser.id
            }
        })
        if (!vehicle) {
            recordsLogger.warn('records.list_vehicle_not_found', {
                requestId: req.requestId,
                userId: authUser.id,
                vehicleId
            })
            res.status(404).json({ error: 'Vehicle not found' })
            return
        }

        const records = await prisma.serviceRecord.findMany({
            where: {
                vehicle_id: vehicleId,
                user_id: authUser.id
            },
            orderBy: [{ date: 'desc' }, { id: 'desc' }]
        })

        recordsLogger.debug('records.listed', {
            requestId: req.requestId,
            userId: authUser.id,
            vehicleId,
            count: records.length
        })

        res.json(records)
    })
)

// GET /api/vehicles/:vehicleId/records/:id
router.get(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const recordId = Number(req.params.id)
        const vehicleId = Number(req.params.vehicleId)
        const record = await prisma.serviceRecord.findFirst({
            where: {
                id: recordId,
                vehicle_id: vehicleId,
                user_id: authUser.id
            }
        })
        if (!record) {
            recordsLogger.warn('records.get_not_found', {
                requestId: req.requestId,
                userId: authUser.id,
                vehicleId,
                recordId
            })
            res.status(404).json({ error: 'Service record not found' })
            return
        }

        recordsLogger.debug('records.fetched', {
            requestId: req.requestId,
            userId: authUser.id,
            vehicleId,
            recordId
        })

        res.json(record)
    })
)

// POST /api/vehicles/:vehicleId/records
router.post(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const { service_type, description, date, mileage, cost, notes } = req.body as {
            service_type: string
            description: string
            date: string
            mileage?: number
            cost?: number
            notes?: string
        }

        if (!service_type || !description || !date) {
            recordsLogger.warn('records.create_invalid_payload', {
                requestId: req.requestId,
                userId: authUser.id,
                vehicleId: Number(req.params.vehicleId),
                bodyKeys: Object.keys((req.body ?? {}) as Record<string, unknown>)
            })
            res.status(400).json({ error: 'service_type, description, and date are required' })
            return
        }

        const vehicleId = Number(req.params.vehicleId)
        const vehicle = await prisma.vehicle.findFirst({
            where: {
                id: vehicleId,
                user_id: authUser.id
            }
        })
        if (!vehicle) {
            recordsLogger.warn('records.create_vehicle_not_found', {
                requestId: req.requestId,
                userId: authUser.id,
                vehicleId
            })
            res.status(404).json({ error: 'Vehicle not found' })
            return
        }

        const { created, matchedPlanCount } = await prisma.$transaction(async transaction => {
            const created = await transaction.serviceRecord.create({
                data: {
                    user_id: authUser.id,
                    vehicle_id: vehicleId,
                    service_type,
                    description,
                    date,
                    mileage: mileage ?? null,
                    cost: cost ?? null,
                    notes: notes || null
                }
            })

            const matchedPlanCount = await syncMatchingMaintenancePlans(transaction, authUser.id, vehicleId, {
                service_type: created.service_type,
                description: created.description,
                date: created.date,
                mileage: created.mileage
            })

            return { created, matchedPlanCount }
        })

        recordsLogger.info('records.created', {
            requestId: req.requestId,
            userId: authUser.id,
            vehicleId,
            recordId: created.id,
            serviceType: created.service_type,
            date: created.date,
            matchedPlanCount
        })

        res.status(201).json(created)
    })
)

// PUT /api/vehicles/:vehicleId/records/:id
router.put(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const { service_type, description, date, mileage, cost, notes } = req.body as {
            service_type: string
            description: string
            date: string
            mileage?: number
            cost?: number
            notes?: string
        }

        if (!service_type || !description || !date) {
            recordsLogger.warn('records.update_invalid_payload', {
                requestId: req.requestId,
                userId: authUser.id,
                vehicleId: Number(req.params.vehicleId),
                recordId: Number(req.params.id),
                bodyKeys: Object.keys((req.body ?? {}) as Record<string, unknown>)
            })
            res.status(400).json({ error: 'service_type, description, and date are required' })
            return
        }

        const recordId = Number(req.params.id)
        const vehicleId = Number(req.params.vehicleId)
        const existing = await prisma.serviceRecord.findFirst({
            where: {
                id: recordId,
                vehicle_id: vehicleId,
                user_id: authUser.id
            }
        })
        if (!existing) {
            recordsLogger.warn('records.update_not_found', {
                requestId: req.requestId,
                userId: authUser.id,
                vehicleId,
                recordId
            })
            res.status(404).json({ error: 'Service record not found' })
            return
        }

        const { updated, matchedPlanCount } = await prisma.$transaction(async transaction => {
            const updated = await transaction.serviceRecord.update({
                where: { id: recordId },
                data: {
                    service_type,
                    description,
                    date,
                    mileage: mileage ?? null,
                    cost: cost ?? null,
                    notes: notes || null
                }
            })

            const matchedPlanCount = await syncMatchingMaintenancePlans(transaction, authUser.id, vehicleId, {
                service_type: updated.service_type,
                description: updated.description,
                date: updated.date,
                mileage: updated.mileage
            })

            return { updated, matchedPlanCount }
        })

        recordsLogger.info('records.updated', {
            requestId: req.requestId,
            userId: authUser.id,
            vehicleId,
            recordId: updated.id,
            serviceType: updated.service_type,
            date: updated.date,
            matchedPlanCount
        })

        res.json(updated)
    })
)

// DELETE /api/vehicles/:vehicleId/records/:id
router.delete(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const recordId = Number(req.params.id)
        const vehicleId = Number(req.params.vehicleId)
        const existing = await prisma.serviceRecord.findFirst({
            where: {
                id: recordId,
                vehicle_id: vehicleId,
                user_id: authUser.id
            }
        })
        if (!existing) {
            recordsLogger.warn('records.delete_not_found', {
                requestId: req.requestId,
                userId: authUser.id,
                vehicleId,
                recordId
            })
            res.status(404).json({ error: 'Service record not found' })
            return
        }

        await prisma.serviceRecord.delete({ where: { id: recordId } })
        recordsLogger.info('records.deleted', {
            requestId: req.requestId,
            userId: authUser.id,
            vehicleId,
            recordId
        })
        res.status(204).send()
    })
)

export default router

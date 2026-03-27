import { Prisma } from '@prisma/client'
import { Router, Request, Response } from 'express'
import { isBillingAccessError, sendBillingError } from '../billing/error.js'
import { assertCanCreateServiceRecord, assertCanCreateWorkshop } from '../billing/service.js'
import { prisma } from '../db.js'
import { createLogger } from '../logging/logger.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { getServiceTypeLabel } from '../types/serviceTypes.js'
import { ensureWorkshopExists } from './workshopDirectory.js'

const router = Router({ mergeParams: true })
const recordsLogger = createLogger({ component: 'service-record-routes' })

const limitedRecordUpdateFields = ['workshop', 'description', 'cost', 'notes'] as const

type ServiceRecordWriteInput = {
    maintenance_plan_id?: number | null
    service_type: string
    description: string
    date: string
    mileage: number | null
}

type MaintenancePlanBaselineRecord = ServiceRecordWriteInput

function normalizeWorkshopLookupName(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function normalizeMatchText(value: string) {
    return value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
}

function getRecordMatchKeys(record: ServiceRecordWriteInput) {
    const keys = new Set<string>()

    for (const candidate of [
        record.service_type,
        record.service_type.replace(/_/g, ' '),
        getServiceTypeLabel(record.service_type),
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

function getPlanMatchKeys(plan: { service_type: string }) {
    const keys = new Set<string>()

    for (const candidate of [plan.service_type, getServiceTypeLabel(plan.service_type)]) {
        const normalized = normalizeMatchText(candidate)

        if (normalized) {
            keys.add(normalized)
        }
    }

    return keys
}

function hasMatchingPlanItem(recordKeys: Set<string>, planKeys: Set<string>) {
    for (const key of recordKeys) {
        if (planKeys.has(key)) {
            return true
        }
    }

    return false
}

function getLatestCompletedDate(records: MaintenancePlanBaselineRecord[]) {
    let latestDate: string | null = null

    for (const record of records) {
        if (latestDate == null || record.date > latestDate) {
            latestDate = record.date
        }
    }

    return latestDate
}

function getLatestCompletedMileage(records: MaintenancePlanBaselineRecord[]) {
    let latestMileage: number | null = null

    for (const record of records) {
        if (record.mileage == null) {
            continue
        }

        if (latestMileage == null || record.mileage > latestMileage) {
            latestMileage = record.mileage
        }
    }

    return latestMileage
}

async function recomputeMaintenancePlanBaselines(
    transaction: Prisma.TransactionClient,
    userId: string,
    vehicleId: number
) {
    const [plans, records] = await Promise.all([
        transaction.maintenancePlan.findMany({
            where: {
                user_id: userId,
                vehicle_id: vehicleId
            },
            select: {
                id: true,
                service_type: true,
                last_completed_date: true,
                last_completed_mileage: true
            }
        }),
        transaction.serviceRecord.findMany({
            where: {
                user_id: userId,
                vehicle_id: vehicleId
            },
            select: {
                maintenance_plan_id: true,
                service_type: true,
                description: true,
                date: true,
                mileage: true
            }
        })
    ])

    if (plans.length === 0) {
        return 0
    }

    const recordsWithKeys = records.map(record => ({
        ...record,
        matchKeys: getRecordMatchKeys(record)
    }))

    const updates = plans.flatMap(plan => {
        const linkedRecords = recordsWithKeys.filter(record => record.maintenance_plan_id === plan.id)
        const planKeys = getPlanMatchKeys(plan)
        const matchingRecords = (
            linkedRecords.length > 0
                ? linkedRecords
                : recordsWithKeys.filter(record => hasMatchingPlanItem(record.matchKeys, planKeys))
        ).map(record => ({
            maintenance_plan_id: record.maintenance_plan_id,
            service_type: record.service_type,
            description: record.description,
            date: record.date,
            mileage: record.mileage
        }))

        const nextCompletedDate = getLatestCompletedDate(matchingRecords)
        const nextCompletedMileage = getLatestCompletedMileage(matchingRecords)

        if (nextCompletedDate === plan.last_completed_date && nextCompletedMileage === plan.last_completed_mileage) {
            return []
        }

        return [
            transaction.maintenancePlan.update({
                where: { id: plan.id },
                data: {
                    last_completed_date: nextCompletedDate,
                    last_completed_mileage: nextCompletedMileage
                }
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
        const { maintenance_plan_id, service_type, workshop, description, date, mileage, cost, notes } = req.body as {
            maintenance_plan_id?: number
            service_type: string
            workshop?: string
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
            res.status(400).json({ error: 'Service type, service details, and service date are required.' })
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

        try {
            await assertCanCreateServiceRecord(authUser.id)

            const normalizedWorkshopName = typeof workshop === 'string' ? workshop.trim() : ''

            if (normalizedWorkshopName) {
                const workshops = await prisma.workshop.findMany({
                    where: { user_id: authUser.id },
                    select: { name: true }
                })
                const hasMatchingWorkshop = workshops.some(
                    entry =>
                        normalizeWorkshopLookupName(entry.name) === normalizeWorkshopLookupName(normalizedWorkshopName)
                )

                if (!hasMatchingWorkshop) {
                    await assertCanCreateWorkshop(authUser.id)
                }
            }
        } catch (error) {
            if (isBillingAccessError(error)) {
                sendBillingError(res, error)
                return
            }

            throw error
        }

        let linkedPlan: { id: number } | null = null

        if (maintenance_plan_id != null) {
            linkedPlan = await prisma.maintenancePlan.findFirst({
                where: {
                    id: Number(maintenance_plan_id),
                    user_id: authUser.id,
                    vehicle_id: vehicleId
                },
                select: { id: true }
            })

            if (!linkedPlan) {
                recordsLogger.warn('records.create_invalid_plan_link', {
                    requestId: req.requestId,
                    userId: authUser.id,
                    vehicleId,
                    maintenancePlanId: maintenance_plan_id
                })
                res.status(400).json({ error: 'Choose a maintenance plan that belongs to this vehicle.' })
                return
            }
        }

        const { created, recomputedPlanCount } = await prisma.$transaction(async transaction => {
            const canonicalWorkshopName = await ensureWorkshopExists(transaction, authUser.id, workshop)

            const created = await transaction.serviceRecord.create({
                data: {
                    user_id: authUser.id,
                    vehicle_id: vehicleId,
                    maintenance_plan_id: linkedPlan?.id ?? null,
                    service_type,
                    workshop: canonicalWorkshopName,
                    description,
                    date,
                    mileage: mileage ?? null,
                    cost: cost ?? null,
                    notes: notes || null
                }
            })

            const recomputedPlanCount = await recomputeMaintenancePlanBaselines(transaction, authUser.id, vehicleId)

            return { created, recomputedPlanCount }
        })

        recordsLogger.info('records.created', {
            requestId: req.requestId,
            userId: authUser.id,
            vehicleId,
            recordId: created.id,
            maintenancePlanId: created.maintenance_plan_id,
            serviceType: created.service_type,
            date: created.date,
            recomputedPlanCount
        })

        res.status(201).json(created)
    })
)

// PUT /api/vehicles/:vehicleId/records/:id
router.put(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const body = (req.body ?? {}) as Record<string, unknown>
        const bodyKeys = Object.keys(body)
        const disallowedKeys = bodyKeys.filter(
            key => !limitedRecordUpdateFields.includes(key as (typeof limitedRecordUpdateFields)[number])
        )

        if (disallowedKeys.length > 0) {
            recordsLogger.warn('records.update_disallowed_fields', {
                requestId: req.requestId,
                userId: authUser.id,
                vehicleId: Number(req.params.vehicleId),
                recordId: Number(req.params.id),
                disallowedKeys
            })
            res.status(400).json({
                error: 'You can only update the workshop, service details, cost, and notes for a service record.'
            })
            return
        }

        const { workshop, description, cost, notes } = body as {
            workshop?: string
            description: string
            cost?: number
            notes?: string
        }

        if (typeof description !== 'string' || description.trim().length === 0) {
            recordsLogger.warn('records.update_invalid_payload', {
                requestId: req.requestId,
                userId: authUser.id,
                vehicleId: Number(req.params.vehicleId),
                recordId: Number(req.params.id),
                bodyKeys
            })
            res.status(400).json({ error: 'Enter service details.' })
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

        try {
            const normalizedWorkshopName = typeof workshop === 'string' ? workshop.trim() : ''

            if (normalizedWorkshopName) {
                const workshops = await prisma.workshop.findMany({
                    where: { user_id: authUser.id },
                    select: { name: true }
                })
                const hasMatchingWorkshop = workshops.some(
                    entry =>
                        normalizeWorkshopLookupName(entry.name) === normalizeWorkshopLookupName(normalizedWorkshopName)
                )

                if (!hasMatchingWorkshop) {
                    await assertCanCreateWorkshop(authUser.id)
                }
            }
        } catch (error) {
            if (isBillingAccessError(error)) {
                sendBillingError(res, error)
                return
            }

            throw error
        }

        const { updated, recomputedPlanCount } = await prisma.$transaction(async transaction => {
            const canonicalWorkshopName = await ensureWorkshopExists(transaction, authUser.id, workshop)

            const updated = await transaction.serviceRecord.update({
                where: { id: recordId },
                data: {
                    workshop: canonicalWorkshopName,
                    description: description.trim(),
                    cost: cost ?? null,
                    notes: notes || null
                }
            })

            const recomputedPlanCount = await recomputeMaintenancePlanBaselines(transaction, authUser.id, vehicleId)

            return { updated, recomputedPlanCount }
        })

        recordsLogger.info('records.updated', {
            requestId: req.requestId,
            userId: authUser.id,
            vehicleId,
            recordId: updated.id,
            workshop: updated.workshop,
            recomputedPlanCount
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

        const recomputedPlanCount = await prisma.$transaction(async transaction => {
            await transaction.serviceRecord.delete({ where: { id: recordId } })
            return recomputeMaintenancePlanBaselines(transaction, authUser.id, vehicleId)
        })

        recordsLogger.info('records.deleted', {
            requestId: req.requestId,
            userId: authUser.id,
            vehicleId,
            recordId,
            recomputedPlanCount
        })
        res.status(204).send()
    })
)

export default router

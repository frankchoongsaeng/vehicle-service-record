import { Router, Request, Response } from 'express'
import { prisma } from '../db.js'
import { createLogger } from '../logging/logger.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router({ mergeParams: true })
const recordsLogger = createLogger({ component: 'service-record-routes' })

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

        const created = await prisma.serviceRecord.create({
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

        recordsLogger.info('records.created', {
            requestId: req.requestId,
            userId: authUser.id,
            vehicleId,
            recordId: created.id,
            serviceType: created.service_type,
            date: created.date
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

        const updated = await prisma.serviceRecord.update({
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

        recordsLogger.info('records.updated', {
            requestId: req.requestId,
            userId: authUser.id,
            vehicleId,
            recordId: updated.id,
            serviceType: updated.service_type,
            date: updated.date
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

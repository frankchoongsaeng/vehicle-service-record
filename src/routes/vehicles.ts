import { Router, Request, Response } from 'express'
import { prisma } from '../db.js'
import { createLogger } from '../logging/logger.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const vehiclesLogger = createLogger({ component: 'vehicle-routes' })

router.use(requireAuth)

// GET /api/vehicles
router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const vehicles = await prisma.vehicle.findMany({
            where: { user_id: authUser.id },
            orderBy: [{ make: 'asc' }, { model: 'asc' }, { year: 'desc' }]
        })

        vehiclesLogger.debug('vehicles.listed', {
            requestId: req.requestId,
            userId: authUser.id,
            count: vehicles.length
        })

        res.json(vehicles)
    })
)

// GET /api/vehicles/:id
router.get(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const vehicleId = Number(req.params.id)
        const vehicle = await prisma.vehicle.findFirst({
            where: {
                id: vehicleId,
                user_id: authUser.id
            }
        })
        if (!vehicle) {
            vehiclesLogger.warn('vehicles.get_not_found', {
                requestId: req.requestId,
                userId: authUser.id,
                vehicleId
            })
            res.status(404).json({ error: 'Vehicle not found' })
            return
        }

        vehiclesLogger.debug('vehicles.fetched', {
            requestId: req.requestId,
            userId: authUser.id,
            vehicleId
        })

        res.json(vehicle)
    })
)

// POST /api/vehicles
router.post(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const { make, model, year, vin, mileage, color, notes } = req.body as {
            make: string
            model: string
            year: number
            vin?: string
            mileage?: number
            color?: string
            notes?: string
        }

        if (!make || !model || !year) {
            vehiclesLogger.warn('vehicles.create_invalid_payload', {
                requestId: req.requestId,
                userId: authUser.id,
                bodyKeys: Object.keys((req.body ?? {}) as Record<string, unknown>)
            })
            res.status(400).json({ error: 'make, model, and year are required' })
            return
        }

        const created = await prisma.vehicle.create({
            data: {
                user_id: authUser.id,
                make,
                model,
                year: Number(year),
                vin: vin || null,
                mileage: mileage ?? null,
                color: color || null,
                notes: notes || null
            }
        })

        vehiclesLogger.info('vehicles.created', {
            requestId: req.requestId,
            userId: authUser.id,
            vehicleId: created.id,
            make: created.make,
            model: created.model,
            year: created.year
        })

        res.status(201).json(created)
    })
)

// PUT /api/vehicles/:id
router.put(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const { make, model, year, vin, mileage, color, notes } = req.body as {
            make: string
            model: string
            year: number
            vin?: string
            mileage?: number
            color?: string
            notes?: string
        }

        if (!make || !model || !year) {
            vehiclesLogger.warn('vehicles.update_invalid_payload', {
                requestId: req.requestId,
                userId: authUser.id,
                vehicleId: Number(req.params.id),
                bodyKeys: Object.keys((req.body ?? {}) as Record<string, unknown>)
            })
            res.status(400).json({ error: 'make, model, and year are required' })
            return
        }

        const vehicleId = Number(req.params.id)
        const existing = await prisma.vehicle.findFirst({
            where: {
                id: vehicleId,
                user_id: authUser.id
            }
        })
        if (!existing) {
            vehiclesLogger.warn('vehicles.update_not_found', {
                requestId: req.requestId,
                userId: authUser.id,
                vehicleId
            })
            res.status(404).json({ error: 'Vehicle not found' })
            return
        }

        const updated = await prisma.vehicle.update({
            where: { id: vehicleId },
            data: {
                make,
                model,
                year: Number(year),
                vin: vin || null,
                mileage: mileage ?? null,
                color: color || null,
                notes: notes || null
            }
        })

        vehiclesLogger.info('vehicles.updated', {
            requestId: req.requestId,
            userId: authUser.id,
            vehicleId: updated.id,
            make: updated.make,
            model: updated.model,
            year: updated.year
        })

        res.json(updated)
    })
)

// DELETE /api/vehicles/:id
router.delete(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const vehicleId = Number(req.params.id)
        const existing = await prisma.vehicle.findFirst({
            where: {
                id: vehicleId,
                user_id: authUser.id
            }
        })
        if (!existing) {
            vehiclesLogger.warn('vehicles.delete_not_found', {
                requestId: req.requestId,
                userId: authUser.id,
                vehicleId
            })
            res.status(404).json({ error: 'Vehicle not found' })
            return
        }

        await prisma.vehicle.delete({ where: { id: vehicleId } })
        vehiclesLogger.info('vehicles.deleted', {
            requestId: req.requestId,
            userId: authUser.id,
            vehicleId
        })
        res.status(204).send()
    })
)

export default router

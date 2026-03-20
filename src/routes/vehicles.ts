import { Router, Request, Response } from 'express'
import { prisma } from '../db.js'
import { createLogger } from '../logging/logger.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { scheduleVehicleImagePipeline } from '../vehicles/imagePipeline.js'
import { ensureVehicleImage } from '../vehicles/imageWorkflow.js'
import { lookupVin, VinLookupError } from '../vehicles/vinLookup.js'

const router = Router()
const vehiclesLogger = createLogger({ component: 'vehicle-routes' })

function shouldScheduleVehicleImage(
    image?: {
        classifier_status: string
        generation_status: string
        upload_status: string
    } | null
): boolean {
    if (!image) {
        return false
    }

    return !(
        image.classifier_status === 'completed' &&
        image.generation_status === 'completed' &&
        image.upload_status === 'completed'
    )
}

function serializeVehicle(vehicle: {
    id: number
    user_id: string
    image_id: number | null
    make: string
    model: string
    year: number
    trim: string
    vehicle_type: string | null
    plate_number: string | null
    vin: string | null
    engine: string | null
    transmission: string
    fuel_type: string
    purchase_mileage: number | null
    mileage: number | null
    color: string | null
    notes: string | null
    created_at: Date
    updated_at: Date
    image?: {
        id: number
        classification_key: string
        make: string
        model: string
        color: string
        year_start: number
        year_end: number
        trim: string | null
        vehicle_type: string | null
        body_style: string | null
        view: string
        generation_key: string | null
        prompt_version: string | null
        image_storage_key: string
        created_at: Date
        updated_at: Date
    } | null
}) {
    return {
        id: vehicle.id,
        imageId: vehicle.image_id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        trim: vehicle.trim,
        vehicleType: vehicle.vehicle_type,
        plateNumber: vehicle.plate_number,
        vin: vehicle.vin,
        engine: vehicle.engine,
        transmission: vehicle.transmission,
        fuelType: vehicle.fuel_type,
        purchaseMileage: vehicle.purchase_mileage,
        mileage: vehicle.mileage,
        color: vehicle.color,
        notes: vehicle.notes,
        created_at: vehicle.created_at,
        updated_at: vehicle.updated_at
    }
}

router.use(requireAuth)

// GET /api/vehicles/vin-search/:vin
router.get(
    '/vin-search/:vin',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const vin = String(req.params.vin ?? '')

        try {
            const result = await lookupVin(vin)

            vehiclesLogger.info('vehicles.vin_lookup_succeeded', {
                requestId: req.requestId,
                userId: authUser.id,
                vin: result.vin,
                make: result.make,
                model: result.model,
                year: result.year
            })

            res.json(result)
        } catch (error) {
            if (error instanceof VinLookupError) {
                vehiclesLogger.warn('vehicles.vin_lookup_failed', {
                    requestId: req.requestId,
                    userId: authUser.id,
                    vin,
                    statusCode: error.status,
                    error: error.message
                })

                res.status(error.status).json({ error: error.message })
                return
            }

            throw error
        }
    })
)

// GET /api/vehicles
router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const vehicles = await prisma.vehicle.findMany({
            where: { user_id: authUser.id },
            include: { image: true },
            orderBy: [{ make: 'asc' }, { model: 'asc' }, { year: 'desc' }]
        })

        vehiclesLogger.debug('vehicles.listed', {
            requestId: req.requestId,
            userId: authUser.id,
            count: vehicles.length
        })

        res.json(vehicles.map(serializeVehicle))
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
            },
            include: { image: true }
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

        res.json(serializeVehicle(vehicle))
    })
)

// POST /api/vehicles
router.post(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const {
            make,
            model,
            year,
            trim,
            vehicleType,
            plateNumber,
            vin,
            engine,
            transmission,
            fuelType,
            purchaseMileage,
            mileage,
            color,
            notes
        } = req.body as {
            make: string
            model: string
            year: number
            trim: string
            vehicleType?: string
            plateNumber?: string
            vin?: string
            engine?: string
            transmission: string
            fuelType: string
            purchaseMileage?: number
            mileage?: number
            color?: string
            notes?: string
        }

        if (!make || !model || !year || !trim || !transmission || !fuelType) {
            vehiclesLogger.warn('vehicles.create_invalid_payload', {
                requestId: req.requestId,
                userId: authUser.id,
                bodyKeys: Object.keys((req.body ?? {}) as Record<string, unknown>)
            })
            res.status(400).json({ error: 'make, model, year, trim, transmission, and fuel type are required' })
            return
        }

        const normalizedYear = Number(year)

        const { createdVehicle, ensuredImage } = await prisma.$transaction(async tx => {
            const ensuredImage = await ensureVehicleImage(tx, {
                make,
                model,
                year: normalizedYear,
                trim,
                vehicleType: vehicleType ?? null,
                color: color ?? null
            })

            const createdVehicle = await tx.vehicle.create({
                data: {
                    user_id: authUser.id,
                    image_id: ensuredImage?.imageId ?? null,
                    make,
                    model,
                    year: normalizedYear,
                    trim,
                    vehicle_type: vehicleType || null,
                    plate_number: plateNumber || null,
                    vin: vin || null,
                    engine: engine || null,
                    transmission,
                    fuel_type: fuelType,
                    purchase_mileage: purchaseMileage ?? null,
                    mileage: mileage ?? null,
                    color: color || null,
                    notes: notes || null
                },
                include: { image: true }
            })

            return { createdVehicle, ensuredImage }
        })

        vehiclesLogger.info('vehicles.created', {
            requestId: req.requestId,
            userId: authUser.id,
            vehicleId: createdVehicle.id,
            imageId: createdVehicle.image_id,
            classificationKey: createdVehicle.image?.classification_key ?? undefined,
            make: createdVehicle.make,
            model: createdVehicle.model,
            year: createdVehicle.year
        })

        res.status(201).json(serializeVehicle(createdVehicle))

        if (ensuredImage && shouldScheduleVehicleImage(createdVehicle.image)) {
            scheduleVehicleImagePipeline({
                imageId: ensuredImage.imageId,
                classificationKey: ensuredImage.classificationKey,
                storageKey: ensuredImage.storageKey,
                make: createdVehicle.make,
                model: createdVehicle.model,
                year: createdVehicle.year,
                trim: createdVehicle.trim,
                vehicleType: createdVehicle.vehicle_type,
                color: createdVehicle.color,
                requestId: req.requestId,
                userId: authUser.id,
                vehicleId: createdVehicle.id
            })
        }
    })
)

// PUT /api/vehicles/:id
router.put(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const {
            make,
            model,
            year,
            trim,
            vehicleType,
            plateNumber,
            vin,
            engine,
            transmission,
            fuelType,
            purchaseMileage,
            mileage,
            color,
            notes
        } = req.body as {
            make: string
            model: string
            year: number
            trim: string
            vehicleType?: string
            plateNumber?: string
            vin?: string
            engine?: string
            transmission: string
            fuelType: string
            purchaseMileage?: number
            mileage?: number
            color?: string
            notes?: string
        }

        if (!make || !model || !year || !trim || !transmission || !fuelType) {
            vehiclesLogger.warn('vehicles.update_invalid_payload', {
                requestId: req.requestId,
                userId: authUser.id,
                vehicleId: Number(req.params.id),
                bodyKeys: Object.keys((req.body ?? {}) as Record<string, unknown>)
            })
            res.status(400).json({ error: 'make, model, year, trim, transmission, and fuel type are required' })
            return
        }

        const normalizedYear = Number(year)

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

        const updated = await prisma.$transaction(async tx => {
            const ensuredImage = await ensureVehicleImage(tx, {
                make,
                model,
                year: normalizedYear,
                trim,
                vehicleType: vehicleType ?? null,
                color: color ?? null
            })

            return tx.vehicle.update({
                where: { id: vehicleId },
                data: {
                    image_id: ensuredImage?.imageId ?? null,
                    make,
                    model,
                    year: normalizedYear,
                    trim,
                    vehicle_type: vehicleType || null,
                    plate_number: plateNumber || null,
                    vin: vin || null,
                    engine: engine || null,
                    transmission,
                    fuel_type: fuelType,
                    purchase_mileage: purchaseMileage ?? null,
                    mileage: mileage ?? null,
                    color: color || null,
                    notes: notes || null
                },
                include: { image: true }
            })
        })

        vehiclesLogger.info('vehicles.updated', {
            requestId: req.requestId,
            userId: authUser.id,
            vehicleId: updated.id,
            imageId: updated.image_id,
            classificationKey: updated.image?.classification_key ?? undefined,
            make: updated.make,
            model: updated.model,
            year: updated.year
        })

        res.json(serializeVehicle(updated))
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

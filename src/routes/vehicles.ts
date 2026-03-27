import { Router, Request, Response } from 'express'
import { prisma } from '../db.js'
import { createLogger } from '../logging/logger.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { resolveUploadedImageUrl } from '../services/imageUpload.js'
import { DEFAULT_DISTANCE_UNIT, isDistanceUnit } from '../types/distance.js'
import { scheduleVehicleImagePipeline } from '../vehicles/imagePipeline.js'
import { ensureVehicleImage } from '../vehicles/imageWorkflow.js'
import { lookupVin, VinLookupError } from '../vehicles/vinLookup.js'

const router = Router()
const vehiclesLogger = createLogger({ component: 'vehicle-routes' })

type ReminderRulePayload = {
    daysThreshold?: unknown
    mileageThreshold?: unknown
}

function shouldScheduleVehicleImage(color?: string | null): boolean {
    return Boolean(color?.trim())
}

function normalizeOptionalThreshold(value: unknown, field: string): number | null {
    if (value == null || value === '') {
        return null
    }

    const normalized = Number(value)

    if (!Number.isInteger(normalized) || normalized <= 0) {
        if (field === 'reminderRule.daysThreshold') {
            throw new Error('Reminder days must be a positive whole number.')
        }

        if (field === 'reminderRule.mileageThreshold') {
            throw new Error('Reminder mileage must be a positive whole number.')
        }

        throw new Error('Reminder values must be positive whole numbers.')
    }

    return normalized
}

function normalizeReminderRule(value: unknown) {
    if (value == null) {
        return null
    }

    const raw = value as ReminderRulePayload
    const daysThreshold = normalizeOptionalThreshold(raw.daysThreshold, 'reminderRule.daysThreshold')
    const mileageThreshold = normalizeOptionalThreshold(raw.mileageThreshold, 'reminderRule.mileageThreshold')

    if (daysThreshold == null && mileageThreshold == null) {
        throw new Error('A custom reminder rule requires at least one threshold')
    }

    return {
        daysThreshold,
        mileageThreshold
    }
}

type ReminderRuleClient = Pick<typeof prisma, 'reminderRule'>

async function replaceVehicleReminderRule(
    client: ReminderRuleClient,
    userId: string,
    vehicleId: number,
    reminderMode: string,
    reminderRule: { daysThreshold: number | null; mileageThreshold: number | null } | null
) {
    await client.reminderRule.deleteMany({
        where: {
            user_id: userId,
            vehicle_id: vehicleId,
            channel: 'email'
        }
    })

    if (reminderMode !== 'custom' || !reminderRule) {
        return
    }

    await client.reminderRule.create({
        data: {
            user_id: userId,
            vehicle_id: vehicleId,
            channel: 'email',
            days_threshold: reminderRule.daysThreshold,
            mileage_threshold: reminderRule.mileageThreshold
        }
    })
}

function getVehicleImageUrl(
    image?: {
        id: number
        image_storage_key: string
        upload_status: string
    } | null
): string | null {
    if (!image || image.upload_status !== 'completed') {
        return null
    }

    return resolveUploadedImageUrl(image.image_storage_key) ? `/api/vehicles/images/${image.id}` : null
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
    distance_unit: string
    reminder_mode: string
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
        upload_status: string
        created_at: Date
        updated_at: Date
    } | null
}) {
    return {
        id: vehicle.id,
        imageId: vehicle.image_id,
        imageUrl: getVehicleImageUrl(vehicle.image),
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
        distanceUnit: isDistanceUnit(vehicle.distance_unit) ? vehicle.distance_unit : DEFAULT_DISTANCE_UNIT,
        reminderMode: vehicle.reminder_mode,
        color: vehicle.color,
        notes: vehicle.notes,
        created_at: vehicle.created_at,
        updated_at: vehicle.updated_at
    }
}

router.use(requireAuth)

// GET /api/vehicles/images/:imageId
router.get(
    '/images/:imageId',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const imageId = Number(req.params.imageId)

        const vehicleWithImage = await prisma.vehicle.findFirst({
            where: {
                user_id: authUser.id,
                image_id: imageId
            },
            select: {
                id: true,
                image: {
                    select: {
                        image_storage_key: true,
                        upload_status: true
                    }
                }
            }
        })

        if (!vehicleWithImage?.image) {
            vehiclesLogger.warn('vehicles.image_not_found', {
                requestId: req.requestId,
                userId: authUser.id,
                imageId
            })

            res.status(404).json({ error: 'Vehicle image not found' })
            return
        }

        if (vehicleWithImage.image.upload_status !== 'completed') {
            vehiclesLogger.warn('vehicles.image_not_ready', {
                requestId: req.requestId,
                userId: authUser.id,
                imageId,
                vehicleId: vehicleWithImage.id,
                uploadStatus: vehicleWithImage.image.upload_status
            })

            res.status(404).json({ error: 'Vehicle image not available' })
            return
        }

        const publicImageUrl = resolveUploadedImageUrl(vehicleWithImage.image.image_storage_key)

        if (!publicImageUrl) {
            vehiclesLogger.error('vehicles.image_public_url_unconfigured', {
                requestId: req.requestId,
                userId: authUser.id,
                imageId,
                vehicleId: vehicleWithImage.id,
                storageKey: vehicleWithImage.image.image_storage_key
            })

            res.status(503).json({ error: 'Vehicle image delivery is not configured' })
            return
        }

        res.setHeader('Cache-Control', 'private, max-age=3600')
        res.redirect(302, publicImageUrl)
    })
)

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
            distanceUnit,
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
            distanceUnit?: string
            reminderMode?: string
            reminderRule?: ReminderRulePayload | null
            color?: string
            notes?: string
        }

        if (!make || !model || !year || !trim || !transmission || !fuelType) {
            vehiclesLogger.warn('vehicles.create_invalid_payload', {
                requestId: req.requestId,
                userId: authUser.id,
                bodyKeys: Object.keys((req.body ?? {}) as Record<string, unknown>)
            })
            res.status(400).json({ error: 'Enter the make, model, year, trim, transmission, and fuel type.' })
            return
        }

        if (distanceUnit != null && !isDistanceUnit(distanceUnit)) {
            vehiclesLogger.warn('vehicles.create_invalid_distance_unit', {
                requestId: req.requestId,
                userId: authUser.id,
                distanceUnit
            })
            res.status(400).json({ error: 'Choose miles or kilometers for distance tracking.' })
            return
        }

        try {
            const normalizedYear = Number(year)
            const normalizedDistanceUnit = distanceUnit ?? DEFAULT_DISTANCE_UNIT
            const normalizedReminderMode =
                req.body?.reminderMode === 'custom' || req.body?.reminderMode === 'disabled'
                    ? req.body.reminderMode
                    : 'inherit'
            const normalizedReminderRule =
                normalizedReminderMode === 'custom' ? normalizeReminderRule(req.body?.reminderRule) : null

            if (normalizedReminderMode === 'custom' && !normalizedReminderRule) {
                throw new Error('A custom reminder rule requires at least one threshold')
            }

            const createdVehicle = await prisma.$transaction(async tx => {
                const vehicle = await tx.vehicle.create({
                    data: {
                        user_id: authUser.id,
                        image_id: null,
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
                        distance_unit: normalizedDistanceUnit,
                        reminder_mode: normalizedReminderMode,
                        color: color || null,
                        notes: notes || null
                    },
                    include: { image: true }
                })

                await replaceVehicleReminderRule(
                    tx,
                    authUser.id,
                    vehicle.id,
                    normalizedReminderMode,
                    normalizedReminderRule
                )

                return vehicle
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

            if (shouldScheduleVehicleImage(createdVehicle.color)) {
                scheduleVehicleImagePipeline({
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
        } catch (error) {
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Check your reminder settings and try again.'
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
            distanceUnit,
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
            distanceUnit?: string
            reminderMode?: string
            reminderRule?: ReminderRulePayload | null
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
            res.status(400).json({ error: 'Enter the make, model, year, trim, transmission, and fuel type.' })
            return
        }

        if (distanceUnit != null && !isDistanceUnit(distanceUnit)) {
            vehiclesLogger.warn('vehicles.update_invalid_distance_unit', {
                requestId: req.requestId,
                userId: authUser.id,
                vehicleId: Number(req.params.id),
                distanceUnit
            })
            res.status(400).json({ error: 'Choose miles or kilometers for distance tracking.' })
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

        try {
            const normalizedYear = Number(year)
            const normalizedDistanceUnit = distanceUnit ?? DEFAULT_DISTANCE_UNIT
            const normalizedReminderMode =
                req.body?.reminderMode === 'custom' || req.body?.reminderMode === 'disabled'
                    ? req.body.reminderMode
                    : req.body?.reminderMode === 'inherit'
                    ? 'inherit'
                    : existing.reminder_mode
            const normalizedReminderRule =
                normalizedReminderMode === 'custom' ? normalizeReminderRule(req.body?.reminderRule) : null

            if (normalizedReminderMode === 'custom' && !normalizedReminderRule) {
                throw new Error('A custom reminder rule requires at least one threshold')
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

                const vehicle = await tx.vehicle.update({
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
                        distance_unit: normalizedDistanceUnit,
                        reminder_mode: normalizedReminderMode,
                        color: color || null,
                        notes: notes || null
                    },
                    include: { image: true }
                })

                await replaceVehicleReminderRule(
                    tx,
                    authUser.id,
                    vehicleId,
                    normalizedReminderMode,
                    normalizedReminderRule
                )

                return vehicle
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
        } catch (error) {
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Check your reminder settings and try again.'
            })
        }
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

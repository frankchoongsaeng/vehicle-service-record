import { Prisma } from '@prisma/client'

const IMAGE_VIEW = 'default'
const IMAGE_PROMPT_VERSION = 'vehicle-image-v1'

export interface VehicleImageSource {
    make: string
    model: string
    year: number
    trim: string
    vehicleType?: string | null
    color?: string | null
}

export interface EnsuredVehicleImage {
    imageId: number
    classificationKey: string
    storageKey: string
    reused: boolean
}

interface VehicleImageDescriptor {
    classificationKey: string
    storageKey: string
    generationKey: string
    make: string
    model: string
    color: string
    year: number
    trim: string
    vehicleType: string | null
}

function cleanValue(value?: string | null): string | null {
    const trimmed = value?.trim()
    return trimmed ? trimmed : null
}

function normalizeSegment(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[’']/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function buildVehicleImageDescriptor(source: VehicleImageSource): VehicleImageDescriptor | null {
    const make = cleanValue(source.make)
    const model = cleanValue(source.model)
    const trim = cleanValue(source.trim)
    const color = cleanValue(source.color)
    const vehicleType = cleanValue(source.vehicleType)

    if (!make || !model || !trim || !color) {
        return null
    }

    const normalizedMake = normalizeSegment(make)
    const normalizedModel = normalizeSegment(model)
    const normalizedTrim = normalizeSegment(trim)
    const normalizedColor = normalizeSegment(color)
    const normalizedVehicleType = vehicleType ? normalizeSegment(vehicleType) : 'unknown-type'
    const generationKey = [normalizedMake, normalizedModel, normalizedTrim, normalizedColor].join('/')
    const classificationKey = [
        normalizedMake,
        normalizedModel,
        normalizedTrim,
        normalizedColor,
        normalizedVehicleType,
        IMAGE_VIEW
    ].join(':')

    return {
        classificationKey,
        storageKey: `vehicle-images/${IMAGE_PROMPT_VERSION}/${classificationKey}`,
        generationKey,
        make,
        model,
        color,
        year: source.year,
        trim,
        vehicleType
    }
}

async function createVehicleImage(
    tx: Prisma.TransactionClient,
    descriptor: VehicleImageDescriptor
): Promise<EnsuredVehicleImage> {
    const created = await tx.vehicleImage.create({
        data: {
            classification_key: descriptor.classificationKey,
            make: descriptor.make,
            model: descriptor.model,
            color: descriptor.color,
            year_start: descriptor.year,
            year_end: descriptor.year,
            trim: descriptor.trim,
            vehicle_type: descriptor.vehicleType,
            body_style: null,
            view: IMAGE_VIEW,
            generation_key: descriptor.generationKey,
            prompt_version: IMAGE_PROMPT_VERSION,
            image_storage_key: descriptor.storageKey
        }
    })

    return {
        imageId: created.id,
        classificationKey: created.classification_key,
        storageKey: created.image_storage_key,
        reused: false
    }
}

export async function ensureVehicleImage(
    tx: Prisma.TransactionClient,
    source: VehicleImageSource
): Promise<EnsuredVehicleImage | null> {
    const descriptor = buildVehicleImageDescriptor(source)

    if (!descriptor) {
        return null
    }

    const existing = await tx.vehicleImage.findUnique({
        where: { classification_key: descriptor.classificationKey }
    })

    if (existing) {
        const nextYearStart = Math.min(existing.year_start, descriptor.year)
        const nextYearEnd = Math.max(existing.year_end, descriptor.year)

        if (nextYearStart !== existing.year_start || nextYearEnd !== existing.year_end) {
            await tx.vehicleImage.update({
                where: { id: existing.id },
                data: {
                    year_start: nextYearStart,
                    year_end: nextYearEnd
                }
            })
        }

        return {
            imageId: existing.id,
            classificationKey: existing.classification_key,
            storageKey: existing.image_storage_key,
            reused: true
        }
    }

    try {
        return await createVehicleImage(tx, descriptor)
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            const conflicted = await tx.vehicleImage.findUnique({
                where: { classification_key: descriptor.classificationKey }
            })

            if (conflicted) {
                const nextYearStart = Math.min(conflicted.year_start, descriptor.year)
                const nextYearEnd = Math.max(conflicted.year_end, descriptor.year)

                if (nextYearStart !== conflicted.year_start || nextYearEnd !== conflicted.year_end) {
                    await tx.vehicleImage.update({
                        where: { id: conflicted.id },
                        data: {
                            year_start: nextYearStart,
                            year_end: nextYearEnd
                        }
                    })
                }

                return {
                    imageId: conflicted.id,
                    classificationKey: conflicted.classification_key,
                    storageKey: conflicted.image_storage_key,
                    reused: true
                }
            }
        }

        throw error
    }
}

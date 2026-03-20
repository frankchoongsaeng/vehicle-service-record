import { Prisma } from '@prisma/client'

const IMAGE_VIEW = 'default'
const IMAGE_PROMPT_VERSION = 'vehicle-image-v1'

type VehicleImageClient = Pick<Prisma.TransactionClient, 'vehicleImage'>

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
    classifierStatus: string
    generationStatus: string
    uploadStatus: string
    localTmpFilename: string | null
}

export interface ClassifiedVehicleImageSource extends VehicleImageSource {
    yearStart: number
    yearEnd: number
    bodyStyle?: string | null
    view?: string | null
}

interface VehicleImageDescriptor {
    classificationKey: string
    storageKey: string
    generationKey: string
    make: string
    model: string
    color: string
    yearStart: number
    yearEnd: number
    trim: string
    vehicleType: string | null
    bodyStyle: string | null
    view: string
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

function buildBaseDescriptor(
    source: VehicleImageSource,
    options?: {
        yearStart?: number
        yearEnd?: number
        bodyStyle?: string | null
        view?: string | null
        vehicleType?: string | null
    }
): VehicleImageDescriptor | null {
    const make = cleanValue(source.make)
    const model = cleanValue(source.model)
    const trim = cleanValue(source.trim)
    const color = cleanValue(source.color)
    const vehicleType = cleanValue(options?.vehicleType ?? source.vehicleType)
    const bodyStyle = cleanValue(options?.bodyStyle)
    const view = cleanValue(options?.view) ?? IMAGE_VIEW

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
        view
    ].join(':')

    return {
        classificationKey,
        storageKey: `vehicle-images/${IMAGE_PROMPT_VERSION}/${classificationKey}`,
        generationKey,
        make,
        model,
        color,
        yearStart: options?.yearStart ?? source.year,
        yearEnd: options?.yearEnd ?? source.year,
        trim,
        vehicleType,
        bodyStyle,
        view
    }
}

function buildVehicleImageDescriptor(source: VehicleImageSource): VehicleImageDescriptor | null {
    return buildBaseDescriptor(source)
}

export function buildClassifiedVehicleImageDescriptor(
    source: ClassifiedVehicleImageSource
): VehicleImageDescriptor | null {
    return buildBaseDescriptor(source, {
        yearStart: source.yearStart,
        yearEnd: source.yearEnd,
        bodyStyle: source.bodyStyle,
        view: source.view,
        vehicleType: source.vehicleType
    })
}

async function createVehicleImage(
    tx: VehicleImageClient,
    descriptor: VehicleImageDescriptor,
    options?: {
        classifierCompleted?: boolean
    }
): Promise<EnsuredVehicleImage> {
    const created = await tx.vehicleImage.create({
        data: {
            classification_key: descriptor.classificationKey,
            make: descriptor.make,
            model: descriptor.model,
            color: descriptor.color,
            year_start: descriptor.yearStart,
            year_end: descriptor.yearEnd,
            trim: descriptor.trim,
            vehicle_type: descriptor.vehicleType,
            body_style: descriptor.bodyStyle,
            view: descriptor.view,
            generation_key: descriptor.generationKey,
            prompt_version: IMAGE_PROMPT_VERSION,
            image_storage_key: descriptor.storageKey,
            classifier_status: options?.classifierCompleted ? 'completed' : 'pending',
            classifier_error: null,
            classified_at: options?.classifierCompleted ? new Date() : null
        }
    })

    return {
        imageId: created.id,
        classificationKey: created.classification_key,
        storageKey: created.image_storage_key,
        reused: false,
        classifierStatus: created.classifier_status,
        generationStatus: created.generation_status,
        uploadStatus: created.upload_status,
        localTmpFilename: created.local_tmp_filename
    }
}

async function ensureVehicleImageFromDescriptor(
    tx: VehicleImageClient,
    descriptor: VehicleImageDescriptor,
    options?: {
        classifierCompleted?: boolean
    }
): Promise<EnsuredVehicleImage> {
    const existing = await tx.vehicleImage.findUnique({
        where: { classification_key: descriptor.classificationKey }
    })

    if (existing) {
        const nextYearStart = Math.min(existing.year_start, descriptor.yearStart)
        const nextYearEnd = Math.max(existing.year_end, descriptor.yearEnd)

        const needsUpdate =
            nextYearStart !== existing.year_start ||
            nextYearEnd !== existing.year_end ||
            existing.body_style !== (descriptor.bodyStyle ?? null) ||
            existing.vehicle_type !== descriptor.vehicleType ||
            existing.view !== descriptor.view ||
            (options?.classifierCompleted && existing.classifier_status !== 'completed')

        const updated = needsUpdate
            ? await tx.vehicleImage.update({
                  where: { id: existing.id },
                  data: {
                      year_start: nextYearStart,
                      year_end: nextYearEnd,
                      body_style: descriptor.bodyStyle,
                      vehicle_type: descriptor.vehicleType,
                      view: descriptor.view,
                      classifier_status: options?.classifierCompleted ? 'completed' : existing.classifier_status,
                      classifier_error: options?.classifierCompleted ? null : existing.classifier_error,
                      classified_at: options?.classifierCompleted ? new Date() : existing.classified_at
                  }
              })
            : existing

        return {
            imageId: updated.id,
            classificationKey: updated.classification_key,
            storageKey: updated.image_storage_key,
            reused: true,
            classifierStatus: updated.classifier_status,
            generationStatus: updated.generation_status,
            uploadStatus: updated.upload_status,
            localTmpFilename: updated.local_tmp_filename
        }
    }

    try {
        return await createVehicleImage(tx, descriptor, options)
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return ensureVehicleImageFromDescriptor(tx, descriptor, options)
        }

        throw error
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

    return ensureVehicleImageFromDescriptor(tx, descriptor)
}

export async function ensureClassifiedVehicleImage(
    tx: VehicleImageClient,
    source: ClassifiedVehicleImageSource
): Promise<EnsuredVehicleImage | null> {
    const descriptor = buildClassifiedVehicleImageDescriptor(source)

    if (!descriptor) {
        return null
    }

    return ensureVehicleImageFromDescriptor(tx, descriptor, { classifierCompleted: true })
}

import { prisma } from '../db.js'
import { classifyVehicleImage } from '../services/imageClassifier.js'
import { createLogger } from '../logging/logger.js'
import { generateVehicleImage, type VehicleImageSourceInput } from '../services/imageGeneration.js'
import { uploadGeneratedImage } from '../services/imageUpload.js'
import { ensureClassifiedVehicleImage } from './imageWorkflow.js'

const imagePipelineLogger = createLogger({ component: 'vehicle-image-pipeline' })

interface ScheduleVehicleImagePipelineInput extends VehicleImageSourceInput {
    requestId?: string
    userId: string
    vehicleId: number
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }

    return String(error)
}

export function scheduleVehicleImagePipeline(input: ScheduleVehicleImagePipelineInput): void {
    setImmediate(() => {
        void runVehicleImagePipeline(input)
    })
}

async function runVehicleImagePipeline(input: ScheduleVehicleImagePipelineInput): Promise<void> {
    if (!input.color?.trim()) {
        imagePipelineLogger.debug('vehicle_image.pipeline_skipped_missing_color', {
            requestId: input.requestId,
            userId: input.userId,
            vehicleId: input.vehicleId
        })
        return
    }

    try {
        const classification = await classifyVehicleImage(input)

        const ensuredImage = await ensureClassifiedVehicleImage(prisma, {
            ...input,
            yearStart: classification.yearStart,
            yearEnd: classification.yearEnd,
            bodyStyle: classification.bodyStyle,
            vehicleType: classification.vehicleType,
            view: classification.view
        })

        if (!ensuredImage) {
            imagePipelineLogger.debug('vehicle_image.pipeline_skipped_unclassifiable', {
                requestId: input.requestId,
                userId: input.userId,
                vehicleId: input.vehicleId
            })
            return
        }

        await prisma.vehicle.update({
            where: { id: input.vehicleId },
            data: { image_id: ensuredImage.imageId }
        })

        if (ensuredImage.generationStatus === 'processing' || ensuredImage.uploadStatus === 'processing') {
            imagePipelineLogger.debug('vehicle_image.pipeline_skipped_processing', {
                requestId: input.requestId,
                userId: input.userId,
                vehicleId: input.vehicleId,
                imageId: ensuredImage.imageId,
                classificationKey: ensuredImage.classificationKey
            })
            return
        }

        if (
            ensuredImage.reused &&
            ensuredImage.generationStatus === 'completed' &&
            ensuredImage.uploadStatus === 'completed'
        ) {
            imagePipelineLogger.info('vehicle_image.pipeline_reused_existing', {
                requestId: input.requestId,
                userId: input.userId,
                vehicleId: input.vehicleId,
                imageId: ensuredImage.imageId,
                classificationKey: ensuredImage.classificationKey
            })
            return
        }

        let filename = ensuredImage.localTmpFilename

        if (!filename || ensuredImage.generationStatus !== 'completed') {
            await prisma.vehicleImage.update({
                where: { id: ensuredImage.imageId },
                data: {
                    generation_status: 'processing',
                    generation_error: null,
                    upload_status: 'pending',
                    upload_error: null
                }
            })

            filename = await generateVehicleImage({
                ...input,
                classificationKey: ensuredImage.classificationKey,
                yearStart: classification.yearStart,
                yearEnd: classification.yearEnd,
                bodyStyle: classification.bodyStyle,
                vehicleType: classification.vehicleType,
                view: classification.view
            })

            await prisma.vehicleImage.update({
                where: { id: ensuredImage.imageId },
                data: {
                    local_tmp_filename: filename,
                    generation_status: 'completed',
                    generation_error: null
                }
            })
        }

        await prisma.vehicleImage.update({
            where: { id: ensuredImage.imageId },
            data: {
                upload_status: 'processing',
                upload_error: null
            }
        })

        try {
            await uploadGeneratedImage({
                filename,
                storageKey: ensuredImage.storageKey
            })

            await prisma.vehicleImage.update({
                where: { id: ensuredImage.imageId },
                data: {
                    upload_status: 'completed',
                    upload_error: null,
                    uploaded_at: new Date()
                }
            })

            imagePipelineLogger.info('vehicle_image.pipeline_completed', {
                requestId: input.requestId,
                userId: input.userId,
                vehicleId: input.vehicleId,
                imageId: ensuredImage.imageId,
                storageKey: ensuredImage.storageKey,
                yearStart: classification.yearStart,
                yearEnd: classification.yearEnd,
                bodyStyle: classification.bodyStyle ?? undefined,
                vehicleType: classification.vehicleType ?? undefined,
                reused: ensuredImage.reused
            })
        } catch (error) {
            const errorMessage = getErrorMessage(error)

            await prisma.vehicleImage.update({
                where: { id: ensuredImage.imageId },
                data: {
                    upload_status: 'failed',
                    upload_error: errorMessage
                }
            })

            imagePipelineLogger.error('vehicle_image.upload_failed', {
                requestId: input.requestId,
                userId: input.userId,
                vehicleId: input.vehicleId,
                imageId: ensuredImage.imageId,
                storageKey: ensuredImage.storageKey,
                error
            })
        }
    } catch (error) {
        imagePipelineLogger.error('vehicle_image.pipeline_failed', {
            requestId: input.requestId,
            userId: input.userId,
            vehicleId: input.vehicleId,
            error
        })
    }
}

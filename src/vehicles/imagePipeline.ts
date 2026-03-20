import { prisma } from '../db.js'
import { createLogger } from '../logging/logger.js'
import { generateVehicleImage, type VehicleImageGenerationInput } from '../services/imageGeneration.js'
import { uploadGeneratedImage } from '../services/imageUpload.js'

const imagePipelineLogger = createLogger({ component: 'vehicle-image-pipeline' })

interface ScheduleVehicleImagePipelineInput extends VehicleImageGenerationInput {
    imageId: number
    storageKey: string
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
    const currentImage = await prisma.vehicleImage.findUnique({
        where: { id: input.imageId },
        select: {
            id: true,
            generation_status: true,
            upload_status: true
        }
    })

    if (!currentImage) {
        imagePipelineLogger.warn('vehicle_image.pipeline_missing_record', {
            requestId: input.requestId,
            userId: input.userId,
            vehicleId: input.vehicleId,
            imageId: input.imageId
        })
        return
    }

    if (currentImage.generation_status === 'processing' || currentImage.upload_status === 'processing') {
        imagePipelineLogger.debug('vehicle_image.pipeline_skipped_processing', {
            requestId: input.requestId,
            userId: input.userId,
            vehicleId: input.vehicleId,
            imageId: input.imageId
        })
        return
    }

    if (currentImage.generation_status === 'completed' && currentImage.upload_status === 'completed') {
        imagePipelineLogger.debug('vehicle_image.pipeline_skipped_completed', {
            requestId: input.requestId,
            userId: input.userId,
            vehicleId: input.vehicleId,
            imageId: input.imageId
        })
        return
    }

    await prisma.vehicleImage.update({
        where: { id: input.imageId },
        data: {
            generation_status: 'processing',
            generation_error: null,
            upload_status: 'pending',
            upload_error: null
        }
    })

    try {
        await generateVehicleImage(input, async filename => {
            await prisma.vehicleImage.update({
                where: { id: input.imageId },
                data: {
                    local_tmp_filename: filename,
                    generation_status: 'completed',
                    generation_error: null,
                    upload_status: 'processing',
                    upload_error: null
                }
            })

            try {
                await uploadGeneratedImage({
                    filename,
                    storageKey: input.storageKey
                })

                await prisma.vehicleImage.update({
                    where: { id: input.imageId },
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
                    imageId: input.imageId,
                    storageKey: input.storageKey
                })
            } catch (error) {
                const errorMessage = getErrorMessage(error)

                await prisma.vehicleImage.update({
                    where: { id: input.imageId },
                    data: {
                        upload_status: 'failed',
                        upload_error: errorMessage
                    }
                })

                imagePipelineLogger.error('vehicle_image.upload_failed', {
                    requestId: input.requestId,
                    userId: input.userId,
                    vehicleId: input.vehicleId,
                    imageId: input.imageId,
                    storageKey: input.storageKey,
                    error
                })
            }
        })
    } catch (error) {
        const errorMessage = getErrorMessage(error)

        await prisma.vehicleImage.update({
            where: { id: input.imageId },
            data: {
                generation_status: 'failed',
                generation_error: errorMessage,
                upload_status: 'failed',
                upload_error: errorMessage
            }
        })

        imagePipelineLogger.error('vehicle_image.generation_failed', {
            requestId: input.requestId,
            userId: input.userId,
            vehicleId: input.vehicleId,
            imageId: input.imageId,
            error
        })
    }
}

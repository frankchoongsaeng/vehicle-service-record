import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import OpenAI from 'openai'
import { createLogger } from '../logging/logger.js'

const imageGenerationLogger = createLogger({ component: 'image-generation-service' })
const DEFAULT_IMAGE_MODEL = 'gpt-image-1'
const DEFAULT_IMAGE_SIZE = '1024x1024'

export interface VehicleImageGenerationInput {
    classificationKey: string
    make: string
    model: string
    year: number
    trim: string
    vehicleType?: string | null
    color?: string | null
}

function getProjectRootDirectory(): string {
    return resolve(dirname(fileURLToPath(import.meta.url)), '../..')
}

function getProjectTmpDirectory(): string {
    return resolve(getProjectRootDirectory(), 'tmp')
}

function sanitizeFileSegment(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80)
}

function buildPrompt(input: VehicleImageGenerationInput): string {
    const color = input.color?.trim() || 'neutral'
    const vehicleType = input.vehicleType?.trim() || 'vehicle'

    return [
        'Create a clean, realistic catalog-style vehicle image.',
        `Subject: ${color} ${input.year} ${input.make} ${input.model} ${input.trim}.`,
        `Vehicle type: ${vehicleType}.`,
        'Composition: centered vehicle, front three-quarter view, full vehicle visible.',
        'Background: simple studio backdrop with soft shadow.',
        'Do not include people, text, logos, license plate text, watermarks, or extra vehicles.'
    ].join(' ')
}

function getOpenAiClient(): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY?.trim()

    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not configured')
    }

    return new OpenAI({ apiKey })
}

export function resolveGeneratedImagePath(filename: string): string {
    return resolve(getProjectTmpDirectory(), filename)
}

export async function generateVehicleImage(input: VehicleImageGenerationInput): Promise<string> {
    const client = getOpenAiClient()
    const model = process.env.OPENAI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL

    imageGenerationLogger.info('vehicle_image.generation_started', {
        classificationKey: input.classificationKey,
        make: input.make,
        model: input.model,
        year: input.year,
        modelName: model
    })

    const response = await client.images.generate({
        model,
        prompt: buildPrompt(input),
        size: DEFAULT_IMAGE_SIZE
    })

    const imageBase64 = response.data?.[0]?.b64_json

    if (!imageBase64) {
        throw new Error('OpenAI did not return image data')
    }

    const filename = `${sanitizeFileSegment(input.classificationKey)}-${randomUUID()}.png`
    const filePath = resolveGeneratedImagePath(filename)

    await mkdir(getProjectTmpDirectory(), { recursive: true })
    await writeFile(filePath, Buffer.from(imageBase64, 'base64'))

    imageGenerationLogger.info('vehicle_image.generation_completed', {
        classificationKey: input.classificationKey,
        filename
    })

    return filename
}

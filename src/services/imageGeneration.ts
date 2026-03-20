import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import OpenAI from 'openai'
import { createLogger } from '../logging/logger.js'

const imageGenerationLogger = createLogger({ component: 'image-generation-service' })
const DEFAULT_IMAGE_MODEL = 'gpt-image-1'
const DEFAULT_IMAGE_SIZE = '1024x1536'
const DEFAULT_IMAGE_QUALITY = 'medium'
const DEFAULT_OUTPUT_FORMAT = 'webp'
const DEFAULT_BACKGROUND = 'transparent'

export interface VehicleImageSourceInput {
    make: string
    model: string
    year: number
    trim: string
    vehicleType?: string | null
    color?: string | null
}

export interface VehicleImageGenerationInput extends VehicleImageSourceInput {
    classificationKey: string
    yearStart: number
    yearEnd: number
    bodyStyle?: string | null
    view?: string | null
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
    const color = input.color?.trim() || ''
    const subjectColorSegment = color ? ` ${color}` : ''
    const optionalContext = [input.trim, input.bodyStyle, input.vehicleType]
        .map(value => value?.trim())
        .filter((value): value is string => Boolean(value))
        .join(', ')

    return [
        `Generate a high-quality, realistic studio-style vehicle cutout of a ${input.year} ${input.make} ${input.model}${subjectColorSegment}.`,
        '',
        'Requirements:',
        '- Show the car from a front-right three-quarter angle, clearly revealing both the front and the right side.',
        '- The vehicle must be the main and only subject.',
        `- Use accurate body shape, proportions, trim styling, headlights, grille, wheels, mirrors, and overall design details appropriate for a ${input.year} ${input.make} ${input.model}.`,
        color
            ? `- If a color is provided, the car paint must match that color exactly. Use ${color} as the paint color.`
            : `- If no color is provided, use a paint color that was commonly available or strongly associated with the ${input.year} ${input.make} ${input.model}.`,
        '- Clean studio lighting with soft realistic reflections on the paint and glass.',
        '- Transparent background only. No floor, no shadows baked into a background, no environment, no scenery, no road, no people, no text, no watermark, no logo overlay, no license plate text.',
        '- Center the full vehicle in frame with all edges fully visible.',
        '- Output should look like a polished automotive catalog or dealership cutout image.',
        '- Preserve realism and avoid stylization, cartoon effects, illustration effects, or exaggerated concept-car features.',
        `- The reusable model-year span for this image should fit ${input.yearStart} through ${input.yearEnd}.`,
        optionalContext ? `- Additional identifying context: ${optionalContext}.` : null
    ]
        .filter((line): line is string => line !== null)
        .join('\n')
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
        size: DEFAULT_IMAGE_SIZE,
        quality: DEFAULT_IMAGE_QUALITY,
        output_format: DEFAULT_OUTPUT_FORMAT,
        background: DEFAULT_BACKGROUND
    })

    const imageBase64 = response.data?.[0]?.b64_json

    if (!imageBase64) {
        throw new Error('OpenAI did not return image data')
    }

    const filename = `${sanitizeFileSegment(input.classificationKey)}-${randomUUID()}.webp`
    const filePath = resolveGeneratedImagePath(filename)

    await mkdir(getProjectTmpDirectory(), { recursive: true })
    await writeFile(filePath, Buffer.from(imageBase64, 'base64'))

    imageGenerationLogger.info('vehicle_image.generation_completed', {
        classificationKey: input.classificationKey,
        filename
    })

    return filename
}

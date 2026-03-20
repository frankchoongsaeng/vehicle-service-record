import OpenAI from 'openai'
import { createLogger } from '../logging/logger.js'
import type { VehicleImageGenerationInput } from './imageGeneration.js'

const imageClassifierLogger = createLogger({ component: 'image-classifier-service' })
const DEFAULT_CLASSIFIER_MODEL = 'gpt-4.1-mini'
const DEFAULT_VIEW = 'default'

export interface VehicleImageClassificationResult {
    yearStart: number
    yearEnd: number
    bodyStyle: string | null
    vehicleType: string | null
    view: string
}

function getOpenAiClient(): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY?.trim()

    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not configured')
    }

    return new OpenAI({ apiKey })
}

function toNullableString(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null
    }

    const normalized = value.trim()
    return normalized.length > 0 ? normalized : null
}

function normalizeYearRange(
    year: number,
    yearStart: unknown,
    yearEnd: unknown
): Pick<VehicleImageClassificationResult, 'yearStart' | 'yearEnd'> {
    const parsedStart = typeof yearStart === 'number' && Number.isInteger(yearStart) ? yearStart : year
    const parsedEnd = typeof yearEnd === 'number' && Number.isInteger(yearEnd) ? yearEnd : year

    return {
        yearStart: Math.min(parsedStart, parsedEnd),
        yearEnd: Math.max(parsedStart, parsedEnd)
    }
}

function buildClassifierPrompt(input: VehicleImageGenerationInput): string {
    return [
        'You classify reusable vehicle illustration metadata for a maintenance app.',
        'Return only valid JSON.',
        'Infer the broadest realistic year range that can share the same catalog image for this vehicle generation.',
        'Use the provided year as an anchor, keep ranges conservative, and do not invent impossible trims or body styles.',
        'Required JSON keys: yearStart, yearEnd, bodyStyle, vehicleType, view.',
        'The view should usually be "default" unless a different stable catalog view is clearly warranted.',
        `Vehicle: ${input.year} ${input.make} ${input.model} ${input.trim}.`,
        `Color: ${input.color?.trim() || 'unknown'}.`,
        `Vehicle type: ${input.vehicleType?.trim() || 'unknown'}.`
    ].join(' ')
}

export async function classifyVehicleImage(
    input: VehicleImageGenerationInput
): Promise<VehicleImageClassificationResult> {
    const client = getOpenAiClient()
    const model = process.env.OPENAI_IMAGE_CLASSIFIER_MODEL?.trim() || DEFAULT_CLASSIFIER_MODEL

    imageClassifierLogger.info('vehicle_image.classification_started', {
        classificationKey: input.classificationKey,
        make: input.make,
        model: input.model,
        year: input.year,
        modelName: model
    })

    const response = await client.chat.completions.create({
        model,
        response_format: { type: 'json_object' },
        messages: [
            {
                role: 'system',
                content: 'You return only JSON for vehicle image metadata classification.'
            },
            {
                role: 'user',
                content: buildClassifierPrompt(input)
            }
        ]
    })

    const content = response.choices[0]?.message?.content

    if (!content) {
        throw new Error('OpenAI did not return image classification content')
    }

    const parsed = JSON.parse(content) as Record<string, unknown>
    const { yearStart, yearEnd } = normalizeYearRange(input.year, parsed.yearStart, parsed.yearEnd)

    const result: VehicleImageClassificationResult = {
        yearStart,
        yearEnd,
        bodyStyle: toNullableString(parsed.bodyStyle),
        vehicleType: toNullableString(parsed.vehicleType) ?? input.vehicleType ?? null,
        view: toNullableString(parsed.view) ?? DEFAULT_VIEW
    }

    imageClassifierLogger.info('vehicle_image.classification_completed', {
        classificationKey: input.classificationKey,
        yearStart: result.yearStart,
        yearEnd: result.yearEnd,
        bodyStyle: result.bodyStyle ?? undefined,
        vehicleType: result.vehicleType ?? undefined,
        view: result.view
    })

    return result
}

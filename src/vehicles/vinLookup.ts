import { createLogger } from '../logging/logger.js'

const vinLookupLogger = createLogger({ component: 'vin-lookup' })

const VIN_LENGTH = 17
const VIN_POSITION_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2] as const
const VIN_TRANSLITERATION: Record<string, number> = {
    A: 1,
    B: 2,
    C: 3,
    D: 4,
    E: 5,
    F: 6,
    G: 7,
    H: 8,
    J: 1,
    K: 2,
    L: 3,
    M: 4,
    N: 5,
    P: 7,
    R: 9,
    S: 2,
    T: 3,
    U: 4,
    V: 5,
    W: 6,
    X: 7,
    Y: 8,
    Z: 9,
    '0': 0,
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9
}
const EMPTY_VPIC_VALUES = new Set(['', '0', 'Not Applicable', 'Not Available', 'NULL', 'null'])

interface VpicDecodeResponse {
    Results?: VpicVehicleResult[]
}

interface VpicVehicleResult {
    AdditionalErrorText?: string
    BodyClass?: string
    Doors?: string
    DriveType?: string
    ElectrificationLevel?: string
    EngineConfiguration?: string
    EngineCylinders?: string
    EngineHP?: string
    EngineModel?: string
    ErrorCode?: string
    ErrorText?: string
    FuelTypePrimary?: string
    FuelTypeSecondary?: string
    DisplacementL?: string
    Make?: string
    Manufacturer?: string
    Model?: string
    ModelYear?: string
    PlantCity?: string
    PlantCountry?: string
    PlantState?: string
    Series?: string
    Series2?: string
    TransmissionSpeeds?: string
    TransmissionStyle?: string
    Trim?: string
    Trim2?: string
    VehicleType?: string
}

interface VinLookupDetails {
    manufacturer?: string
    bodyClass?: string
    vehicleType?: string
    driveType?: string
    doors?: number
    series?: string
    series2?: string
    trim2?: string
    engineModel?: string
    engineCylinders?: number
    engineHorsepower?: number
    transmissionSpeeds?: string
    electrificationLevel?: string
    plantCity?: string
    plantState?: string
    plantCountry?: string
}

export interface VinLookupResult {
    vin: string
    make: string
    model: string
    year: number
    trim?: string
    vehicleType?: string
    engine?: string
    transmission?: string
    fuelType?: string
    details: VinLookupDetails
}

export class VinLookupError extends Error {
    status: number

    constructor(message: string, status: number) {
        super(message)
        this.name = 'VinLookupError'
        this.status = status
    }
}

function normalizeVinCharacter(value: string): string {
    return value
        .trim()
        .toUpperCase()
        .replace(/[^A-HJ-NPR-Z0-9]/g, '')
}

function cleanDecodedValue(value?: string): string | undefined {
    if (!value) {
        return undefined
    }

    const trimmed = value.trim()
    if (EMPTY_VPIC_VALUES.has(trimmed)) {
        return undefined
    }

    return trimmed
}

function toSentenceCase(value: string): string {
    if (value !== value.toUpperCase()) {
        return value
    }

    if (value.length <= 4 && !value.includes(' ')) {
        return value
    }

    return value
        .toLowerCase()
        .replace(/(^|[\s/-])([a-z])/g, (_match, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`)
}

function parseInteger(value?: string): number | undefined {
    const normalized = cleanDecodedValue(value)
    if (!normalized) {
        return undefined
    }

    const parsed = Number.parseInt(normalized, 10)
    return Number.isFinite(parsed) ? parsed : undefined
}

function parseNumber(value?: string): number | undefined {
    const normalized = cleanDecodedValue(value)
    if (!normalized) {
        return undefined
    }

    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : undefined
}

function mapVehicleType(vehicleType?: string, bodyClass?: string): string | undefined {
    const haystack = `${vehicleType ?? ''} ${bodyClass ?? ''}`.toLowerCase()

    if (!haystack) {
        return undefined
    }

    if (haystack.includes('minivan')) {
        return 'Minivan'
    }
    if (haystack.includes('sport utility') || haystack.includes('suv') || haystack.includes('crossover')) {
        return 'SUV'
    }
    if (haystack.includes('pickup') || haystack.includes('truck')) {
        return 'Truck'
    }
    if (haystack.includes('van')) {
        return 'Van'
    }
    if (haystack.includes('scooter')) {
        return 'Scooter'
    }
    if (haystack.includes('motorcycle')) {
        return 'Motorcycle'
    }
    if (haystack.includes('atv')) {
        return 'ATV'
    }
    if (haystack.includes('utv')) {
        return 'UTV'
    }
    if (haystack.includes('trailer')) {
        return 'Trailer'
    }
    if (haystack.includes('motorhome') || haystack.includes('rv')) {
        return 'RV'
    }
    if (haystack.includes('boat') || haystack.includes('marine')) {
        return 'Boat'
    }
    if (
        haystack.includes('passenger car') ||
        haystack.includes('sedan') ||
        haystack.includes('coupe') ||
        haystack.includes('wagon') ||
        haystack.includes('hatchback') ||
        haystack.includes('convertible')
    ) {
        return 'Car'
    }

    return 'Other'
}

function mapTransmission(style?: string): string | undefined {
    const normalized = cleanDecodedValue(style)?.toLowerCase()
    if (!normalized) {
        return undefined
    }

    if (normalized.includes('dual') && normalized.includes('clutch')) {
        return 'Dual-clutch'
    }
    if (normalized.includes('continuously variable') || normalized.includes('cvt')) {
        return 'CVT'
    }
    if (normalized.includes('semi') || normalized.includes('automated manual')) {
        return 'Semi-automatic'
    }
    if (normalized.includes('manual')) {
        return 'Manual'
    }
    if (normalized.includes('automatic')) {
        return 'Automatic'
    }

    return undefined
}

function mapFuelType(primary?: string, secondary?: string, electrificationLevel?: string): string | undefined {
    const primaryValue = cleanDecodedValue(primary)?.toLowerCase() ?? ''
    const secondaryValue = cleanDecodedValue(secondary)?.toLowerCase() ?? ''
    const electrificationValue = cleanDecodedValue(electrificationLevel)?.toLowerCase() ?? ''
    const haystack = `${primaryValue} ${secondaryValue} ${electrificationValue}`

    if (!haystack.trim()) {
        return undefined
    }

    if (haystack.includes('plug-in')) {
        return 'Plug-in Hybrid'
    }
    if (primaryValue.includes('electric') && !haystack.includes('hybrid')) {
        return 'Electric'
    }
    if (haystack.includes('hybrid')) {
        return 'Hybrid'
    }
    if (haystack.includes('flex')) {
        return 'Flex Fuel'
    }
    if (haystack.includes('diesel')) {
        return 'Diesel'
    }
    if (haystack.includes('gasoline') || haystack.includes('petrol')) {
        return 'Gasoline'
    }

    return undefined
}

function buildEngineDescription(result: VpicVehicleResult): string | undefined {
    const displacementLiters = parseNumber(result.DisplacementL)
    const cylinderCount = parseInteger(result.EngineCylinders)
    const horsepower = parseInteger(result.EngineHP)
    const configuration = cleanDecodedValue(result.EngineConfiguration)?.toLowerCase()

    const segments: string[] = []

    if (displacementLiters) {
        segments.push(`${displacementLiters.toFixed(1)}L`)
    }

    if (cylinderCount) {
        if (configuration?.includes('v-shaped')) {
            segments.push(`V${cylinderCount}`)
        } else if (configuration?.includes('in-line') || configuration?.includes('inline')) {
            segments.push(`I${cylinderCount}`)
        } else if (configuration?.includes('boxer')) {
            segments.push(`H${cylinderCount}`)
        } else {
            segments.push(`${cylinderCount}-cyl`)
        }
    }

    if (horsepower) {
        segments.push(`(${horsepower} hp)`)
    }

    if (segments.length > 0) {
        return segments.join(' ')
    }

    return cleanDecodedValue(result.EngineModel)
}

function buildTrim(result: VpicVehicleResult): string | undefined {
    return cleanDecodedValue(result.Trim) ?? cleanDecodedValue(result.Series) ?? cleanDecodedValue(result.Series2)
}

function decodeVinCheckDigit(vin: string): string {
    const total = vin.split('').reduce((sum, character, index) => {
        const value = VIN_TRANSLITERATION[character]
        return sum + value * VIN_POSITION_WEIGHTS[index]
    }, 0)

    const remainder = total % 11
    return remainder === 10 ? 'X' : String(remainder)
}

export function normalizeVin(rawVin: string): string {
    return normalizeVinCharacter(rawVin).slice(0, VIN_LENGTH)
}

export function isValidVin(rawVin: string): boolean {
    const vin = normalizeVin(rawVin)
    if (vin.length !== VIN_LENGTH) {
        return false
    }

    return vin[8] === decodeVinCheckDigit(vin)
}

function buildLookupResult(vin: string, result: VpicVehicleResult): VinLookupResult {
    const make = cleanDecodedValue(result.Make)
    const model = cleanDecodedValue(result.Model)
    const year = parseInteger(result.ModelYear)

    if (!make || !model || !year) {
        throw new VinLookupError('No vehicle details were found for this VIN.', 404)
    }

    return {
        vin,
        make: toSentenceCase(make),
        model: toSentenceCase(model),
        year,
        trim: buildTrim(result),
        vehicleType: mapVehicleType(cleanDecodedValue(result.VehicleType), cleanDecodedValue(result.BodyClass)),
        engine: buildEngineDescription(result),
        transmission: mapTransmission(result.TransmissionStyle),
        fuelType: mapFuelType(result.FuelTypePrimary, result.FuelTypeSecondary, result.ElectrificationLevel),
        details: {
            manufacturer: cleanDecodedValue(result.Manufacturer),
            bodyClass: cleanDecodedValue(result.BodyClass),
            vehicleType: cleanDecodedValue(result.VehicleType),
            driveType: cleanDecodedValue(result.DriveType),
            doors: parseInteger(result.Doors),
            series: cleanDecodedValue(result.Series),
            series2: cleanDecodedValue(result.Series2),
            trim2: cleanDecodedValue(result.Trim2),
            engineModel: cleanDecodedValue(result.EngineModel),
            engineCylinders: parseInteger(result.EngineCylinders),
            engineHorsepower: parseInteger(result.EngineHP),
            transmissionSpeeds: cleanDecodedValue(result.TransmissionSpeeds),
            electrificationLevel: cleanDecodedValue(result.ElectrificationLevel),
            plantCity: cleanDecodedValue(result.PlantCity),
            plantState: cleanDecodedValue(result.PlantState),
            plantCountry: cleanDecodedValue(result.PlantCountry)
        }
    }
}

export async function lookupVin(rawVin: string): Promise<VinLookupResult> {
    const vin = normalizeVin(rawVin)
    if (!isValidVin(vin)) {
        throw new VinLookupError('A valid 17-character VIN is required.', 400)
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    try {
        const response = await fetch(
            `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(vin)}?format=json`,
            {
                signal: controller.signal,
                headers: {
                    Accept: 'application/json'
                }
            }
        )

        if (!response.ok) {
            vinLookupLogger.warn('vin_lookup.request_failed', {
                vin,
                statusCode: response.status
            })
            throw new VinLookupError('VIN lookup is temporarily unavailable.', 502)
        }

        const payload = (await response.json()) as VpicDecodeResponse
        const result = payload.Results?.[0]
        if (!result) {
            throw new VinLookupError('No vehicle details were found for this VIN.', 404)
        }

        if (cleanDecodedValue(result.ErrorCode) && result.ErrorCode !== '0') {
            vinLookupLogger.warn('vin_lookup.decode_failed', {
                vin,
                errorCode: result.ErrorCode,
                errorText: result.ErrorText,
                additionalErrorText: result.AdditionalErrorText
            })
            throw new VinLookupError('No vehicle details were found for this VIN.', 404)
        }

        return buildLookupResult(vin, result)
    } catch (error) {
        if (error instanceof VinLookupError) {
            throw error
        }

        vinLookupLogger.error('vin_lookup.unexpected_error', {
            vin,
            error
        })

        throw new VinLookupError('VIN lookup is temporarily unavailable.', 502)
    } finally {
        clearTimeout(timeout)
    }
}

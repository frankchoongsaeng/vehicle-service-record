export const vehicleTypeOptions = [
    'Car',
    'SUV',
    'Truck',
    'Van',
    'Minivan',
    'Motorcycle',
    'Scooter',
    'ATV',
    'UTV',
    'RV',
    'Trailer',
    'Boat',
    'Other'
] as const

export type VehicleTypeOption = (typeof vehicleTypeOptions)[number]

export const defaultVehicleTypeImage = '/images/add-car.webp'
export const fallbackVehicleTypeImage = '/images/add-other.webp'

const vehicleTypeImages: Record<string, string> = {
    atv: '/images/add-atv.webp',
    boat: '/images/add-boat.webp',
    car: '/images/add-car.webp',
    minivan: '/images/add-minivan.webp',
    motorcycle: '/images/add-motorcycle.webp',
    other: '/images/add-other.webp',
    rv: '/images/add-rv.webp',
    scooter: '/images/add-scooter.webp',
    suv: '/images/add-suv.webp',
    trailer: '/images/add-trailer.webp',
    truck: '/images/add-truck.webp',
    utv: '/images/add-utv.webp',
    van: '/images/add-van.webp'
}

function normalizeVehicleType(vehicleType?: string | null): string {
    return vehicleType?.trim().toLowerCase().replace(/\s+/g, '-') ?? ''
}

export function isKnownVehicleType(vehicleType?: string | null): vehicleType is VehicleTypeOption {
    return vehicleTypeOptions.includes(vehicleType as VehicleTypeOption)
}

export function getVehicleTypeImage(vehicleType?: string | null): string {
    const normalizedVehicleType = normalizeVehicleType(vehicleType)

    if (!normalizedVehicleType) {
        return defaultVehicleTypeImage
    }

    return vehicleTypeImages[normalizedVehicleType] ?? fallbackVehicleTypeImage
}
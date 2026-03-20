export interface VehicleImage {
    id: number
    classificationKey: string
    make: string
    model: string
    color: string
    yearStart: number
    yearEnd: number
    trim?: string | null
    vehicleType?: string | null
    bodyStyle?: string | null
    view: string
    generationKey?: string | null
    promptVersion?: string | null
    storageKey: string
    created_at: string
    updated_at: string
}

export interface Vehicle {
    id: number
    imageId?: number | null
    make: string
    model: string
    year: number
    trim: string
    vehicleType?: string | null
    plateNumber?: string | null
    vin?: string | null
    engine?: string | null
    transmission: string
    fuelType: string
    purchaseMileage?: number | null
    mileage?: number | null
    color?: string | null
    notes?: string | null
    image?: VehicleImage | null
    created_at: string
    updated_at: string
}

export interface VehicleInput {
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
    color?: string
    notes?: string
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
    details: {
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
}

export const SERVICE_TYPES = [
    { value: 'oil_change', label: 'Oil Change' },
    { value: 'tire_rotation', label: 'Tire Rotation' },
    { value: 'brake_service', label: 'Brake Service' },
    { value: 'tire_replacement', label: 'Tire Replacement' },
    { value: 'battery', label: 'Battery Replacement' },
    { value: 'air_filter', label: 'Air Filter' },
    { value: 'cabin_filter', label: 'Cabin Filter' },
    { value: 'transmission', label: 'Transmission Service' },
    { value: 'coolant', label: 'Coolant Flush' },
    { value: 'spark_plugs', label: 'Spark Plugs' },
    { value: 'timing_belt', label: 'Timing Belt / Chain' },
    { value: 'wiper_blades', label: 'Wiper Blades' },
    { value: 'inspection', label: 'Inspection' },
    { value: 'other', label: 'Other' }
] as const

export type ServiceTypeValue = (typeof SERVICE_TYPES)[number]['value']

export interface AuthUser {
    id: string
    email: string
}

export interface LoginInput {
    email: string
    password: string
}

export interface SignupInput {
    email: string
    password: string
}

export interface ServiceRecord {
    id: number
    vehicle_id: number
    service_type: ServiceTypeValue
    description: string
    date: string
    mileage?: number | null
    cost?: number | null
    notes?: string | null
    created_at: string
    updated_at: string
}

export interface ServiceRecordInput {
    service_type: ServiceTypeValue
    description: string
    date: string
    mileage?: number
    cost?: number
    notes?: string
}

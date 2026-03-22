import {
    SERVICE_TYPES,
    getServiceTypeLabel,
    isServiceTypeValue,
    type ServiceTypeValue
} from '../../types/serviceTypes.js'

export { SERVICE_TYPES, getServiceTypeLabel, isServiceTypeValue }
export type { ServiceTypeValue }

export interface Vehicle {
    id: number
    imageId?: number | null
    imageUrl?: string | null
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

export interface Workshop {
    id: number
    name: string
    address?: string | null
    phone?: string | null
    created_at: string
    updated_at: string
}

export interface WorkshopInput {
    name: string
    address?: string
    phone?: string
}

export interface ServiceRecord {
    id: number
    vehicle_id: number
    maintenance_plan_id?: number | null
    service_type: ServiceTypeValue
    workshop?: string | null
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
    maintenance_plan_id?: number
    workshop?: string
    mileage?: number
    cost?: number
    notes?: string
}

export interface ServiceRecordUpdateInput {
    workshop?: string
    description: string
    cost?: number
    notes?: string
}

export interface MaintenancePlan {
    id: number
    vehicleId: number
    serviceType: ServiceTypeValue
    title: string
    description?: string | null
    intervalMonths?: number | null
    intervalMileage?: number | null
    lastCompletedDate?: string | null
    lastCompletedMileage?: number | null
    created_at: string
    updated_at: string
}

export interface MaintenancePlanInput {
    serviceType: ServiceTypeValue
    title: string
    description?: string
    intervalMonths?: number
    intervalMileage?: number
    lastCompletedDate?: string
    lastCompletedMileage?: number
}

import type {
    AuthUser,
    LoginInput,
    SignupInput,
    Vehicle,
    VehicleInput,
    ServiceRecord,
    ServiceRecordInput
} from '../types'

const BASE = '/api'

export class ApiError extends Error {
    status: number

    constructor(message: string, status: number) {
        super(message)
        this.name = 'ApiError'
        this.status = status
    }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        credentials: 'same-origin',
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options?.headers ?? {})
        }
    })
    if (res.status === 204) return undefined as T
    const data = await res.json()
    if (!res.ok) throw new ApiError(data.error ?? 'Request failed', res.status)
    return data as T
}

// ── Auth ───────────────────────────────────────────────────────────────────

export const getSession = async (): Promise<AuthUser> => {
    const data = await request<{ user: AuthUser }>('/auth/session')
    return data.user
}

export const login = async (input: LoginInput): Promise<AuthUser> => {
    const data = await request<{ user: AuthUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(input)
    })
    return data.user
}

export const signup = async (input: SignupInput): Promise<AuthUser> => {
    const data = await request<{ user: AuthUser }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(input)
    })
    return data.user
}

export const logout = (): Promise<void> => request('/auth/logout', { method: 'POST' })

// ── Vehicles ────────────────────────────────────────────────────────────────

export const getVehicles = (): Promise<Vehicle[]> => request('/vehicles')

export const getVehicle = (id: number): Promise<Vehicle> => request(`/vehicles/${id}`)

export const createVehicle = (input: VehicleInput): Promise<Vehicle> =>
    request('/vehicles', { method: 'POST', body: JSON.stringify(input) })

export const updateVehicle = (id: number, input: VehicleInput): Promise<Vehicle> =>
    request(`/vehicles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input)
    })

export const deleteVehicle = (id: number): Promise<void> => request(`/vehicles/${id}`, { method: 'DELETE' })

// ── Service Records ──────────────────────────────────────────────────────────

export const getRecords = (vehicleId: number): Promise<ServiceRecord[]> => request(`/vehicles/${vehicleId}/records`)

export const createRecord = (vehicleId: number, input: ServiceRecordInput): Promise<ServiceRecord> =>
    request(`/vehicles/${vehicleId}/records`, {
        method: 'POST',
        body: JSON.stringify(input)
    })

export const updateRecord = (vehicleId: number, recordId: number, input: ServiceRecordInput): Promise<ServiceRecord> =>
    request(`/vehicles/${vehicleId}/records/${recordId}`, {
        method: 'PUT',
        body: JSON.stringify(input)
    })

export const deleteRecord = (vehicleId: number, recordId: number): Promise<void> =>
    request(`/vehicles/${vehicleId}/records/${recordId}`, {
        method: 'DELETE'
    })

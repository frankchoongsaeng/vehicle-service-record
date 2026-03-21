import type {
    AuthUser,
    LoginInput,
    SignupInput,
    Vehicle,
    VinLookupResult,
    VehicleInput,
    ServiceRecord,
    ServiceRecordInput,
    MaintenancePlan,
    MaintenancePlanInput
} from '../types/index.js'

const BASE = '/api'
const REQUEST_ID_HEADER = 'x-request-id'
const REQUEST_ID_STORAGE_KEY = 'duralog.apiRequestSessionId'

let requestSequence = 0

function createRandomId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }

    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function getBrowserSessionId(): string {
    if (typeof window === 'undefined') {
        return `server-${createRandomId()}`
    }

    const existing = window.sessionStorage.getItem(REQUEST_ID_STORAGE_KEY)
    if (existing) {
        return existing
    }

    const sessionId = createRandomId()
    window.sessionStorage.setItem(REQUEST_ID_STORAGE_KEY, sessionId)
    return sessionId
}

function createRequestId(): string {
    requestSequence += 1
    return `${getBrowserSessionId()}-${requestSequence}`
}

function getResponseRequestId(res: Response, fallbackRequestId: string): string {
    return res.headers.get(REQUEST_ID_HEADER) ?? fallbackRequestId
}

function logApiEvent(level: 'debug' | 'warn', message: string, context: Record<string, unknown>): void {
    if (level === 'warn') {
        console.warn(`[api] ${message}`, context)
        return
    }

    if (import.meta.env.DEV) {
        console.debug(`[api] ${message}`, context)
    }
}

export class ApiError extends Error {
    status: number
    requestId: string

    constructor(message: string, status: number, requestId: string) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.requestId = requestId
    }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const requestId = createRequestId()
    const res = await fetch(`${BASE}${path}`, {
        credentials: 'same-origin',
        ...options,
        headers: {
            'Content-Type': 'application/json',
            [REQUEST_ID_HEADER]: requestId,
            ...(options?.headers ?? {})
        }
    })

    const responseRequestId = getResponseRequestId(res, requestId)
    logApiEvent('debug', 'request.completed', {
        requestId: responseRequestId,
        method: options?.method ?? 'GET',
        path,
        status: res.status
    })

    if (res.status === 204) return undefined as T
    const data = await res.json()
    if (!res.ok) {
        logApiEvent('warn', 'request.failed', {
            requestId: responseRequestId,
            method: options?.method ?? 'GET',
            path,
            status: res.status,
            error: data.error ?? 'Request failed'
        })
        throw new ApiError(data.error ?? 'Request failed', res.status, responseRequestId)
    }
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

export const lookupVin = (vin: string): Promise<VinLookupResult> =>
    request(`/vehicles/vin-search/${encodeURIComponent(vin)}`)

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

// ── Maintenance Plans ───────────────────────────────────────────────────────

export const getMaintenancePlans = (vehicleId: number): Promise<MaintenancePlan[]> =>
    request(`/vehicles/${vehicleId}/maintenance-plans`)

export const createMaintenancePlan = (vehicleId: number, input: MaintenancePlanInput): Promise<MaintenancePlan> =>
    request(`/vehicles/${vehicleId}/maintenance-plans`, {
        method: 'POST',
        body: JSON.stringify(input)
    })

export const updateMaintenancePlan = (
    vehicleId: number,
    planId: number,
    input: MaintenancePlanInput
): Promise<MaintenancePlan> =>
    request(`/vehicles/${vehicleId}/maintenance-plans/${planId}`, {
        method: 'PUT',
        body: JSON.stringify(input)
    })

export const deleteMaintenancePlan = (vehicleId: number, planId: number): Promise<void> =>
    request(`/vehicles/${vehicleId}/maintenance-plans/${planId}`, {
        method: 'DELETE'
    })

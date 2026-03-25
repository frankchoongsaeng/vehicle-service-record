import type {
    AuthUser,
    LoginInput,
    SignupInput,
    UserSettingsInput,
    Workshop,
    WorkshopInput,
    Vehicle,
    VinLookupResult,
    VehicleInput,
    ServiceRecord,
    ServiceRecordInput,
    ServiceRecordUpdateInput,
    MaintenancePlan,
    MaintenancePlanInput,
    VehicleReminderPreferences,
    VehicleReminderPreferencesInput,
    WorkspaceReminderPreferences,
    WorkspaceReminderPreferencesInput
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

export const resendEmailVerification = async (): Promise<AuthUser> => {
    const data = await request<{ user: AuthUser }>('/auth/verification/resend', {
        method: 'POST'
    })

    return data.user
}

export const verifyEmail = async (
    token: string
): Promise<{ verified: boolean; email: string; sessionUpdated: boolean; user: AuthUser | null }> => {
    return request('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token })
    })
}

export const logout = (): Promise<void> => request('/auth/logout', { method: 'POST' })

export const updateSettings = async (input: UserSettingsInput): Promise<AuthUser> => {
    const data = await request<{ user: AuthUser }>('/settings', {
        method: 'PUT',
        body: JSON.stringify(input)
    })

    return data.user
}

export const uploadProfileImage = async (file: File): Promise<AuthUser> => {
    const requestId = createRequestId()
    const res = await fetch(`${BASE}/settings/profile-image`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            [REQUEST_ID_HEADER]: requestId,
            'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
    })

    const responseRequestId = getResponseRequestId(res, requestId)
    logApiEvent('debug', 'request.completed', {
        requestId: responseRequestId,
        method: 'POST',
        path: '/settings/profile-image',
        status: res.status
    })

    const data = await res.json()

    if (!res.ok) {
        logApiEvent('warn', 'request.failed', {
            requestId: responseRequestId,
            method: 'POST',
            path: '/settings/profile-image',
            status: res.status,
            error: data.error ?? 'Request failed'
        })
        throw new ApiError(data.error ?? 'Request failed', res.status, responseRequestId)
    }

    return (data as { user: AuthUser }).user
}

export const removeProfileImage = async (): Promise<AuthUser> => {
    const data = await request<{ user: AuthUser }>('/settings/profile-image', {
        method: 'DELETE'
    })

    return data.user
}

export const completeOnboarding = async (): Promise<AuthUser> => {
    const data = await request<{ user: AuthUser }>('/settings/onboarding/complete', {
        method: 'POST'
    })

    return data.user
}

// ── Workshops ───────────────────────────────────────────────────────────────

export const getWorkshops = (): Promise<Workshop[]> => request('/workshops')

export const createWorkshop = (input: WorkshopInput): Promise<Workshop> =>
    request('/workshops', {
        method: 'POST',
        body: JSON.stringify(input)
    })

export const updateWorkshop = (id: number, input: WorkshopInput): Promise<Workshop> =>
    request(`/workshops/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input)
    })

export const deleteWorkshop = (id: number): Promise<void> => request(`/workshops/${id}`, { method: 'DELETE' })

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

export const updateRecord = (
    vehicleId: number,
    recordId: number,
    input: ServiceRecordUpdateInput
): Promise<ServiceRecord> =>
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

// ── Reminders ───────────────────────────────────────────────────────────────

export const getReminderPreferences = (): Promise<WorkspaceReminderPreferences> => request('/reminders/preferences')

export const updateReminderPreferences = (
    input: WorkspaceReminderPreferencesInput
): Promise<WorkspaceReminderPreferences> =>
    request('/reminders/preferences', {
        method: 'PUT',
        body: JSON.stringify(input)
    })

export const getVehicleReminderPreferences = (vehicleId: number): Promise<VehicleReminderPreferences> =>
    request(`/reminders/vehicles/${vehicleId}`)

export const updateVehicleReminderPreferences = (
    vehicleId: number,
    input: VehicleReminderPreferencesInput
): Promise<VehicleReminderPreferences> =>
    request(`/reminders/vehicles/${vehicleId}`, {
        method: 'PUT',
        body: JSON.stringify(input)
    })

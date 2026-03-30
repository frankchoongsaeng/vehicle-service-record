import type {
    AuthUser,
    BillingGateResponse,
    BillingInterval,
    BillingSubscriptionState,
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
    WorkspaceReminderPreferencesInput,
    PlanCode
} from '../types/index.js'
import { addClientMonitoringBreadcrumb, captureClientException, getClientTraceHeaders } from '../monitoring/client.js'

const BASE = '/api'
const REQUEST_ID_HEADER = 'x-request-id'
const REQUEST_ID_STORAGE_KEY = 'duralog.apiRequestSessionId'
const DEFAULT_REQUEST_ERROR_MESSAGE = 'Something went wrong. Please try again.'
const DEFAULT_NETWORK_ERROR_MESSAGE = 'We could not complete that request right now. Please try again.'
const SESSION_EXPIRED_MESSAGE = 'Your session has ended. Please sign in again.'

let requestSequence = 0
let unauthorizedHandler: (() => void) | null = null

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
    addClientMonitoringBreadcrumb('http', message, context, level === 'warn' ? 'warning' : 'debug')

    if (level === 'warn') {
        console.warn(`[api] ${message}`, context)
        return
    }

    if (import.meta.env.DEV) {
        console.debug(`[api] ${message}`, context)
    }
}

function normalizeUserFacingErrorMessage(message: string | null | undefined, fallback: string): string {
    const trimmedMessage = message?.trim()

    if (!trimmedMessage) {
        return fallback
    }

    const normalizedMessage = trimmedMessage.toLowerCase()

    if (normalizedMessage === 'authentication required') {
        return SESSION_EXPIRED_MESSAGE
    }

    if (
        normalizedMessage.includes('failed to fetch') ||
        normalizedMessage.includes('networkerror') ||
        normalizedMessage.includes('network error') ||
        normalizedMessage.includes('load failed') ||
        normalizedMessage.includes('request failed') ||
        normalizedMessage.includes('backend') ||
        normalizedMessage.includes('make sure') ||
        normalizedMessage.includes('connect to the server') ||
        normalizedMessage.includes('internal server error') ||
        normalizedMessage.includes('status code') ||
        normalizedMessage.includes('cors')
    ) {
        return fallback
    }

    return trimmedMessage
}

async function readResponseBody(res: Response): Promise<unknown> {
    const responseText = await res.text()

    if (!responseText) {
        return null
    }

    try {
        return JSON.parse(responseText) as unknown
    } catch {
        return { error: responseText }
    }
}

function getErrorMessage(data: unknown, fallback: string): string {
    if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
        return normalizeUserFacingErrorMessage(data.error, fallback)
    }

    return fallback
}

function getBillingGateResponseData(data: unknown): BillingGateResponse | null {
    if (!data || typeof data !== 'object') {
        return null
    }

    const candidate = data as Partial<BillingGateResponse>

    if (
        typeof candidate.error === 'string' &&
        (candidate.code === 'FEATURE_NOT_AVAILABLE' || candidate.code === 'PLAN_LIMIT_REACHED') &&
        typeof candidate.currentPlan === 'string'
    ) {
        return candidate as BillingGateResponse
    }

    return null
}

function notifyUnauthorized(): void {
    unauthorizedHandler?.()
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
    unauthorizedHandler = handler
}

export function isUnauthorizedError(error: unknown): error is ApiError {
    return error instanceof ApiError && error.status === 401
}

export function getUserFacingErrorMessage(error: unknown, fallback = DEFAULT_REQUEST_ERROR_MESSAGE): string {
    if (isUnauthorizedError(error)) {
        return SESSION_EXPIRED_MESSAGE
    }

    if (error instanceof ApiError || error instanceof Error) {
        return normalizeUserFacingErrorMessage(error.message, fallback)
    }

    return fallback
}

export class ApiError extends Error {
    status: number
    requestId: string
    details: unknown

    constructor(message: string, status: number, requestId: string, details: unknown) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.requestId = requestId
        this.details = details
    }
}

export function getBillingGateResponse(error: unknown): BillingGateResponse | null {
    if (!(error instanceof ApiError)) {
        return null
    }

    return getBillingGateResponseData(error.details)
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const requestId = createRequestId()
    const method = options?.method ?? 'GET'
    let res: Response

    addClientMonitoringBreadcrumb(
        'http',
        'request.started',
        {
            requestId,
            method,
            path
        },
        'debug'
    )

    try {
        res = await fetch(`${BASE}${path}`, {
            credentials: 'same-origin',
            ...options,
            headers: {
                'Content-Type': 'application/json',
                [REQUEST_ID_HEADER]: requestId,
                ...getClientTraceHeaders(),
                ...(options?.headers ?? {})
            }
        })
    } catch (error) {
        captureClientException(error, {
            requestId,
            method,
            path,
            kind: 'network'
        })
        throw new Error(DEFAULT_NETWORK_ERROR_MESSAGE)
    }

    const responseRequestId = getResponseRequestId(res, requestId)
    logApiEvent('debug', 'request.completed', {
        requestId: responseRequestId,
        method,
        path,
        status: res.status
    })

    if (res.status === 204) return undefined as T
    const data = await readResponseBody(res)
    if (!res.ok) {
        if (res.status === 401) {
            notifyUnauthorized()
        }

        const message = getErrorMessage(
            data,
            res.status === 401 ? SESSION_EXPIRED_MESSAGE : DEFAULT_REQUEST_ERROR_MESSAGE
        )

        logApiEvent('warn', 'request.failed', {
            requestId: responseRequestId,
            method,
            path,
            status: res.status,
            error: message
        })

        if (res.status >= 500) {
            captureClientException(new ApiError(message, res.status, responseRequestId, data), {
                requestId: responseRequestId,
                method,
                path,
                status: res.status,
                details: data
            })
        }

        throw new ApiError(message, res.status, responseRequestId, data)
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

export const requestPasswordReset = async (email: string): Promise<void> => {
    await request('/auth/password-reset/request', {
        method: 'POST',
        body: JSON.stringify({ email })
    })
}

export const confirmPasswordReset = async (
    token: string,
    password: string
): Promise<{ reset: boolean; email: string; sessionUpdated: boolean; user: AuthUser | null }> => {
    return request('/auth/password-reset/confirm', {
        method: 'POST',
        body: JSON.stringify({ token, password })
    })
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
    let res: Response

    addClientMonitoringBreadcrumb(
        'http',
        'request.started',
        {
            requestId,
            method: 'POST',
            path: '/settings/profile-image'
        },
        'debug'
    )

    try {
        res = await fetch(`${BASE}/settings/profile-image`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                [REQUEST_ID_HEADER]: requestId,
                ...getClientTraceHeaders(),
                'Content-Type': file.type || 'application/octet-stream'
            },
            body: file
        })
    } catch (error) {
        captureClientException(error, {
            requestId,
            method: 'POST',
            path: '/settings/profile-image',
            kind: 'network'
        })
        throw new Error(DEFAULT_NETWORK_ERROR_MESSAGE)
    }

    const responseRequestId = getResponseRequestId(res, requestId)
    logApiEvent('debug', 'request.completed', {
        requestId: responseRequestId,
        method: 'POST',
        path: '/settings/profile-image',
        status: res.status
    })

    const data = await readResponseBody(res)

    if (!res.ok) {
        if (res.status === 401) {
            notifyUnauthorized()
        }

        const message = getErrorMessage(
            data,
            res.status === 401 ? SESSION_EXPIRED_MESSAGE : DEFAULT_REQUEST_ERROR_MESSAGE
        )

        logApiEvent('warn', 'request.failed', {
            requestId: responseRequestId,
            method: 'POST',
            path: '/settings/profile-image',
            status: res.status,
            error: message
        })

        if (res.status >= 500) {
            captureClientException(new ApiError(message, res.status, responseRequestId, data), {
                requestId: responseRequestId,
                method: 'POST',
                path: '/settings/profile-image',
                status: res.status,
                details: data
            })
        }

        throw new ApiError(message, res.status, responseRequestId, data)
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

// ── Billing ────────────────────────────────────────────────────────────────

export const getBillingSubscription = (): Promise<BillingSubscriptionState> => request('/billing/subscription')

export const createBillingCheckoutSession = (
    planCode: Exclude<PlanCode, 'free'>,
    billingInterval: BillingInterval,
    returnPath?: string
): Promise<{ url: string }> =>
    request('/billing/checkout-session', {
        method: 'POST',
        body: JSON.stringify({ planCode, billingInterval, returnPath })
    })

export const createBillingCustomerPortalSession = (): Promise<{ url: string }> =>
    request('/billing/customer-portal-session', {
        method: 'POST'
    })

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

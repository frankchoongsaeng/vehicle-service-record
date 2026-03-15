import type {
  Vehicle,
  VehicleInput,
  ServiceRecord,
  ServiceRecordInput,
} from '../types';

const BASE = '/api';

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Request failed');
  return data as T;
}

// ── Vehicles ────────────────────────────────────────────────────────────────

export const getVehicles = (): Promise<Vehicle[]> =>
  request('/vehicles');

export const getVehicle = (id: number): Promise<Vehicle> =>
  request(`/vehicles/${id}`);

export const createVehicle = (input: VehicleInput): Promise<Vehicle> =>
  request('/vehicles', { method: 'POST', body: JSON.stringify(input) });

export const updateVehicle = (
  id: number,
  input: VehicleInput
): Promise<Vehicle> =>
  request(`/vehicles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });

export const deleteVehicle = (id: number): Promise<void> =>
  request(`/vehicles/${id}`, { method: 'DELETE' });

// ── Service Records ──────────────────────────────────────────────────────────

export const getRecords = (vehicleId: number): Promise<ServiceRecord[]> =>
  request(`/vehicles/${vehicleId}/records`);

export const createRecord = (
  vehicleId: number,
  input: ServiceRecordInput
): Promise<ServiceRecord> =>
  request(`/vehicles/${vehicleId}/records`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const updateRecord = (
  vehicleId: number,
  recordId: number,
  input: ServiceRecordInput
): Promise<ServiceRecord> =>
  request(`/vehicles/${vehicleId}/records/${recordId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });

export const deleteRecord = (
  vehicleId: number,
  recordId: number
): Promise<void> =>
  request(`/vehicles/${vehicleId}/records/${recordId}`, {
    method: 'DELETE',
  });

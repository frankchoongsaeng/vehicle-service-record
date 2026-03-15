export interface Vehicle {
  id: number;
  make: string;
  model: string;
  year: number;
  vin?: string | null;
  mileage?: number | null;
  color?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleInput {
  make: string;
  model: string;
  year: number;
  vin?: string;
  mileage?: number;
  color?: string;
  notes?: string;
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
  { value: 'other', label: 'Other' },
] as const;

export type ServiceTypeValue = (typeof SERVICE_TYPES)[number]['value'];

export interface ServiceRecord {
  id: number;
  vehicle_id: number;
  service_type: ServiceTypeValue;
  description: string;
  date: string;
  mileage?: number | null;
  cost?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceRecordInput {
  service_type: ServiceTypeValue;
  description: string;
  date: string;
  mileage?: number;
  cost?: number;
  notes?: string;
}

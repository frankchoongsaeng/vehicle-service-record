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

const serviceTypeLabelByValue = new Map<string, string>(
    SERVICE_TYPES.map(serviceType => [serviceType.value, serviceType.label])
)
const serviceTypeValues = new Set<string>(SERVICE_TYPES.map(serviceType => serviceType.value))

export function getServiceTypeLabel(serviceType: string) {
    return serviceTypeLabelByValue.get(serviceType) ?? serviceType
}

export function isServiceTypeValue(serviceType: string): serviceType is ServiceTypeValue {
    return serviceTypeValues.has(serviceType)
}

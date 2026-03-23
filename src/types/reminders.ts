export const REMINDER_CHANNELS = ['email', 'sms', 'whatsapp'] as const
export type ReminderChannel = (typeof REMINDER_CHANNELS)[number]

export const REMINDER_PREFERENCE_MODES = ['inherit', 'custom', 'disabled'] as const
export type ReminderPreferenceMode = (typeof REMINDER_PREFERENCE_MODES)[number]

export const NOTIFICATION_KINDS = ['maintenance_digest'] as const
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number]

export const NOTIFICATION_STATUSES = ['pending', 'sent', 'failed'] as const
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number]

export function isReminderChannel(value: unknown): value is ReminderChannel {
    return typeof value === 'string' && REMINDER_CHANNELS.includes(value as ReminderChannel)
}

export function isReminderPreferenceMode(value: unknown): value is ReminderPreferenceMode {
    return typeof value === 'string' && REMINDER_PREFERENCE_MODES.includes(value as ReminderPreferenceMode)
}

export function isNotificationKind(value: unknown): value is NotificationKind {
    return typeof value === 'string' && NOTIFICATION_KINDS.includes(value as NotificationKind)
}

export function isNotificationStatus(value: unknown): value is NotificationStatus {
    return typeof value === 'string' && NOTIFICATION_STATUSES.includes(value as NotificationStatus)
}

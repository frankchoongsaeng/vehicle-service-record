import { Router, Request, Response } from 'express'

import { prisma } from '../db.js'
import { createLogger } from '../logging/logger.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { isReminderPreferenceMode, type ReminderPreferenceMode } from '../types/reminders.js'

const router = Router()
const remindersLogger = createLogger({ component: 'reminder-routes' })

type RuleInput = {
    daysThreshold?: unknown
    mileageThreshold?: unknown
}

function normalizeOptionalThreshold(value: unknown, field: string): number | null {
    if (value == null || value === '') {
        return null
    }

    const normalized = Number(value)

    if (!Number.isInteger(normalized) || normalized <= 0) {
        throw new Error(`${field} must be a positive whole number when provided`)
    }

    return normalized
}

function normalizeRule(input: unknown): { daysThreshold: number | null; mileageThreshold: number | null } | null {
    if (input == null) {
        return null
    }

    const raw = input as RuleInput
    const daysThreshold = normalizeOptionalThreshold(raw.daysThreshold, 'daysThreshold')
    const mileageThreshold = normalizeOptionalThreshold(raw.mileageThreshold, 'mileageThreshold')

    if (daysThreshold == null && mileageThreshold == null) {
        throw new Error('At least one reminder threshold is required')
    }

    return { daysThreshold, mileageThreshold }
}

function serializeRule(
    rule: {
        id: number
        channel: string
        days_threshold: number | null
        mileage_threshold: number | null
        created_at: Date
        updated_at: Date
    } | null
) {
    if (!rule) {
        return null
    }

    return {
        id: rule.id,
        channel: rule.channel,
        daysThreshold: rule.days_threshold,
        mileageThreshold: rule.mileage_threshold,
        created_at: rule.created_at,
        updated_at: rule.updated_at
    }
}

async function replaceWorkspaceRule(
    userId: string,
    rule: { daysThreshold: number | null; mileageThreshold: number | null } | null
) {
    await prisma.reminderRule.deleteMany({
        where: {
            user_id: userId,
            vehicle_id: null,
            channel: 'email'
        }
    })

    if (!rule) {
        return null
    }

    return prisma.reminderRule.create({
        data: {
            user_id: userId,
            channel: 'email',
            days_threshold: rule.daysThreshold,
            mileage_threshold: rule.mileageThreshold
        }
    })
}

async function replaceVehicleRule(
    userId: string,
    vehicleId: number,
    rule: { daysThreshold: number | null; mileageThreshold: number | null } | null
) {
    await prisma.reminderRule.deleteMany({
        where: {
            user_id: userId,
            vehicle_id: vehicleId,
            channel: 'email'
        }
    })

    if (!rule) {
        return null
    }

    return prisma.reminderRule.create({
        data: {
            user_id: userId,
            vehicle_id: vehicleId,
            channel: 'email',
            days_threshold: rule.daysThreshold,
            mileage_threshold: rule.mileageThreshold
        }
    })
}

async function findOwnedVehicle(userId: string, vehicleId: number) {
    return prisma.vehicle.findFirst({
        where: {
            id: vehicleId,
            user_id: userId
        }
    })
}

router.use(requireAuth)

router.get(
    '/preferences',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const [user, rule] = await Promise.all([
            prisma.user.findUnique({
                where: { id: authUser.id },
                select: {
                    email_verified_at: true,
                    reminder_email_enabled: true,
                    reminder_digest_enabled: true
                }
            }),
            prisma.reminderRule.findFirst({
                where: {
                    user_id: authUser.id,
                    vehicle_id: null,
                    channel: 'email'
                },
                orderBy: { updated_at: 'desc' }
            })
        ])

        if (!user) {
            res.status(404).json({ error: 'User not found' })
            return
        }

        res.json({
            emailVerificationRequired: user.email_verified_at == null,
            reminderEmailEnabled: user.reminder_email_enabled,
            reminderDigestEnabled: user.reminder_digest_enabled,
            rule: serializeRule(rule)
        })
    })
)

router.put(
    '/preferences',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const body = (req.body ?? {}) as Record<string, unknown>

        try {
            const reminderEmailEnabled = body.reminderEmailEnabled == null ? true : Boolean(body.reminderEmailEnabled)
            const reminderDigestEnabled =
                body.reminderDigestEnabled == null ? true : Boolean(body.reminderDigestEnabled)
            const rule = normalizeRule(body.rule)

            const user = await prisma.user.update({
                where: { id: authUser.id },
                data: {
                    reminder_email_enabled: reminderEmailEnabled,
                    reminder_digest_enabled: reminderDigestEnabled
                },
                select: {
                    reminder_email_enabled: true,
                    reminder_digest_enabled: true
                }
            })
            const createdRule = await replaceWorkspaceRule(authUser.id, rule)

            remindersLogger.info('reminders.preferences_updated', {
                requestId: req.requestId,
                userId: authUser.id,
                reminderEmailEnabled,
                reminderDigestEnabled,
                hasRule: Boolean(createdRule)
            })

            res.json({
                emailVerificationRequired: authUser.emailVerifiedAt == null,
                reminderEmailEnabled: user.reminder_email_enabled,
                reminderDigestEnabled: user.reminder_digest_enabled,
                rule: serializeRule(createdRule)
            })
        } catch (error) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid reminder preferences' })
        }
    })
)

router.get(
    '/vehicles/:vehicleId',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const vehicleId = Number(req.params.vehicleId)
        const vehicle = await findOwnedVehicle(authUser.id, vehicleId)

        if (!vehicle) {
            res.status(404).json({ error: 'Vehicle not found' })
            return
        }

        const rule = await prisma.reminderRule.findFirst({
            where: {
                user_id: authUser.id,
                vehicle_id: vehicleId,
                channel: 'email'
            },
            orderBy: { updated_at: 'desc' }
        })

        res.json({
            vehicleId,
            mode: vehicle.reminder_mode,
            rule: serializeRule(rule)
        })
    })
)

router.put(
    '/vehicles/:vehicleId',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const vehicleId = Number(req.params.vehicleId)
        const vehicle = await findOwnedVehicle(authUser.id, vehicleId)

        if (!vehicle) {
            res.status(404).json({ error: 'Vehicle not found' })
            return
        }

        try {
            const body = (req.body ?? {}) as Record<string, unknown>
            const mode = body.mode

            if (!isReminderPreferenceMode(mode)) {
                res.status(400).json({ error: 'Choose a valid reminder setting.' })
                return
            }

            const normalizedMode = mode as ReminderPreferenceMode
            const rule = normalizedMode === 'custom' ? normalizeRule(body.rule) : null

            if (normalizedMode === 'custom' && !rule) {
                res.status(400).json({ error: 'A custom vehicle rule requires at least one threshold' })
                return
            }

            const updatedVehicle = await prisma.vehicle.update({
                where: { id: vehicleId },
                data: {
                    reminder_mode: normalizedMode
                },
                select: {
                    id: true,
                    reminder_mode: true
                }
            })
            const updatedRule = await replaceVehicleRule(authUser.id, vehicleId, rule)

            remindersLogger.info('reminders.vehicle_preferences_updated', {
                requestId: req.requestId,
                userId: authUser.id,
                vehicleId,
                mode: normalizedMode,
                hasRule: Boolean(updatedRule)
            })

            res.json({
                vehicleId: updatedVehicle.id,
                mode: updatedVehicle.reminder_mode,
                rule: serializeRule(updatedRule)
            })
        } catch (error) {
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Invalid vehicle reminder preferences'
            })
        }
    })
)

export default router

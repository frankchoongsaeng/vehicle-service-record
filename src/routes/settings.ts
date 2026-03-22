import { Router, Request, Response } from 'express'

import { authUserSelect, serializeAuthUser } from '../auth/authUser.js'
import { prisma } from '../db.js'
import { createLogger } from '../logging/logger.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { isPreferredCurrencyCode } from '../types/userSettings.js'

const router = Router()
const settingsLogger = createLogger({ component: 'settings-routes' })

type SettingsUpdatePayload = {
    profileImageUrl?: unknown
    firstName?: unknown
    lastName?: unknown
    country?: unknown
    preferredCurrency?: unknown
}

function normalizeOptionalText(value: unknown, field: string, maxLength: number): string | null {
    if (value == null || value === '') {
        return null
    }

    if (typeof value !== 'string') {
        throw new Error(`${field} must be a string`)
    }

    const normalized = value.trim()

    if (!normalized) {
        return null
    }

    if (normalized.length > maxLength) {
        throw new Error(`${field} must be ${maxLength} characters or fewer`)
    }

    return normalized
}

function normalizeProfileImageUrl(value: unknown): string | null {
    const normalized = normalizeOptionalText(value, 'profileImageUrl', 2048)

    if (!normalized) {
        return null
    }

    let parsedUrl: URL

    try {
        parsedUrl = new URL(normalized)
    } catch {
        throw new Error('profileImageUrl must be a valid URL')
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new Error('profileImageUrl must use http or https')
    }

    return normalized
}

router.use(requireAuth)

router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const user = await prisma.user.findUnique({
            where: { id: authUser.id },
            select: authUserSelect
        })

        if (!user) {
            res.status(404).json({ error: 'User not found' })
            return
        }

        settingsLogger.debug('settings.loaded', {
            requestId: req.requestId,
            userId: authUser.id
        })

        res.json({ user: serializeAuthUser(user) })
    })
)

router.put(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const body = (req.body ?? {}) as SettingsUpdatePayload

        try {
            const firstName = normalizeOptionalText(body.firstName, 'firstName', 80)
            const lastName = normalizeOptionalText(body.lastName, 'lastName', 80)
            const country = normalizeOptionalText(body.country, 'country', 120)
            const profileImageUrl = normalizeProfileImageUrl(body.profileImageUrl)

            let preferredCurrency: string | undefined
            if (body.preferredCurrency != null) {
                if (typeof body.preferredCurrency !== 'string' || !isPreferredCurrencyCode(body.preferredCurrency)) {
                    res.status(400).json({ error: 'preferredCurrency must be one of the supported currency codes' })
                    return
                }

                preferredCurrency = body.preferredCurrency
            }

            const user = await prisma.user.update({
                where: { id: authUser.id },
                data: {
                    ...(body.firstName !== undefined ? { first_name: firstName } : {}),
                    ...(body.lastName !== undefined ? { last_name: lastName } : {}),
                    ...(body.country !== undefined ? { country } : {}),
                    ...(body.profileImageUrl !== undefined ? { profile_image_url: profileImageUrl } : {}),
                    ...(preferredCurrency !== undefined ? { preferred_currency: preferredCurrency } : {})
                },
                select: authUserSelect
            })

            settingsLogger.info('settings.updated', {
                requestId: req.requestId,
                userId: authUser.id,
                updatedFields: Object.keys(body)
            })

            res.json({ user: serializeAuthUser(user) })
        } catch (error) {
            settingsLogger.warn('settings.validation_failed', {
                requestId: req.requestId,
                userId: authUser.id,
                error: error instanceof Error ? error.message : 'Unknown validation error'
            })

            res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid settings payload' })
        }
    })
)

export default router

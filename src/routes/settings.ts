import { randomUUID } from 'node:crypto'
import { raw, Router, Request, Response } from 'express'

import { authUserSelect, serializeAuthUser } from '../auth/authUser.js'
import { prisma } from '../db.js'
import { createLogger } from '../logging/logger.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { uploadBufferImage } from '../services/imageUpload.js'
import {
    isHistorySortOrder,
    isPreferredCurrencyCode,
    isProfileImageMimeType,
    PROFILE_IMAGE_MAX_BYTES,
    PROFILE_IMAGE_MIME_TYPES
} from '../types/userSettings.js'

const router = Router()
const settingsLogger = createLogger({ component: 'settings-routes' })

type SettingsUpdatePayload = {
    profileImageUrl?: unknown
    firstName?: unknown
    lastName?: unknown
    country?: unknown
    preferredCurrency?: unknown
    historySortOrder?: unknown
}

function normalizeOptionalText(value: unknown, field: string, maxLength: number): string | null {
    if (value == null || value === '') {
        return null
    }

    const fieldLabel =
        field === 'firstName'
            ? 'First name'
            : field === 'lastName'
            ? 'Last name'
            : field === 'country'
            ? 'Country'
            : field === 'profileImageUrl'
            ? 'Profile image link'
            : 'This field'

    if (typeof value !== 'string') {
        throw new Error(`${fieldLabel} must be text.`)
    }

    const normalized = value.trim()

    if (!normalized) {
        return null
    }

    if (normalized.length > maxLength) {
        throw new Error(`${fieldLabel} must be ${maxLength} characters or fewer.`)
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
        throw new Error('Profile image link must be a valid web address.')
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new Error('Profile image link must start with http:// or https://.')
    }

    return normalized
}

function isStorageConfigurationError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : ''

    return message.includes('BUNNY_STORAGE_') || message.includes('BUNNY_PUBLIC_BASE_URL')
}

router.use(requireAuth)

router.post(
    '/profile-image',
    raw({ type: [...PROFILE_IMAGE_MIME_TYPES], limit: PROFILE_IMAGE_MAX_BYTES }),
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const contentTypeHeader = req.headers['content-type']
        const contentType = typeof contentTypeHeader === 'string' ? contentTypeHeader.split(';', 1)[0].trim() : ''

        if (!contentType || !isProfileImageMimeType(contentType)) {
            res.status(415).json({ error: 'Profile image must be a JPG, PNG, WebP, or GIF file.' })
            return
        }

        const body = req.body

        if (!Buffer.isBuffer(body) || body.byteLength === 0) {
            res.status(400).json({ error: 'Profile image upload is empty.' })
            return
        }

        try {
            const version = randomUUID()
            const storageKey = `profile-images/${authUser.id}/avatar`
            const uploadedImageUrl = await uploadBufferImage({
                storageKey,
                contentType,
                data: body
            })
            const profileImageUrl = `${uploadedImageUrl}?v=${version}`

            const user = await prisma.user.update({
                where: { id: authUser.id },
                data: {
                    profile_image_url: profileImageUrl
                },
                select: authUserSelect
            })

            settingsLogger.info('settings.profile_image_uploaded', {
                requestId: req.requestId,
                userId: authUser.id,
                contentType,
                size: body.byteLength
            })

            res.status(201).json({ user: serializeAuthUser(user) })
        } catch (error) {
            settingsLogger.error('settings.profile_image_upload_failed', {
                requestId: req.requestId,
                userId: authUser.id,
                contentType,
                error
            })

            if (isStorageConfigurationError(error)) {
                res.status(503).json({ error: 'Profile image uploads are not available right now.' })
                return
            }

            res.status(502).json({ error: 'Unable to upload the profile image right now.' })
        }
    })
)

router.delete(
    '/profile-image',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const user = await prisma.user.update({
            where: { id: authUser.id },
            data: {
                profile_image_url: null
            },
            select: authUserSelect
        })

        settingsLogger.info('settings.profile_image_removed', {
            requestId: req.requestId,
            userId: authUser.id
        })

        res.json({ user: serializeAuthUser(user) })
    })
)

router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const user = await prisma.user.findUnique({
            where: { id: authUser.id },
            select: authUserSelect
        })

        if (!user) {
            res.status(404).json({ error: 'We could not find your account.' })
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
                    res.status(400).json({ error: 'Choose a supported currency.' })
                    return
                }

                preferredCurrency = body.preferredCurrency
            }

            let historySortOrder: string | undefined
            if (body.historySortOrder != null) {
                if (!isHistorySortOrder(body.historySortOrder)) {
                    res.status(400).json({ error: 'Choose either newest first or oldest first for service history.' })
                    return
                }

                historySortOrder = body.historySortOrder
            }

            const user = await prisma.user.update({
                where: { id: authUser.id },
                data: {
                    ...(body.firstName !== undefined ? { first_name: firstName } : {}),
                    ...(body.lastName !== undefined ? { last_name: lastName } : {}),
                    ...(body.country !== undefined ? { country } : {}),
                    ...(body.profileImageUrl !== undefined ? { profile_image_url: profileImageUrl } : {}),
                    ...(preferredCurrency !== undefined ? { preferred_currency: preferredCurrency } : {}),
                    ...(historySortOrder !== undefined ? { history_sort_order: historySortOrder } : {})
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

            res.status(400).json({
                error: error instanceof Error ? error.message : 'We could not save those settings.'
            })
        }
    })
)

router.post(
    '/onboarding/complete',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const user = await prisma.user.update({
            where: { id: authUser.id },
            data: {
                onboarding_completed_at: new Date()
            },
            select: authUserSelect
        })

        settingsLogger.info('settings.onboarding_completed', {
            requestId: req.requestId,
            userId: authUser.id
        })

        res.json({ user: serializeAuthUser(user) })
    })
)

export default router

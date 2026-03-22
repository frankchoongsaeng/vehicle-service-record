import { Router, Request, Response } from 'express'

import { prisma } from '../db.js'
import { createLogger } from '../logging/logger.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const workshopsLogger = createLogger({ component: 'workshop-routes' })

type WorkshopPayload = {
    name: string
    address?: string
    phone?: string
}

function normalizeOptionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined
    }

    const normalized = value.trim()
    return normalized.length > 0 ? normalized : undefined
}

function normalizeWorkshopPayload(body: unknown): { data?: WorkshopPayload; error?: string } {
    const raw = (body ?? {}) as Record<string, unknown>
    const name = normalizeOptionalString(raw.name)
    const address = normalizeOptionalString(raw.address)
    const phone = normalizeOptionalString(raw.phone)

    if (!name) {
        return { error: 'name is required' }
    }

    return {
        data: {
            name,
            address,
            phone
        }
    }
}

function serializeWorkshop(workshop: {
    id: number
    name: string
    address: string | null
    phone: string | null
    created_at: Date
    updated_at: Date
}) {
    return {
        id: workshop.id,
        name: workshop.name,
        address: workshop.address,
        phone: workshop.phone,
        created_at: workshop.created_at,
        updated_at: workshop.updated_at
    }
}

router.use(requireAuth)

router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!

        const workshops = await prisma.workshop.findMany({
            where: {
                user_id: authUser.id
            },
            orderBy: [{ name: 'asc' }, { id: 'desc' }]
        })

        workshopsLogger.debug('workshops.listed', {
            requestId: req.requestId,
            userId: authUser.id,
            count: workshops.length
        })

        res.json(workshops.map(serializeWorkshop))
    })
)

router.post(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const { data, error } = normalizeWorkshopPayload(req.body)

        if (!data) {
            workshopsLogger.warn('workshops.create_invalid_payload', {
                requestId: req.requestId,
                userId: authUser.id,
                error,
                bodyKeys: Object.keys((req.body ?? {}) as Record<string, unknown>)
            })
            res.status(400).json({ error })
            return
        }

        const workshop = await prisma.workshop.create({
            data: {
                user_id: authUser.id,
                name: data.name,
                address: data.address ?? null,
                phone: data.phone ?? null
            }
        })

        workshopsLogger.info('workshops.created', {
            requestId: req.requestId,
            userId: authUser.id,
            workshopId: workshop.id,
            name: workshop.name
        })

        res.status(201).json(serializeWorkshop(workshop))
    })
)

router.put(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const workshopId = Number(req.params.id)
        const { data, error } = normalizeWorkshopPayload(req.body)

        if (!data) {
            workshopsLogger.warn('workshops.update_invalid_payload', {
                requestId: req.requestId,
                userId: authUser.id,
                workshopId,
                error,
                bodyKeys: Object.keys((req.body ?? {}) as Record<string, unknown>)
            })
            res.status(400).json({ error })
            return
        }

        const existingWorkshop = await prisma.workshop.findFirst({
            where: {
                id: workshopId,
                user_id: authUser.id
            }
        })

        if (!existingWorkshop) {
            workshopsLogger.warn('workshops.update_not_found', {
                requestId: req.requestId,
                userId: authUser.id,
                workshopId
            })
            res.status(404).json({ error: 'Workshop not found' })
            return
        }

        const workshop = await prisma.workshop.update({
            where: { id: workshopId },
            data: {
                name: data.name,
                address: data.address ?? null,
                phone: data.phone ?? null
            }
        })

        workshopsLogger.info('workshops.updated', {
            requestId: req.requestId,
            userId: authUser.id,
            workshopId,
            name: workshop.name
        })

        res.json(serializeWorkshop(workshop))
    })
)

router.delete(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const authUser = req.authUser!
        const workshopId = Number(req.params.id)

        const existingWorkshop = await prisma.workshop.findFirst({
            where: {
                id: workshopId,
                user_id: authUser.id
            }
        })

        if (!existingWorkshop) {
            workshopsLogger.warn('workshops.delete_not_found', {
                requestId: req.requestId,
                userId: authUser.id,
                workshopId
            })
            res.status(404).json({ error: 'Workshop not found' })
            return
        }

        await prisma.workshop.delete({ where: { id: workshopId } })

        workshopsLogger.info('workshops.deleted', {
            requestId: req.requestId,
            userId: authUser.id,
            workshopId
        })

        res.status(204).send()
    })
)

export default router

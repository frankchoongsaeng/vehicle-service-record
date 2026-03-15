import { Router, Request, Response } from 'express'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'

const router = Router({ mergeParams: true })

router.use(requireAuth)

// GET /api/vehicles/:vehicleId/records
router.get('/', async (req: Request, res: Response) => {
    const authUser = req.authUser!
    const vehicleId = Number(req.params.vehicleId)
    const vehicle = await prisma.vehicle.findFirst({
        where: {
            id: vehicleId,
            user_id: authUser.id
        }
    })
    if (!vehicle) {
        res.status(404).json({ error: 'Vehicle not found' })
        return
    }

    const records = await prisma.serviceRecord.findMany({
        where: {
            vehicle_id: vehicleId,
            user_id: authUser.id
        },
        orderBy: [{ date: 'desc' }, { id: 'desc' }]
    })
    res.json(records)
})

// GET /api/vehicles/:vehicleId/records/:id
router.get('/:id', async (req: Request, res: Response) => {
    const authUser = req.authUser!
    const recordId = Number(req.params.id)
    const vehicleId = Number(req.params.vehicleId)
    const record = await prisma.serviceRecord.findFirst({
        where: {
            id: recordId,
            vehicle_id: vehicleId,
            user_id: authUser.id
        }
    })
    if (!record) {
        res.status(404).json({ error: 'Service record not found' })
        return
    }
    res.json(record)
})

// POST /api/vehicles/:vehicleId/records
router.post('/', async (req: Request, res: Response) => {
    const authUser = req.authUser!
    const { service_type, description, date, mileage, cost, notes } = req.body as {
        service_type: string
        description: string
        date: string
        mileage?: number
        cost?: number
        notes?: string
    }

    if (!service_type || !description || !date) {
        res.status(400).json({ error: 'service_type, description, and date are required' })
        return
    }

    const vehicleId = Number(req.params.vehicleId)
    const vehicle = await prisma.vehicle.findFirst({
        where: {
            id: vehicleId,
            user_id: authUser.id
        }
    })
    if (!vehicle) {
        res.status(404).json({ error: 'Vehicle not found' })
        return
    }

    const created = await prisma.serviceRecord.create({
        data: {
            user_id: authUser.id,
            vehicle_id: vehicleId,
            service_type,
            description,
            date,
            mileage: mileage ?? null,
            cost: cost ?? null,
            notes: notes || null
        }
    })
    res.status(201).json(created)
})

// PUT /api/vehicles/:vehicleId/records/:id
router.put('/:id', async (req: Request, res: Response) => {
    const authUser = req.authUser!
    const { service_type, description, date, mileage, cost, notes } = req.body as {
        service_type: string
        description: string
        date: string
        mileage?: number
        cost?: number
        notes?: string
    }

    if (!service_type || !description || !date) {
        res.status(400).json({ error: 'service_type, description, and date are required' })
        return
    }

    const recordId = Number(req.params.id)
    const vehicleId = Number(req.params.vehicleId)
    const existing = await prisma.serviceRecord.findFirst({
        where: {
            id: recordId,
            vehicle_id: vehicleId,
            user_id: authUser.id
        }
    })
    if (!existing) {
        res.status(404).json({ error: 'Service record not found' })
        return
    }

    const updated = await prisma.serviceRecord.update({
        where: { id: recordId },
        data: {
            service_type,
            description,
            date,
            mileage: mileage ?? null,
            cost: cost ?? null,
            notes: notes || null
        }
    })
    res.json(updated)
})

// DELETE /api/vehicles/:vehicleId/records/:id
router.delete('/:id', async (req: Request, res: Response) => {
    const authUser = req.authUser!
    const recordId = Number(req.params.id)
    const vehicleId = Number(req.params.vehicleId)
    const existing = await prisma.serviceRecord.findFirst({
        where: {
            id: recordId,
            vehicle_id: vehicleId,
            user_id: authUser.id
        }
    })
    if (!existing) {
        res.status(404).json({ error: 'Service record not found' })
        return
    }

    await prisma.serviceRecord.delete({ where: { id: recordId } })
    res.status(204).send()
})

export default router

import { Router, Request, Response } from 'express'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.use(requireAuth)

// GET /api/vehicles
router.get('/', async (req: Request, res: Response) => {
    const authUser = req.authUser!
    const vehicles = await prisma.vehicle.findMany({
        where: { user_id: authUser.id },
        orderBy: [{ make: 'asc' }, { model: 'asc' }, { year: 'desc' }]
    })
    res.json(vehicles)
})

// GET /api/vehicles/:id
router.get('/:id', async (req: Request, res: Response) => {
    const authUser = req.authUser!
    const vehicleId = Number(req.params.id)
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
    res.json(vehicle)
})

// POST /api/vehicles
router.post('/', async (req: Request, res: Response) => {
    const authUser = req.authUser!
    const { make, model, year, vin, mileage, color, notes } = req.body as {
        make: string
        model: string
        year: number
        vin?: string
        mileage?: number
        color?: string
        notes?: string
    }

    if (!make || !model || !year) {
        res.status(400).json({ error: 'make, model, and year are required' })
        return
    }

    const created = await prisma.vehicle.create({
        data: {
            user_id: authUser.id,
            make,
            model,
            year: Number(year),
            vin: vin || null,
            mileage: mileage ?? null,
            color: color || null,
            notes: notes || null
        }
    })
    res.status(201).json(created)
})

// PUT /api/vehicles/:id
router.put('/:id', async (req: Request, res: Response) => {
    const authUser = req.authUser!
    const { make, model, year, vin, mileage, color, notes } = req.body as {
        make: string
        model: string
        year: number
        vin?: string
        mileage?: number
        color?: string
        notes?: string
    }

    if (!make || !model || !year) {
        res.status(400).json({ error: 'make, model, and year are required' })
        return
    }

    const vehicleId = Number(req.params.id)
    const existing = await prisma.vehicle.findFirst({
        where: {
            id: vehicleId,
            user_id: authUser.id
        }
    })
    if (!existing) {
        res.status(404).json({ error: 'Vehicle not found' })
        return
    }

    const updated = await prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
            make,
            model,
            year: Number(year),
            vin: vin || null,
            mileage: mileage ?? null,
            color: color || null,
            notes: notes || null
        }
    })
    res.json(updated)
})

// DELETE /api/vehicles/:id
router.delete('/:id', async (req: Request, res: Response) => {
    const authUser = req.authUser!
    const vehicleId = Number(req.params.id)
    const existing = await prisma.vehicle.findFirst({
        where: {
            id: vehicleId,
            user_id: authUser.id
        }
    })
    if (!existing) {
        res.status(404).json({ error: 'Vehicle not found' })
        return
    }

    await prisma.vehicle.delete({ where: { id: vehicleId } })
    res.status(204).send()
})

export default router

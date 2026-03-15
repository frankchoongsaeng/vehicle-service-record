import { Router, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../db'
import { hashPassword, verifyPassword } from '../openauth/password'
import { issueOpenAuthToken } from '../openauth/token'
import { clearSessionCookie, serializeSessionCookie } from '../auth/cookie'
import { requireAuth } from '../middleware/auth'

const router = Router()
const MIN_PASSWORD_LENGTH = 8
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeCredentials(body: unknown): { email: string; password: string } | null {
    const { email, password } = (body ?? {}) as {
        email?: string
        password?: string
    }

    const normalizedEmail = email?.trim().toLowerCase()
    if (!normalizedEmail || !password) {
        return null
    }

    return {
        email: normalizedEmail,
        password
    }
}

router.post('/login', async (req: Request, res: Response) => {
    const credentials = normalizeCredentials(req.body)
    if (!credentials) {
        res.status(400).json({ error: 'email and password are required' })
        return
    }

    const user = await prisma.user.findUnique({
        where: { email: credentials.email }
    })

    if (!user || !verifyPassword(credentials.password, user.password_hash)) {
        res.status(401).json({ error: 'Invalid email or password' })
        return
    }

    const token = issueOpenAuthToken({ id: user.id, email: user.email })
    res.setHeader('Set-Cookie', serializeSessionCookie(token))
    res.json({
        user: {
            id: user.id,
            email: user.email
        }
    })
})

router.post('/signup', async (req: Request, res: Response) => {
    const credentials = normalizeCredentials(req.body)
    if (!credentials) {
        res.status(400).json({ error: 'email and password are required' })
        return
    }

    if (!EMAIL_PATTERN.test(credentials.email)) {
        res.status(400).json({ error: 'Please provide a valid email address.' })
        return
    }

    if (credentials.password.length < MIN_PASSWORD_LENGTH) {
        res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` })
        return
    }

    const existingUser = await prisma.user.findUnique({
        where: { email: credentials.email },
        select: { id: true }
    })

    if (existingUser) {
        res.status(409).json({ error: 'An account with this email already exists.' })
        return
    }

    try {
        const user = await prisma.user.create({
            data: {
                email: credentials.email,
                password_hash: hashPassword(credentials.password)
            },
            select: {
                id: true,
                email: true
            }
        })

        const token = issueOpenAuthToken({ id: user.id, email: user.email })
        res.setHeader('Set-Cookie', serializeSessionCookie(token))
        res.status(201).json({ user })
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002' &&
            Array.isArray(error.meta?.target) &&
            error.meta.target.includes('email')
        ) {
            res.status(409).json({ error: 'An account with this email already exists.' })
            return
        }

        throw error
    }
})

router.post('/logout', (_req: Request, res: Response) => {
    res.setHeader('Set-Cookie', clearSessionCookie())
    res.status(204).send()
})

router.get('/session', requireAuth, (req: Request, res: Response) => {
    res.json({ user: req.authUser })
})

export default router

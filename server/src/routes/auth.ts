import { Router, Request, Response } from 'express'
import { prisma } from '../db'
import { verifyPassword } from '../openauth/password'
import { issueOpenAuthToken } from '../openauth/token'
import { clearSessionCookie, serializeSessionCookie } from '../auth/cookie'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body as {
        email?: string
        password?: string
    }

    const normalizedEmail = email?.trim().toLowerCase()
    if (!normalizedEmail || !password) {
        res.status(400).json({ error: 'email and password are required' })
        return
    }

    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail }
    })

    if (!user || !verifyPassword(password, user.password_hash)) {
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

router.post('/logout', (_req: Request, res: Response) => {
    res.setHeader('Set-Cookie', clearSessionCookie())
    res.status(204).send()
})

router.get('/session', requireAuth, (req: Request, res: Response) => {
    res.json({ user: req.authUser })
})

export default router

import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../server/src/openauth/password'

const prisma = new PrismaClient()

async function main() {
    const email = (process.env.DEV_USER_EMAIL ?? 'demo@example.com').trim().toLowerCase()
    const password = process.env.DEV_USER_PASSWORD ?? 'change-me123'

    await prisma.user.upsert({
        where: { email },
        update: {
            password_hash: hashPassword(password)
        },
        create: {
            email,
            password_hash: hashPassword(password)
        }
    })

    console.log(`Seeded development user: ${email}`)
    console.log(`Development password: ${password}`)
}

main()
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

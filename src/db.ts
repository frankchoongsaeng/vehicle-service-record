import { Prisma, PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

const prismaLogConfig: Prisma.LogLevel[] =
    process.env.LOG_PRISMA_QUERIES === 'true' ? ['warn', 'error', 'query'] : ['warn', 'error']

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: prismaLogConfig
    })

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
}

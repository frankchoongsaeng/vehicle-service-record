import 'dotenv/config'
import { Prisma, PrismaClient } from '@prisma/client'
import { setDatabaseUrlEnv } from './lib/databaseUrl.js'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

const databaseUrl = setDatabaseUrlEnv()

const prismaLogConfig: Prisma.LogLevel[] =
    process.env.LOG_PRISMA_QUERIES === 'true' ? ['warn', 'error', 'query'] : ['warn', 'error']

const prismaClientOptions: Prisma.PrismaClientOptions = {
    log: prismaLogConfig,
    datasourceUrl: databaseUrl
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaClientOptions)

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
}

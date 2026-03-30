import 'dotenv/config'
import { Prisma, PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

const defaultDatabaseUrl = 'mysql://duralog:duralog@127.0.0.1:3306/duralog'
const databaseUrl = process.env.DATABASE_URL?.trim() || defaultDatabaseUrl

if (!/^mysql:/i.test(databaseUrl)) {
    throw new Error('DATABASE_URL must use a mysql:// connection string.')
}

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

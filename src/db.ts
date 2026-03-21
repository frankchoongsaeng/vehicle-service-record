import 'dotenv/config'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { Prisma, PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

const databaseUrl = process.env.DATABASE_URL?.trim() || 'file:./prisma/dev.db'
const databaseAuthToken = process.env.DATABASE_AUTH_TOKEN?.trim() || process.env.LIBSQL_AUTH_TOKEN?.trim() || undefined
const usesLibsqlAdapter = /^(libsql|https?|wss?):/i.test(databaseUrl)

const prismaLogConfig: Prisma.LogLevel[] =
    process.env.LOG_PRISMA_QUERIES === 'true' ? ['warn', 'error', 'query'] : ['warn', 'error']

const prismaClientOptions: Prisma.PrismaClientOptions = {
    log: prismaLogConfig,
    ...(usesLibsqlAdapter
        ? {
              adapter: new PrismaLibSQL({
                  url: databaseUrl,
                  authToken: databaseAuthToken
              })
          }
        : {})
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaClientOptions)

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
}

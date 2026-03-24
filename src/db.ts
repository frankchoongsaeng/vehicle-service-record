import 'dotenv/config'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { Prisma, PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

type DatabaseProvider = 'sqlite' | 'mysql'

const defaultSqliteUrl = 'file:./prisma/dev.db'
const databaseUrl = process.env.DATABASE_URL?.trim() || defaultSqliteUrl
const databaseAuthToken = process.env.DATABASE_AUTH_TOKEN?.trim() || process.env.LIBSQL_AUTH_TOKEN?.trim() || undefined
const explicitDatabaseProvider = process.env.DATABASE_PROVIDER?.trim().toLowerCase()
const inferredDatabaseProvider: DatabaseProvider = /^mysql:/i.test(databaseUrl) ? 'mysql' : 'sqlite'

if (explicitDatabaseProvider && explicitDatabaseProvider !== 'sqlite' && explicitDatabaseProvider !== 'mysql') {
    throw new Error('DATABASE_PROVIDER must be either "sqlite" or "mysql" when set.')
}

const databaseProvider = (explicitDatabaseProvider as DatabaseProvider | undefined) ?? inferredDatabaseProvider

if (databaseProvider === 'mysql' && !/^mysql:/i.test(databaseUrl)) {
    throw new Error('MySQL requires DATABASE_URL to use a mysql:// connection string.')
}

if (databaseProvider === 'sqlite' && /^mysql:/i.test(databaseUrl)) {
    throw new Error('SQLite cannot use a mysql:// DATABASE_URL. Remove DATABASE_PROVIDER or set it to mysql.')
}

const usesLibsqlAdapter = databaseProvider === 'sqlite' && /^(libsql|https?|wss?):/i.test(databaseUrl)

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
        : {
              datasourceUrl: databaseUrl
          })
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaClientOptions)

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
}

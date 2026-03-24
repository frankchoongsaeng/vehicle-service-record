import 'dotenv/config'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { defineConfig } from 'prisma/config'

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
const migrationsPath = databaseProvider === 'mysql' ? 'prisma/mysql/migrations' : 'prisma/migrations'

const createMysqlSchema = () => {
    const schemaSource = readFileSync('prisma/schema.prisma', 'utf8')
    const mysqlSchema = schemaSource
        .replace('provider = "sqlite"', 'provider = "mysql"')
        .replace('url      = "file:./prisma/dev.db"', 'url      = "mysql://root:password@127.0.0.1:3306/duralog"')
    const schemaDirectory = join(process.cwd(), '.prisma', 'generated')
    const schemaFilePath = join(schemaDirectory, 'schema.mysql.prisma')

    mkdirSync(schemaDirectory, { recursive: true })
    writeFileSync(schemaFilePath, mysqlSchema)

    return schemaFilePath
}

const schemaPath = databaseProvider === 'mysql' ? createMysqlSchema() : 'prisma/schema.prisma'

if (databaseProvider === 'mysql') {
    process.env.PRISMA_GENERATE_SKIP_AUTOINSTALL ??= '1'
}

export default defineConfig({
    schema: schemaPath,
    experimental: {
        adapter: true
    },
    migrations: {
        path: migrationsPath,
        seed: 'tsx prisma/seed.ts'
    },
    ...(usesLibsqlAdapter
        ? {
              engine: 'js' as const,
              adapter: async () =>
                  new PrismaLibSQL({
                      url: databaseUrl,
                      authToken: databaseAuthToken
                  })
          }
        : {
              engine: 'classic' as const,
              datasource: {
                  url: databaseUrl
              }
          })
})

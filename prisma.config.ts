import 'dotenv/config'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { defineConfig } from 'prisma/config'

const databaseUrl = process.env.DATABASE_URL?.trim() || 'file:./prisma/dev.db'
const databaseAuthToken = process.env.DATABASE_AUTH_TOKEN?.trim() || process.env.LIBSQL_AUTH_TOKEN?.trim() || undefined
const usesLibsqlAdapter = /^(libsql|https?|wss?):/i.test(databaseUrl)

export default defineConfig({
    schema: 'prisma/schema.prisma',
    experimental: {
        adapter: true
    },
    migrations: {
        path: 'prisma/migrations',
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

import 'dotenv/config'
import { defineConfig } from 'prisma/config'

const defaultDatabaseUrl = 'mysql://duralog:duralog@127.0.0.1:3306/duralog'
const databaseUrl = process.env.DATABASE_URL?.trim() || defaultDatabaseUrl

if (!/^mysql:/i.test(databaseUrl)) {
    throw new Error('DATABASE_URL must use a mysql:// connection string.')
}

process.env.PRISMA_GENERATE_SKIP_AUTOINSTALL ??= '1'

export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
        seed: 'tsx prisma/seed.ts'
    },
    engine: 'classic',
    datasource: {
        url: databaseUrl
    }
})

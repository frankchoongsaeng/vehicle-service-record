import 'dotenv/config'
import { defineConfig } from 'prisma/config'
import { setDatabaseUrlEnv } from './src/lib/databaseUrl.js'

const databaseUrl = setDatabaseUrlEnv()

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

const DEFAULT_MYSQL_HOST = '127.0.0.1'
const DEFAULT_MYSQL_PORT = '3306'

function readRequiredEnv(name: 'MYSQL_DATABASE' | 'MYSQL_USER' | 'MYSQL_PASSWORD'): string {
    const value = process.env[name]?.trim()

    if (!value) {
        throw new Error(`${name} is required.`)
    }

    return value
}

function readMysqlPort(): string {
    const value = process.env.MYSQL_PORT?.trim() || DEFAULT_MYSQL_PORT

    if (!/^\d+$/.test(value)) {
        throw new Error('MYSQL_PORT must be a valid TCP port number.')
    }

    const port = Number(value)

    if (port < 1 || port > 65535) {
        throw new Error('MYSQL_PORT must be between 1 and 65535.')
    }

    return value
}

export function getDatabaseUrl(): string {
    const host = process.env.MYSQL_HOST?.trim() || DEFAULT_MYSQL_HOST
    const port = readMysqlPort()
    const database = readRequiredEnv('MYSQL_DATABASE')
    const user = readRequiredEnv('MYSQL_USER')
    const password = readRequiredEnv('MYSQL_PASSWORD')

    return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(
        database
    )}`
}

export function setDatabaseUrlEnv(): string {
    const databaseUrl = getDatabaseUrl()

    process.env.DATABASE_URL = databaseUrl

    return databaseUrl
}

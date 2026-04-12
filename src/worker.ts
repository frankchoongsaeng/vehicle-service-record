import './monitoring/server.js'
import 'dotenv/config'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { hostname } from 'node:os'
import { dirname } from 'node:path'
import { createLogger } from './logging/logger.js'
import { captureServerException } from './monitoring/server.js'
import { startReminderScheduler } from './services/reminders/scheduler.js'

const workerLogger = createLogger({
    service: 'vehicle-service-record-backend',
    component: 'reminder-worker'
})

const instanceId = process.env.HOSTNAME?.trim() || hostname()
const workerHealthcheckFilePath =
    process.env.REMINDER_WORKER_HEALTHCHECK_FILE?.trim() || '/tmp/reminder-worker-health.json'
const workerHeartbeatIntervalMs = 30 * 1000

let workerHeartbeatInterval: ReturnType<typeof setInterval> | null = null

async function writeWorkerHealthcheck(status: 'starting' | 'healthy' | 'stopping'): Promise<void> {
    await mkdir(dirname(workerHealthcheckFilePath), { recursive: true })
    await writeFile(
        workerHealthcheckFilePath,
        JSON.stringify({
            status,
            instanceId,
            updatedAt: new Date().toISOString(),
            pid: process.pid
        }),
        'utf8'
    )
}

function startWorkerHeartbeat(): void {
    void writeWorkerHealthcheck('healthy').catch(error => {
        captureServerException(error, {
            lifecycle: 'worker.healthcheck.write',
            instanceId,
            workerHealthcheckFilePath
        })
        workerLogger.error('worker.healthcheck_write_failed', { error, instanceId, workerHealthcheckFilePath })
    })

    workerHeartbeatInterval = setInterval(() => {
        void writeWorkerHealthcheck('healthy').catch(error => {
            captureServerException(error, {
                lifecycle: 'worker.healthcheck.write',
                instanceId,
                workerHealthcheckFilePath
            })
            workerLogger.error('worker.healthcheck_write_failed', { error, instanceId, workerHealthcheckFilePath })
        })
    }, workerHeartbeatIntervalMs)

    workerHeartbeatInterval.unref()
}

async function stopWorkerHeartbeat(): Promise<void> {
    if (workerHeartbeatInterval) {
        clearInterval(workerHeartbeatInterval)
        workerHeartbeatInterval = null
    }

    await writeWorkerHealthcheck('stopping')
    await rm(workerHealthcheckFilePath, { force: true })
}

await writeWorkerHealthcheck('starting')

process.on('unhandledRejection', reason => {
    captureServerException(reason, { lifecycle: 'worker.unhandledRejection', instanceId })
    workerLogger.error('worker.unhandled_rejection', { reason, instanceId })
})

process.on('uncaughtException', error => {
    captureServerException(error, { lifecycle: 'worker.uncaughtException', instanceId })
    workerLogger.error('worker.uncaught_exception', { error, instanceId })
    void shutdown('uncaughtException')
})

const scheduler = startReminderScheduler()

if (!scheduler.enabled) {
    workerLogger.error('worker.scheduler_disabled', { instanceId })
    process.exit(1)
}

workerLogger.info('worker.started', {
    instanceId,
    nodeEnv: process.env.NODE_ENV ?? 'development'
})

startWorkerHeartbeat()

let shutdownPromise: Promise<void> | null = null

function shutdown(signal: string): Promise<void> {
    if (shutdownPromise) {
        return shutdownPromise
    }

    workerLogger.info('worker.stopping', { signal, instanceId })

    shutdownPromise = scheduler
        .stop()
        .then(() => stopWorkerHeartbeat())
        .then(() => {
            workerLogger.info('worker.stopped', { signal, instanceId })
        })
        .catch(error => {
            captureServerException(error, { lifecycle: 'worker.shutdown', signal, instanceId })
            workerLogger.error('worker.shutdown_failed', { error, signal, instanceId })
            throw error
        })

    return shutdownPromise
}

process.on('SIGINT', () => {
    void shutdown('SIGINT').then(
        () => process.exit(0),
        () => process.exit(1)
    )
})

process.on('SIGTERM', () => {
    void shutdown('SIGTERM').then(
        () => process.exit(0),
        () => process.exit(1)
    )
})

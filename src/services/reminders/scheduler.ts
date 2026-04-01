import { createLogger } from '../../logging/logger.js'
import { captureServerException, withServerMonitoringSpan } from '../../monitoring/server.js'
import { evaluateReminderNotifications, processPendingReminderNotifications } from './engine.js'

const schedulerLogger = createLogger({ component: 'reminder-scheduler' })

export type ReminderSchedulerHandle = {
    enabled: boolean
    stop: () => Promise<void>
}

function getEvaluationHourUtc(): number {
    const configured = Number(process.env.REMINDER_EVALUATION_HOUR_UTC ?? '8')
    return Number.isInteger(configured) && configured >= 0 && configured <= 23 ? configured : 8
}

function getRetryIntervalMs(): number {
    const configured = Number(process.env.REMINDER_RETRY_INTERVAL_MINUTES ?? '15')
    const minutes = Number.isFinite(configured) && configured > 0 ? configured : 15
    return minutes * 60 * 1000
}

function getDelayUntilNextDailyRun(now: Date, targetHourUtc: number): number {
    const next = new Date(now)
    next.setUTCHours(targetHourUtc, 0, 0, 0)

    if (next.getTime() <= now.getTime()) {
        next.setUTCDate(next.getUTCDate() + 1)
    }

    return next.getTime() - now.getTime()
}

export function startReminderScheduler(): ReminderSchedulerHandle {
    if (process.env.REMINDER_SCHEDULER_ENABLED === 'false') {
        schedulerLogger.info('reminders.scheduler_disabled')
        return {
            enabled: false,
            stop: async () => undefined
        }
    }

    const evaluationHourUtc = getEvaluationHourUtc()
    const retryIntervalMs = getRetryIntervalMs()
    const runOnStartup = process.env.REMINDER_RUN_ON_STARTUP !== 'false'
    const inFlightJobs = new Set<Promise<void>>()
    let initialEvaluationTimeout: ReturnType<typeof setTimeout> | null = null
    let dailyEvaluationInterval: ReturnType<typeof setInterval> | null = null
    let retryInterval: ReturnType<typeof setInterval> | null = null
    let stopped = false

    const trackJob = (job: Promise<void>) => {
        inFlightJobs.add(job)
        void job.finally(() => {
            inFlightJobs.delete(job)
        })
    }

    const scheduleJob = (jobFactory: () => Promise<void>) => {
        if (stopped) {
            return
        }

        trackJob(jobFactory())
    }

    const runEvaluation = async () => {
        try {
            await withServerMonitoringSpan(
                'reminders.scheduler.evaluate',
                { component: 'reminder-scheduler' },
                async () => {
                    const now = new Date()
                    await evaluateReminderNotifications(now)
                    await processPendingReminderNotifications(now)
                }
            )
        } catch (error) {
            captureServerException(error, { task: 'reminders.scheduler.evaluate' })
            schedulerLogger.error('reminders.evaluation_job_failed', { error })
        }
    }

    const runRetryLoop = async () => {
        try {
            await withServerMonitoringSpan(
                'reminders.scheduler.retry',
                { component: 'reminder-scheduler' },
                async () => {
                    await processPendingReminderNotifications(new Date())
                }
            )
        } catch (error) {
            captureServerException(error, { task: 'reminders.scheduler.retry' })
            schedulerLogger.error('reminders.retry_job_failed', { error })
        }
    }

    if (runOnStartup) {
        scheduleJob(runEvaluation)
    }

    const initialDelay = getDelayUntilNextDailyRun(new Date(), evaluationHourUtc)
    initialEvaluationTimeout = setTimeout(() => {
        if (stopped) {
            return
        }

        scheduleJob(runEvaluation)
        dailyEvaluationInterval = setInterval(() => {
            scheduleJob(runEvaluation)
        }, 24 * 60 * 60 * 1000)
    }, initialDelay)

    retryInterval = setInterval(() => {
        scheduleJob(runRetryLoop)
    }, retryIntervalMs)

    schedulerLogger.info('reminders.scheduler_started', {
        evaluationHourUtc,
        retryIntervalMs,
        runOnStartup
    })

    return {
        enabled: true,
        stop: async () => {
            if (stopped) {
                return
            }

            stopped = true

            if (initialEvaluationTimeout) {
                clearTimeout(initialEvaluationTimeout)
            }

            if (dailyEvaluationInterval) {
                clearInterval(dailyEvaluationInterval)
            }

            if (retryInterval) {
                clearInterval(retryInterval)
            }

            schedulerLogger.info('reminders.scheduler_stopping', {
                inFlightJobs: inFlightJobs.size
            })

            await Promise.allSettled([...inFlightJobs])

            schedulerLogger.info('reminders.scheduler_stopped')
        }
    }
}

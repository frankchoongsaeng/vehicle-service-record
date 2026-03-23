import { createLogger } from '../../logging/logger.js'
import { evaluateReminderNotifications, processPendingReminderNotifications } from './engine.js'

const schedulerLogger = createLogger({ component: 'reminder-scheduler' })

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

export function startReminderScheduler() {
    if (process.env.REMINDER_SCHEDULER_ENABLED === 'false') {
        schedulerLogger.info('reminders.scheduler_disabled')
        return
    }

    const evaluationHourUtc = getEvaluationHourUtc()
    const retryIntervalMs = getRetryIntervalMs()
    const runOnStartup = process.env.REMINDER_RUN_ON_STARTUP !== 'false'

    const runEvaluation = async () => {
        try {
            const now = new Date()
            await evaluateReminderNotifications(now)
            await processPendingReminderNotifications(now)
        } catch (error) {
            schedulerLogger.error('reminders.evaluation_job_failed', { error })
        }
    }

    const runRetryLoop = async () => {
        try {
            await processPendingReminderNotifications(new Date())
        } catch (error) {
            schedulerLogger.error('reminders.retry_job_failed', { error })
        }
    }

    if (runOnStartup) {
        void runEvaluation()
    }

    const initialDelay = getDelayUntilNextDailyRun(new Date(), evaluationHourUtc)
    setTimeout(() => {
        void runEvaluation()
        setInterval(() => {
            void runEvaluation()
        }, 24 * 60 * 60 * 1000)
    }, initialDelay)

    setInterval(() => {
        void runRetryLoop()
    }, retryIntervalMs)

    schedulerLogger.info('reminders.scheduler_started', {
        evaluationHourUtc,
        retryIntervalMs,
        runOnStartup
    })
}

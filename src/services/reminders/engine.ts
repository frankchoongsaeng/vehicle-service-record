import { prisma } from '../../db.js'
import { hasFeatureAccess, resolveCurrentPlanFromUser } from '../../billing/service.js'
import { createLogger } from '../../logging/logger.js'
import { evaluateMaintenancePlan } from '../../lib/maintenanceEvaluation.js'
import { buildMaintenanceDigest, type DigestCandidate } from './digest.js'
import { createReminderEmailTransport } from './emailTransport.js'

const reminderEngineLogger = createLogger({ component: 'reminder-engine' })
const DEFAULT_MAX_RETRIES = 3

type ReminderNotificationRecord = {
    id: number
    user_id: string
    channel: string
    subject: string
    body_text: string
    body_html: string
    retry_count: number
}

function getMaxRetries(): number {
    const configured = Number(process.env.REMINDER_MAX_RETRIES ?? DEFAULT_MAX_RETRIES)
    return Number.isInteger(configured) && configured > 0 ? configured : DEFAULT_MAX_RETRIES
}

function getRetryDelayMs(attemptNumber: number): number {
    const baseMinutes = Number(process.env.REMINDER_RETRY_BACKOFF_MINUTES ?? '15')
    const safeBaseMinutes = Number.isFinite(baseMinutes) && baseMinutes > 0 ? baseMinutes : 15
    return safeBaseMinutes * 60 * 1000 * attemptNumber
}

function shouldTriggerRule(
    metrics: { daysRemaining: number | null; mileageRemaining: number | null },
    rule: { days_threshold: number | null; mileage_threshold: number | null },
    status: 'Overdue' | 'Upcoming' | 'Planned'
): boolean {
    if (status === 'Overdue') {
        return true
    }

    return Boolean(
        (rule.days_threshold != null &&
            metrics.daysRemaining != null &&
            metrics.daysRemaining <= rule.days_threshold) ||
            (rule.mileage_threshold != null &&
                metrics.mileageRemaining != null &&
                metrics.mileageRemaining <= rule.mileage_threshold)
    )
}

export async function evaluateReminderNotifications(now = new Date()) {
    const users = await prisma.user.findMany({
        where: {
            email_verified_at: {
                not: null
            },
            reminder_email_enabled: true,
            reminder_digest_enabled: true
        },
        include: {
            reminder_rules: {
                where: {
                    vehicle_id: null,
                    channel: 'email'
                },
                orderBy: { updated_at: 'desc' }
            },
            vehicles: {
                include: {
                    reminder_rules: {
                        where: { channel: 'email' },
                        orderBy: { updated_at: 'desc' }
                    },
                    maintenance_plans: true
                },
                orderBy: [{ make: 'asc' }, { model: 'asc' }, { year: 'desc' }]
            }
        }
    })

    let queuedCount = 0

    for (const user of users) {
        const currentPlan = resolveCurrentPlanFromUser(user)

        if (!hasFeatureAccess(currentPlan, 'reminderEmails')) {
            continue
        }

        const workspaceRule = user.reminder_rules[0] ?? null
        const digestCandidates: DigestCandidate[] = []

        for (const vehicle of user.vehicles) {
            if (vehicle.reminder_mode === 'disabled') {
                continue
            }

            const effectiveRule = vehicle.reminder_mode === 'custom' ? vehicle.reminder_rules[0] ?? null : workspaceRule

            if (!effectiveRule) {
                continue
            }

            for (const plan of vehicle.maintenance_plans) {
                const evaluation = evaluateMaintenancePlan(
                    {
                        id: plan.id,
                        title: plan.title,
                        intervalMonths: plan.interval_months,
                        intervalMileage: plan.interval_mileage,
                        lastCompletedDate: plan.last_completed_date,
                        lastCompletedMileage: plan.last_completed_mileage
                    },
                    {
                        mileage: vehicle.mileage,
                        distanceUnit: vehicle.distance_unit === 'km' ? 'km' : 'mi'
                    },
                    now
                )

                if (!shouldTriggerRule(evaluation.metrics, effectiveRule, evaluation.status)) {
                    continue
                }

                digestCandidates.push({
                    vehicle: {
                        id: vehicle.id,
                        make: vehicle.make,
                        model: vehicle.model,
                        year: vehicle.year,
                        mileage: vehicle.mileage,
                        distance_unit: vehicle.distance_unit === 'km' ? 'km' : 'mi'
                    },
                    plan: {
                        id: plan.id,
                        title: plan.title,
                        interval_months: plan.interval_months,
                        interval_mileage: plan.interval_mileage,
                        last_completed_date: plan.last_completed_date,
                        last_completed_mileage: plan.last_completed_mileage
                    }
                })
            }
        }

        if (digestCandidates.length === 0) {
            continue
        }

        const digest = buildMaintenanceDigest('email', digestCandidates, now)
        const dedupeKey = `maintenance-digest:${user.id}:${now.toISOString().slice(0, 10)}:email`

        const existingNotification = await prisma.notification.findUnique({
            where: { dedupe_key: dedupeKey }
        })

        if (existingNotification?.sent_at) {
            continue
        }

        if (existingNotification) {
            await prisma.notification.update({
                where: { id: existingNotification.id },
                data: {
                    subject: digest.subject,
                    body_text: digest.bodyText,
                    body_html: digest.bodyHtml,
                    item_count: digest.itemCount,
                    status: existingNotification.sent_at ? existingNotification.status : 'pending',
                    last_error: null,
                    next_retry_at: now
                }
            })
        } else {
            await prisma.notification.create({
                data: {
                    user_id: user.id,
                    channel: digest.channel,
                    subject: digest.subject,
                    body_text: digest.bodyText,
                    body_html: digest.bodyHtml,
                    item_count: digest.itemCount,
                    dedupe_key: dedupeKey,
                    scheduled_for: now,
                    next_retry_at: now
                }
            })
        }

        queuedCount += 1
    }

    reminderEngineLogger.info('reminders.evaluation_completed', {
        evaluatedAt: now.toISOString(),
        queuedCount,
        userCount: users.length
    })

    return { queuedCount, userCount: users.length }
}

export async function processPendingReminderNotifications(now = new Date()) {
    const maxRetries = getMaxRetries()
    const transport = createReminderEmailTransport()
    const notifications = await prisma.notification.findMany({
        where: {
            channel: 'email',
            sent_at: null,
            retry_count: { lt: maxRetries },
            status: { in: ['pending', 'failed'] },
            OR: [{ next_retry_at: null }, { next_retry_at: { lte: now } }]
        },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    email_verified_at: true
                }
            }
        },
        orderBy: [{ scheduled_for: 'asc' }, { id: 'asc' }]
    })

    let sentCount = 0
    let failedCount = 0

    for (const notification of notifications) {
        if (!notification.user.email_verified_at) {
            await prisma.notification.update({
                where: { id: notification.id },
                data: {
                    status: 'cancelled',
                    last_error: 'Email address is not verified.',
                    next_retry_at: null
                }
            })

            reminderEngineLogger.info('reminders.delivery_cancelled_unverified_email', {
                notificationId: notification.id,
                userId: notification.user_id
            })
            continue
        }

        try {
            await sendReminderNotification(
                {
                    id: notification.id,
                    user_id: notification.user_id,
                    channel: notification.channel,
                    subject: notification.subject,
                    body_text: notification.body_text,
                    body_html: notification.body_html,
                    retry_count: notification.retry_count
                },
                notification.user.email,
                transport,
                now
            )
            sentCount += 1
        } catch (error) {
            failedCount += 1
            reminderEngineLogger.warn('reminders.delivery_failed', {
                notificationId: notification.id,
                userId: notification.user_id,
                error: error instanceof Error ? error.message : 'Unknown delivery error'
            })
        }
    }

    return { sentCount, failedCount, queuedCount: notifications.length }
}

async function sendReminderNotification(
    notification: ReminderNotificationRecord,
    email: string,
    transport: ReturnType<typeof createReminderEmailTransport>,
    now: Date
) {
    const attemptNumber = notification.retry_count + 1
    const startedAt = new Date()
    const attempt = await prisma.deliveryAttempt.create({
        data: {
            notification_id: notification.id,
            channel: notification.channel,
            provider: transport.provider,
            status: 'pending',
            attempt_number: attemptNumber,
            started_at: startedAt
        }
    })

    try {
        const result = await transport.send({
            to: email,
            subject: notification.subject,
            text: notification.body_text,
            html: notification.body_html
        })

        await prisma.deliveryAttempt.update({
            where: { id: attempt.id },
            data: {
                status: 'sent',
                response: result.response,
                completed_at: new Date()
            }
        })

        await prisma.notification.update({
            where: { id: notification.id },
            data: {
                status: 'sent',
                retry_count: attemptNumber,
                last_error: null,
                sent_at: now,
                next_retry_at: null
            }
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown delivery error'
        const nextRetryAt = new Date(now.getTime() + getRetryDelayMs(attemptNumber))

        await prisma.deliveryAttempt.update({
            where: { id: attempt.id },
            data: {
                status: 'failed',
                error: message,
                completed_at: new Date()
            }
        })

        await prisma.notification.update({
            where: { id: notification.id },
            data: {
                status: 'failed',
                retry_count: attemptNumber,
                last_error: message,
                next_retry_at: nextRetryAt
            }
        })

        throw error
    }
}

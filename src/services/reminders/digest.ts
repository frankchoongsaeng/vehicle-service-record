import { evaluateMaintenancePlan } from '../../lib/maintenanceEvaluation.js'
import type { ReminderChannel } from '../../types/reminders.js'

type DigestVehicle = {
    id: number
    make: string
    model: string
    year: number
    mileage: number | null
    distance_unit: 'km' | 'mi'
}

type DigestPlan = {
    id: number
    title: string
    interval_months: number | null
    interval_mileage: number | null
    last_completed_date: string | null
    last_completed_mileage: number | null
}

export type DigestCandidate = {
    vehicle: DigestVehicle
    plan: DigestPlan
}

export type BuiltDigest = {
    channel: ReminderChannel
    subject: string
    bodyText: string
    bodyHtml: string
    itemCount: number
}

export function buildMaintenanceDigest(
    channel: ReminderChannel,
    candidates: DigestCandidate[],
    now: Date
): BuiltDigest {
    const grouped = new Map<number, { vehicle: DigestVehicle; rows: string[]; htmlRows: string[] }>()
    let overdueCount = 0

    for (const candidate of candidates) {
        const evaluation = evaluateMaintenancePlan(
            {
                id: candidate.plan.id,
                title: candidate.plan.title,
                intervalMonths: candidate.plan.interval_months,
                intervalMileage: candidate.plan.interval_mileage,
                lastCompletedDate: candidate.plan.last_completed_date,
                lastCompletedMileage: candidate.plan.last_completed_mileage
            },
            {
                mileage: candidate.vehicle.mileage,
                distanceUnit: candidate.vehicle.distance_unit
            },
            now
        )

        if (evaluation.status === 'Overdue') {
            overdueCount += 1
        }

        const group = grouped.get(candidate.vehicle.id) ?? {
            vehicle: candidate.vehicle,
            rows: [],
            htmlRows: []
        }

        group.rows.push(`- ${candidate.plan.title}: ${evaluation.dueLabel}`)
        group.htmlRows.push(
            `<li><strong>${escapeHtml(candidate.plan.title)}</strong>: ${escapeHtml(evaluation.dueLabel)}</li>`
        )
        grouped.set(candidate.vehicle.id, group)
    }

    const dateLabel = now.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    const subject =
        overdueCount > 0
            ? `Duralog reminder: ${overdueCount} overdue maintenance item${overdueCount === 1 ? '' : 's'}`
            : `Duralog reminder: maintenance due soon for ${dateLabel}`

    const sections = [...grouped.values()].map(group => {
        const vehicleName = `${group.vehicle.year} ${group.vehicle.make} ${group.vehicle.model}`
        return `${vehicleName}\n${group.rows.join('\n')}`
    })

    const htmlSections = [...grouped.values()].map(group => {
        const vehicleName = `${group.vehicle.year} ${group.vehicle.make} ${group.vehicle.model}`
        return `<section><h2>${escapeHtml(vehicleName)}</h2><ul>${group.htmlRows.join('')}</ul></section>`
    })

    return {
        channel,
        subject,
        bodyText: [
            `Your ${channel.toUpperCase()} maintenance digest for ${dateLabel}`,
            '',
            ...sections,
            '',
            'Review the due and overdue items in Duralog to log the completed service or update the maintenance plan baseline.'
        ].join('\n'),
        bodyHtml: [
            '<div>',
            `<p>Your maintenance digest for ${escapeHtml(dateLabel)}</p>`,
            ...htmlSections,
            '<p>Review the due and overdue items in Duralog to log the completed service or update the maintenance plan baseline.</p>',
            '</div>'
        ].join(''),
        itemCount: candidates.length
    }
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

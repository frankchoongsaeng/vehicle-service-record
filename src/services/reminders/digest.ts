import { evaluateMaintenancePlan } from '../../lib/maintenanceEvaluation.js'
import type { ReminderChannel } from '../../types/reminders.js'
import {
    buildBulletList,
    buildCalloutCard,
    buildParagraphBlock,
    escapeHtml,
    renderEmailLayout
} from '../emailLayout.js'

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
            `<li style="margin:0 0 10px; font-size:15px; line-height:1.6;"><strong>${escapeHtml(
                candidate.plan.title
            )}</strong>: ${escapeHtml(evaluation.dueLabel)}</li>`
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
        return [
            `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0 0; border-collapse:separate; border-spacing:0; background:#edf4fb; border:1px solid #d8e1ea; border-radius:18px;">`,
            '<tr>',
            '<td style="padding:18px 20px;">',
            `<p style="margin:0 0 12px; font-size:12px; line-height:1.4; letter-spacing:0.08em; text-transform:uppercase; font-weight:700; color:#66758a;">Vehicle</p>`,
            `<h2 style="margin:0 0 12px; font-size:22px; line-height:1.3; color:#253247;">${escapeHtml(
                vehicleName
            )}</h2>`,
            `<ul style="margin:0; padding:0 0 0 20px; color:#253247;">${group.htmlRows.join('')}</ul>`,
            '</td>',
            '</tr>',
            '</table>'
        ].join('')
    })

    const summaryLines = [
        overdueCount > 0
            ? `${overdueCount} maintenance item${overdueCount === 1 ? '' : 's'} currently need attention.`
            : 'Everything in this digest is coming due soon, with no overdue items yet.',
        `${candidates.length} reminder item${candidates.length === 1 ? '' : 's'} across ${grouped.size} vehicle${
            grouped.size === 1 ? '' : 's'
        }.`
    ]

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
        bodyHtml: renderEmailLayout({
            previewText: `Your Duralog maintenance digest for ${dateLabel}.`,
            categoryLabel: 'Maintenance',
            title: overdueCount > 0 ? 'Maintenance needs attention' : 'Maintenance due soon',
            intro: `Here is your ${channel.toLowerCase()} reminder digest for ${dateLabel}.`,
            bodyHtml:
                buildParagraphBlock([
                    'Review the vehicles below to see which service items are due or overdue.',
                    'Log completed work in Duralog to keep future reminder timing accurate.'
                ]) +
                buildCalloutCard('Summary', summaryLines) +
                (candidates.length > 0
                    ? buildBulletList(['Open Duralog and update the service record after work is complete.'])
                    : '') +
                htmlSections.join(''),
            footerNote:
                'Reminder emails reflect the maintenance rules configured in your Duralog workspace and vehicle settings.'
        }),
        itemCount: candidates.length
    }
}

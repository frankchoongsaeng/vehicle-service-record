import type { Prisma } from '@prisma/client'

export function normalizeOptionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined
    }

    const normalized = value.trim()
    return normalized.length > 0 ? normalized : undefined
}

function normalizeWorkshopLookupName(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export async function ensureWorkshopExists(
    transaction: Prisma.TransactionClient,
    userId: string,
    workshopName: string | null | undefined
): Promise<string | null> {
    const normalizedWorkshopName = normalizeOptionalString(workshopName)

    if (!normalizedWorkshopName) {
        return null
    }

    const existingWorkshops = await transaction.workshop.findMany({
        where: {
            user_id: userId
        },
        select: {
            id: true,
            name: true
        }
    })

    const matchedWorkshop = existingWorkshops.find(
        workshop => normalizeWorkshopLookupName(workshop.name) === normalizeWorkshopLookupName(normalizedWorkshopName)
    )

    if (matchedWorkshop) {
        return matchedWorkshop.name
    }

    const createdWorkshop = await transaction.workshop.create({
        data: {
            user_id: userId,
            name: normalizedWorkshopName
        },
        select: {
            name: true
        }
    })

    return createdWorkshop.name
}

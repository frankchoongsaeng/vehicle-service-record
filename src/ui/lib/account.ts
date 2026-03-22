import type { AuthUser } from '../types/index.js'

export function getUserDisplayName(user: Pick<AuthUser, 'firstName' | 'lastName' | 'email'>): string {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()

    return fullName || user.email
}

export function getUserInitials(user: Pick<AuthUser, 'firstName' | 'lastName' | 'email'>): string {
    const nameParts = [user.firstName, user.lastName].filter(Boolean)

    if (nameParts.length > 0) {
        return nameParts
            .slice(0, 2)
            .map(segment => segment[0]?.toUpperCase() ?? '')
            .join('')
            .slice(0, 2)
    }

    return user.email
        .split('@')[0]
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(segment => segment[0]?.toUpperCase() ?? '')
        .join('')
        .slice(0, 2)
}

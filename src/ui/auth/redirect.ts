export function getSafeRedirectTarget(value: string | null | undefined): string {
    if (!value || !value.startsWith('/') || value.startsWith('//')) {
        return '/garage'
    }

    if (value === '/login' || value.startsWith('/login?') || value === '/signup' || value.startsWith('/signup?')) {
        return '/garage'
    }

    return value
}

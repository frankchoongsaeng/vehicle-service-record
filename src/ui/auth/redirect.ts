export function getSafeRedirectTarget(value: string | null | undefined): string {
    if (!value || !value.startsWith('/') || value.startsWith('//')) {
        return '/'
    }

    if (value === '/login' || value.startsWith('/login?') || value === '/signup' || value.startsWith('/signup?')) {
        return '/'
    }

    return value
}

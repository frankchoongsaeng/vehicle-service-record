export function getSafeRedirectTarget(value: string | null | undefined): string {
    if (!value || !value.startsWith('/') || value.startsWith('//')) {
        return '/'
    }

    return value
}

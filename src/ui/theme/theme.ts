import { createContext, useContext } from 'react'

export type Theme = 'light' | 'dark'

export type ThemeContextValue = {
    theme: Theme
    setTheme: (theme: Theme) => void
    toggleTheme: () => void
}

export const THEME_STORAGE_KEY = 'duralog-theme'
export const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function resolveTheme(): Theme {
    if (typeof window === 'undefined') {
        return 'light'
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (storedTheme === 'light' || storedTheme === 'dark') {
        return storedTheme
    }

    return window.matchMedia(DARK_MEDIA_QUERY).matches ? 'dark' : 'light'
}

export function applyTheme(theme: Theme) {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
}

export function persistTheme(theme: Theme) {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
}

export const themeInitializationScript = `(() => {
    const themeStorageKey = '${THEME_STORAGE_KEY}'
    const darkMediaQuery = '${DARK_MEDIA_QUERY}'
    const root = document.documentElement

    try {
        const storedTheme = window.localStorage.getItem(themeStorageKey)
        const theme = storedTheme === 'light' || storedTheme === 'dark'
            ? storedTheme
            : window.matchMedia(darkMediaQuery).matches
                ? 'dark'
                : 'light'

        root.classList.toggle('dark', theme === 'dark')
        root.style.colorScheme = theme
    } catch {
        root.classList.remove('dark')
        root.style.colorScheme = 'light'
    }
})()`

export function useTheme() {
    const context = useContext(ThemeContext)

    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }

    return context
}

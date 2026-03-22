import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { ThemeContext, applyTheme, persistTheme, resolveTheme, type Theme, type ThemeContextValue } from './theme.js'

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>(resolveTheme)

    useEffect(() => {
        applyTheme(theme)
        persistTheme(theme)
    }, [theme])

    const value = useMemo<ThemeContextValue>(
        () => ({
            theme,
            setTheme,
            toggleTheme: () => setTheme(currentTheme => (currentTheme === 'dark' ? 'light' : 'dark'))
        }),
        [theme]
    )

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

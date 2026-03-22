import { Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react'
import type { LinksFunction } from '@remix-run/node'

import globalStyles from './index.css?url'
import { AuthProvider } from './auth/AuthProvider'
import { ThemeProvider } from './theme/ThemeProvider'
import { themeInitializationScript } from './theme/theme.js'

export const links: LinksFunction = () => [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    { rel: 'stylesheet', href: globalStyles }
]

export default function App() {
    return (
        <html lang='en' suppressHydrationWarning>
            <head>
                <meta charSet='utf-8' />
                <meta name='viewport' content='width=device-width, initial-scale=1' />
                <script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} />
                <Meta />
                <Links />
            </head>
            <body>
                <ThemeProvider>
                    <AuthProvider>
                        <Outlet />
                    </AuthProvider>
                </ThemeProvider>
                <ScrollRestoration />
                <Scripts />
                <LiveReload />
            </body>
        </html>
    )
}

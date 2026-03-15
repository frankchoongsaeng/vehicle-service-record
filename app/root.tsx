import { Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react'
import type { LinksFunction } from '@remix-run/node'

import globalStyles from '../src/index.css?url'
import appStyles from '../src/App.css?url'
import { AuthProvider } from '../src/auth/AuthProvider'

export const links: LinksFunction = () => [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    { rel: 'stylesheet', href: globalStyles },
    { rel: 'stylesheet', href: appStyles }
]

export default function App() {
    return (
        <html lang='en'>
            <head>
                <meta charSet='utf-8' />
                <meta name='viewport' content='width=device-width, initial-scale=1' />
                <Meta />
                <Links />
            </head>
            <body>
                <AuthProvider>
                    <Outlet />
                </AuthProvider>
                <ScrollRestoration />
                <Scripts />
                <LiveReload />
            </body>
        </html>
    )
}

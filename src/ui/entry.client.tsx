import { RemixBrowser } from '@remix-run/react'
import { startTransition, StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { initClientMonitoring } from './monitoring/client.js'

initClientMonitoring()

startTransition(() => {
    hydrateRoot(
        document,
        <StrictMode>
            <RemixBrowser />
        </StrictMode>
    )
})

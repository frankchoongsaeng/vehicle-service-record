import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation, useNavigationType } from '@remix-run/react'
import { trackClientRouteChange } from './client.js'

export function MonitoringProvider({ children }: { children: ReactNode }) {
    const location = useLocation()
    const navigationType = useNavigationType()
    const previousRouteRef = useRef<string | null>(null)

    useEffect(() => {
        const route = `${location.pathname}${location.search}${location.hash}`
        if (previousRouteRef.current === route) {
            return
        }

        trackClientRouteChange(location.pathname, location.search, location.hash, navigationType)
        previousRouteRef.current = route
    }, [location.hash, location.pathname, location.search, navigationType])

    return <>{children}</>
}

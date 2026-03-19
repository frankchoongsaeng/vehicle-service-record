import { NavLink, useLocation } from '@remix-run/react'
import { LayoutDashboard, LogOut, Plus, CarFront } from 'lucide-react'
import { useState } from 'react'

import { cn } from '../lib/utils.js'
import type { AuthUser } from '../types/index.js'
import { Button } from './ui/button.js'
import { Card } from './ui/card.js'
import Logo from './ui/logo.js'

type AuthenticatedShellProps = {
    currentUser: AuthUser
    onLogout: () => Promise<void>
    children: React.ReactNode
}

const navigationItems = [
    {
        label: 'Garage',
        to: '/',
        icon: CarFront,
        matches: (pathname: string) => pathname === '/' || pathname.startsWith('/garage')
    },
    {
        label: 'Dashboard',
        to: '/dashboard',
        icon: LayoutDashboard,
        matches: (pathname: string) => pathname === '/dashboard'
    }
] as const

export function AuthenticatedShell({ currentUser, onLogout, children }: AuthenticatedShellProps) {
    const [loggingOut, setLoggingOut] = useState(false)
    const location = useLocation()

    const handleLogout = async () => {
        try {
            setLoggingOut(true)
            await onLogout()
        } finally {
            setLoggingOut(false)
        }
    }

    return (
        <div className='min-h-screen bg-background'>
            <div className='border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80'>
                <div className='mx-auto flex w-full max-w-screen-2xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8'>
                    <div className='flex flex-wrap items-center justify-between gap-3'>
                        <NavLink to='/' className='flex items-center gap-3'>
                            <div className='flex h-11 w-11 items-center justify-center'>
                                <Logo className='h-7 w-7 text-foreground' />
                            </div>
                            <div>
                                <p className='text-lg font-semibold tracking-tight text-foreground'>Duralog</p>
                                <p className='text-sm text-muted-foreground'>
                                    Vehicle service records with a cleaner workflow.
                                </p>
                            </div>
                        </NavLink>

                        <div className='flex flex-wrap items-center gap-2 sm:gap-3'>
                            <Card className='rounded-full px-3 py-2 shadow-none'>
                                <p className='text-sm text-muted-foreground'>
                                    Signed in as{' '}
                                    <span className='font-medium text-foreground'>{currentUser.email}</span>
                                </p>
                            </Card>
                            <Button variant='outline' onClick={handleLogout} disabled={loggingOut}>
                                <LogOut className='h-4 w-4' />
                                {loggingOut ? 'Signing out…' : 'Sign out'}
                            </Button>
                        </div>
                    </div>

                    <nav className='flex flex-wrap items-center gap-2'>
                        {navigationItems.map(item => {
                            const Icon = item.icon

                            return (
                                <NavLink key={item.to} to={item.to} end={item.to === '/'}>
                                    {({ isActive }) => {
                                        const active = isActive || item.matches(location.pathname)

                                        return (
                                            <span
                                                className={cn(
                                                    'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors',
                                                    active
                                                        ? 'border-primary/30 bg-primary/10 text-foreground'
                                                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                                                )}
                                            >
                                                <Icon className='h-4 w-4' />
                                                {item.label}
                                            </span>
                                        )
                                    }}
                                </NavLink>
                            )
                        })}

                        <NavLink to='/?view=vehicle-form'>
                            <span className='inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground'>
                                <Plus className='h-4 w-4' />
                                Add Vehicle
                            </span>
                        </NavLink>
                    </nav>
                </div>
            </div>

            <div className='relative'>
                <div className='pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b from-secondary/35 via-background to-transparent' />
                <div className='relative mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8'>{children}</div>
            </div>
        </div>
    )
}

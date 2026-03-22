import { NavLink, useLocation, useSearchParams } from '@remix-run/react'
import { CarFront, LogOut, Menu, Plus, Settings, UserCircle2, X } from 'lucide-react'
import { useState } from 'react'

import { cn } from '../lib/utils.js'
import type { AuthUser } from '../types/index.js'
import { Avatar, AvatarFallback } from './ui/avatar.js'
import { Button } from './ui/button.js'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from './ui/dropdown-menu.js'
import Logo from './ui/logo.js'

type AuthenticatedShellProps = {
    currentUser: AuthUser
    onLogout: () => Promise<void>
    selectedVehicleLabel?: string
    selectedVehicleTo?: string
    children: React.ReactNode
}

const navigationItems = [
    {
        label: 'Garage',
        to: '/garage',
        icon: CarFront,
        matches: (pathname: string) => pathname === '/garage' || pathname.startsWith('/garage/')
    }
] as const

export function AuthenticatedShell({
    currentUser,
    onLogout,
    selectedVehicleLabel,
    selectedVehicleTo,
    children
}: AuthenticatedShellProps) {
    const [loggingOut, setLoggingOut] = useState(false)
    const location = useLocation()
    const [searchParams, setSearchParams] = useSearchParams()
    const isMenuOpen = searchParams.get('navMenu') === 'open'
    const profileInitials = currentUser.email
        .split('@')[0]
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(segment => segment[0]?.toUpperCase() ?? '')
        .join('')
        .slice(0, 2)

    const toggleMenu = () => {
        const nextParams = new URLSearchParams(searchParams)

        if (isMenuOpen) {
            nextParams.delete('navMenu')
        } else {
            nextParams.set('navMenu', 'open')
        }

        setSearchParams(nextParams, { replace: true })
    }

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
                    <div className='grid grid-cols-[auto_1fr_auto] items-center gap-3'>
                        <div className='flex items-center gap-2 justify-self-start'>
                            <Button
                                variant='ghost'
                                size='icon'
                                onClick={toggleMenu}
                                aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                                aria-expanded={isMenuOpen}
                                aria-controls='authenticated-shell-navigation'
                            >
                                {isMenuOpen ? <X className='h-5 w-5' /> : <Menu className='h-5 w-5' />}
                            </Button>

                            <Button asChild variant='outline' className='hidden sm:inline-flex'>
                                <NavLink to={selectedVehicleTo ?? '/garage/add-new'}>
                                    {selectedVehicleLabel ? (
                                        <CarFront className='h-4 w-4' />
                                    ) : (
                                        <Plus className='h-4 w-4' />
                                    )}
                                    {selectedVehicleLabel ?? 'Add Vehicle'}
                                </NavLink>
                            </Button>
                        </div>

                        <NavLink to='/garage' className='mx-auto flex items-center gap-3'>
                            <div className='flex h-11 w-11 items-center justify-center'>
                                <Logo className='h-7 w-7 text-foreground' />
                            </div>
                            <div>
                                <p className='text-lg font-semibold tracking-tight text-foreground'>Duralog</p>
                                <p className='hidden text-sm text-muted-foreground sm:block'>
                                    Vehicle service records with a cleaner workflow.
                                </p>
                            </div>
                        </NavLink>

                        <div className='flex items-center justify-self-end'>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Avatar
                                        aria-label='Open profile menu'
                                        className='size-11 cursor-pointer border border-border transition-colors hover:border-ring/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                                    >
                                        <AvatarFallback className='bg-muted text-sm font-semibold text-foreground'>
                                            {profileInitials || (
                                                <UserCircle2 className='size-6 text-muted-foreground' />
                                            )}
                                        </AvatarFallback>
                                    </Avatar>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='end' sideOffset={8}>
                                    <DropdownMenuLabel className='flex flex-col gap-0.5'>
                                        <span className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                                            Signed in as
                                        </span>
                                        <span className='truncate text-sm font-semibold text-foreground'>
                                            {currentUser.email}
                                        </span>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuItem>
                                            <Settings />
                                            Settings
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleLogout} disabled={loggingOut}>
                                            <LogOut />
                                            {loggingOut ? 'Signing out…' : 'Sign out'}
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    <nav
                        id='authenticated-shell-navigation'
                        className={cn(
                            'gap-2',
                            isMenuOpen
                                ? 'flex flex-col items-stretch sm:flex-row sm:flex-wrap sm:items-center'
                                : 'hidden'
                        )}
                    >
                        {navigationItems.map(item => {
                            const Icon = item.icon

                            return (
                                <NavLink key={item.to} to={item.to} end={item.to === '/garage'}>
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

import { NavLink } from '@remix-run/react'
import { BriefcaseBusiness, CarFront, LogOut, Menu, Moon, Plus, Settings, Sun, UserCircle2 } from 'lucide-react'
import { useState } from 'react'

import type { AuthUser } from '../types/index.js'
import { getUserDisplayName, getUserInitials } from '../lib/account.js'
import { useTheme } from '../theme/theme.js'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar.js'
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

export function AuthenticatedShell({
    currentUser,
    onLogout,
    selectedVehicleLabel,
    selectedVehicleTo,
    children
}: AuthenticatedShellProps) {
    const [loggingOut, setLoggingOut] = useState(false)
    const { theme, toggleTheme } = useTheme()
    const profileInitials = getUserInitials(currentUser)
    const displayName = getUserDisplayName(currentUser)

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
            <div className='sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80'>
                <div className='mx-auto flex w-full max-w-screen-2xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8'>
                    <div className='grid grid-cols-3 items-center gap-3'>
                        <div className='flex min-w-0 items-center justify-start gap-2'>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant='ghost' size='icon' aria-label='Open navigation menu'>
                                        <Menu className='h-5 w-5' />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='start' sideOffset={8}>
                                    <DropdownMenuLabel>Navigation</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuItem asChild>
                                            <NavLink to='/garage'>
                                                <CarFront />
                                                Manage Garage
                                            </NavLink>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <NavLink to='/workshops'>
                                                <BriefcaseBusiness />
                                                Manage Workshops
                                            </NavLink>
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>

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

                        <div className='flex min-w-0 justify-center'>
                            <NavLink to='/garage' className='flex items-center gap-3'>
                                <div className='shrink-0 text-foreground'>
                                    <Logo className='h-10 w-10' darkMode={theme === 'dark'} />
                                </div>
                                <div>
                                    <p className='text-lg font-semibold tracking-tight text-foreground'>Duralog</p>
                                </div>
                            </NavLink>
                        </div>

                        <div className='flex min-w-0 items-center justify-end gap-2'>
                            <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                className='relative'
                                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                                aria-pressed={theme === 'dark'}
                                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                                onClick={toggleTheme}
                            >
                                <Sun className='scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90' />
                                <Moon className='absolute scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0' />
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Avatar
                                        aria-label='Open profile menu'
                                        className='size-11 cursor-pointer border border-border transition-colors hover:border-ring/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                                    >
                                        <AvatarImage src={currentUser.profileImageUrl ?? undefined} alt={displayName} />
                                        <AvatarFallback className='bg-muted text-sm font-semibold text-foreground'>
                                            {profileInitials || (
                                                <UserCircle2 className='size-6 text-muted-foreground' />
                                            )}
                                        </AvatarFallback>
                                    </Avatar>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='end' sideOffset={8}>
                                    <DropdownMenuLabel className='flex flex-col gap-0.5'>
                                        <span className='truncate text-sm font-semibold text-foreground'>
                                            {displayName}
                                        </span>
                                        <span className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                                            Signed in as
                                        </span>
                                        <span className='truncate text-sm font-semibold text-foreground'>
                                            {currentUser.email}
                                        </span>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        <DropdownMenuItem asChild>
                                            <NavLink to='/settings'>
                                                <Settings />
                                                Settings
                                            </NavLink>
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
                </div>
            </div>

            <div className='relative'>
                <div className='pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b from-secondary/35 via-background to-transparent' />
                <div className='relative mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8'>{children}</div>
            </div>
        </div>
    )
}

import { Link } from '@remix-run/react'

import { Button } from './ui/button.js'
import Logo from './ui/logo.js'

export function PublicNavbar() {
    return (
        <header className='sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm'>
            <nav className='mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8'>
                <Link to='/' className='flex items-center gap-2.5'>
                    <div className='flex h-9 w-9 items-center justify-center rounded-xl border bg-card shadow-sm'>
                        <Logo className='h-6 w-6' />
                    </div>
                    <span className='text-lg font-semibold tracking-tight text-foreground'>Duralog</span>
                </Link>
                <div className='flex items-center gap-3'>
                    <Button variant='ghost' size='sm' asChild>
                        <Link to='/pricing'>Pricing</Link>
                    </Button>
                    <Button variant='ghost' size='sm' asChild>
                        <Link to='/login'>Sign in</Link>
                    </Button>
                    <Button size='sm' asChild>
                        <Link to='/signup'>Get started</Link>
                    </Button>
                </div>
            </nav>
        </header>
    )
}

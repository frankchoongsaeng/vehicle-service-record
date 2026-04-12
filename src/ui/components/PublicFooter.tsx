import { Link } from '@remix-run/react'

import Logo from './ui/logo.js'

export function PublicFooter() {
    return (
        <footer className='border-t bg-secondary/10 py-8'>
            <div className='mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 sm:px-6 lg:px-8'>
                <div className='flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-between'>
                    <div className='flex items-center gap-2.5'>
                        <div className='flex h-8 w-8 items-center justify-center rounded-xl border bg-card shadow-sm'>
                            <Logo className='h-5 w-5' />
                        </div>
                        <span className='text-sm font-semibold tracking-tight text-foreground'>Duralog</span>
                    </div>
                    <p className='text-sm text-muted-foreground'>Maintenance tracking that feels deliberate.</p>
                </div>
                <div className='flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground'>
                    <Link to='/privacy' className='hover:text-foreground'>
                        Privacy Policy
                    </Link>
                    <Link to='/terms' className='hover:text-foreground'>
                        Terms of Use
                    </Link>
                    <Link to='/cookies' className='hover:text-foreground'>
                        Cookie Policy
                    </Link>
                </div>
            </div>
        </footer>
    )
}

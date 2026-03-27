import Logo from './ui/logo.js'

export function PublicFooter() {
    return (
        <footer className='border-t bg-secondary/10 py-8'>
            <div className='mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 sm:flex-row sm:justify-between sm:px-6 lg:px-8'>
                <div className='flex items-center gap-2.5'>
                    <div className='flex h-8 w-8 items-center justify-center rounded-xl border bg-card shadow-sm'>
                        <Logo className='h-5 w-5' />
                    </div>
                    <span className='text-sm font-semibold tracking-tight text-foreground'>Duralog</span>
                </div>
                <p className='text-sm text-muted-foreground'>Maintenance tracking that feels deliberate.</p>
            </div>
        </footer>
    )
}

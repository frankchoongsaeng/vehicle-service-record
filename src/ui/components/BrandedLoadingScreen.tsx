import Mascot from './ui/mascot.js'

type BrandedLoadingScreenProps = {
    message?: string
}

export default function BrandedLoadingScreen({ message = 'Checking your session…' }: BrandedLoadingScreenProps) {
    return (
        <div className='grid min-h-screen place-items-center bg-background px-4'>
            <div className='w-full max-w-xl rounded-3xl border bg-card/95 px-8 py-10 text-center shadow-lg shadow-secondary/20'>
                <div className='mx-auto w-full max-w-56'>
                    <Mascot className='h-auto w-full' />
                </div>
                <div className='mt-5 space-y-2'>
                    <p className='text-lg font-semibold tracking-tight text-foreground'>Preparing your garage</p>
                    <p className='text-sm text-muted-foreground'>{message}</p>
                </div>
            </div>
        </div>
    )
}

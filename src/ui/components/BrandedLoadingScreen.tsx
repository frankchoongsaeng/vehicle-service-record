import Mascot from './ui/mascot.js'

type BrandedLoadingScreenProps = {
    message?: string
}

export default function BrandedLoadingScreen({ message = 'Checking your session…' }: BrandedLoadingScreenProps) {
    return (
        <div className='grid min-h-screen place-items-center bg-background px-4'>
            <div className='flex w-full flex-col items-center gap-5 px-8 py-10 text-center'>
                <div className='w-full max-w-56'>
                    <Mascot className='h-auto w-full' />
                </div>
                <p className='text-sm text-muted-foreground'>{message}</p>
            </div>
        </div>
    )
}

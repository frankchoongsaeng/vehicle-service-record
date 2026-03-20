import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/utils.js'

const badgeVariants = cva(
    'inline-flex w-fit shrink-0 items-center justify-center overflow-hidden rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:shrink-0',
    {
        variants: {
            variant: {
                default: 'border-transparent bg-primary text-primary-foreground',
                secondary: 'border-transparent bg-secondary text-secondary-foreground',
                destructive: 'border-transparent bg-destructive text-destructive-foreground',
                outline: 'text-foreground',
                ghost: 'border-transparent hover:bg-accent hover:text-accent-foreground',
                link: 'border-transparent text-primary underline-offset-4 hover:underline'
            }
        },
        defaultVariants: {
            variant: 'default'
        }
    }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
    asChild?: boolean
}

function Badge({ className, variant, asChild = false, ...props }: BadgeProps) {
    const Comp = asChild ? Slot : 'span'

    return (
        <Comp
            className={cn(badgeVariants({ variant }), className)}
            data-slot='badge'
            data-variant={variant}
            {...props}
        />
    )
}

export { Badge }

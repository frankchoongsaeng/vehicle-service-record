import { useMemo, useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'

import { cn } from '../../lib/utils.js'
import { Button } from './button.js'
import { Calendar } from './calendar.js'
import { Popover, PopoverContent, PopoverTrigger } from './popover.js'

type DatePickerProps = {
    id?: string
    name?: string
    value?: string
    defaultValue?: string
    onChange?: (value: string) => void
    placeholder?: string
    disabled?: boolean
    required?: boolean
    className?: string
    ariaInvalid?: boolean
    minDate?: string | Date
    maxDate?: string | Date
}

function parseDateValue(value?: string) {
    if (!value) {
        return undefined
    }

    const [year, month, day] = value.split('-').map(segment => Number(segment))

    if (!year || !month || !day) {
        return undefined
    }

    return new Date(year, month - 1, day)
}

function normalizeDateValue(value?: string | Date) {
    if (!value) {
        return undefined
    }

    if (typeof value === 'string') {
        return parseDateValue(value)
    }

    return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function toDateValue(date?: Date) {
    return date ? format(date, 'yyyy-MM-dd') : ''
}

export function DatePicker({
    id,
    name,
    value,
    defaultValue,
    onChange,
    placeholder = 'Pick a date',
    disabled,
    required,
    className,
    ariaInvalid,
    minDate,
    maxDate
}: DatePickerProps) {
    const isControlled = value !== undefined
    const [internalValue, setInternalValue] = useState(defaultValue ?? '')
    const [open, setOpen] = useState(false)
    const currentValue = isControlled ? value ?? '' : internalValue
    const selectedDate = useMemo(() => parseDateValue(currentValue), [currentValue])
    const minDateValue = useMemo(() => normalizeDateValue(minDate), [minDate])
    const maxDateValue = useMemo(() => normalizeDateValue(maxDate), [maxDate])

    const isDisabled = (date: Date) => {
        const dateValue = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

        if (minDateValue && dateValue < minDateValue.getTime()) {
            return true
        }

        if (maxDateValue && dateValue > maxDateValue.getTime()) {
            return true
        }

        return false
    }

    const handleSelect = (selected?: Date) => {
        const nextValue = toDateValue(selected)

        if (!isControlled) {
            setInternalValue(nextValue)
        }

        onChange?.(nextValue)
        setOpen(false)
    }

    return (
        <>
            {name ? <input type='hidden' name={name} value={currentValue} /> : null}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id={id}
                        type='button'
                        variant='outline'
                        disabled={disabled}
                        aria-invalid={ariaInvalid}
                        aria-required={required}
                        className={cn(
                            'w-full justify-start px-3 text-left font-normal',
                            !selectedDate && 'text-muted-foreground',
                            className
                        )}
                    >
                        <CalendarIcon data-icon='inline-start' />
                        {selectedDate ? format(selectedDate, 'PPP') : <span>{placeholder}</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className='w-auto min-w-76 p-0' align='start'>
                    <Calendar
                        mode='single'
                        selected={selectedDate}
                        onSelect={handleSelect}
                        defaultMonth={selectedDate ?? maxDateValue ?? minDateValue}
                        startMonth={minDateValue}
                        endMonth={maxDateValue}
                        disabled={isDisabled}
                        captionLayout='dropdown'
                        className='w-full p-2 [--cell-size:2rem]'
                    />
                </PopoverContent>
            </Popover>
        </>
    )
}

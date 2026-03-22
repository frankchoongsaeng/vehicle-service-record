import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.js'
import { DatePicker } from '../ui/date-picker.js'
import { Input } from '../ui/input.js'
import { Textarea } from '../ui/textarea.js'
import { Button } from '../ui/button.js'

export function QuickAddServiceForm() {
    const today = new Date()

    return (
        <Card>
            <CardHeader className='space-y-2'>
                <CardTitle>Quick Add Service Record</CardTitle>
                <p className='text-sm text-muted-foreground'>
                    Capture work details now and finalize before filing them to your history.
                </p>
            </CardHeader>
            <CardContent>
                <form className='space-y-4'>
                    <div className='rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground'>
                        Use this shortcut when you have partial information from a receipt, mechanic call, or roadside
                        note.
                    </div>

                    <div className='grid gap-4 sm:grid-cols-2'>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground' htmlFor='serviceType'>
                                Service Type
                            </label>
                            <Input id='serviceType' placeholder='Brake Inspection & Cleaning' />
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground' htmlFor='serviceDate'>
                                Date
                            </label>
                            <DatePicker id='serviceDate' name='serviceDate' minDate='1900-01-01' maxDate={today} />
                        </div>
                    </div>

                    <div className='grid gap-4 sm:grid-cols-2'>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground' htmlFor='mileage'>
                                Mileage
                            </label>
                            <Input id='mileage' placeholder='125,240 km' />
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground' htmlFor='cost'>
                                Cost
                            </label>
                            <Input id='cost' type='number' min='0' step='0.01' placeholder='180.00' />
                        </div>
                    </div>

                    <div className='grid gap-4 sm:grid-cols-2'>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground' htmlFor='workshop'>
                                Workshop / Mechanic
                            </label>
                            <Input id='workshop' placeholder='Northside Auto Care' />
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-foreground' htmlFor='reference'>
                                Reference
                            </label>
                            <Input id='reference' placeholder='INV-2026-0315-017' />
                        </div>
                    </div>

                    <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground' htmlFor='notes'>
                            Notes
                        </label>
                        <Textarea id='notes' placeholder='Additional notes, observations, and follow-up reminders.' />
                    </div>

                    <div className='flex flex-wrap justify-end gap-2'>
                        <Button type='button' variant='secondary'>
                            Save Draft
                        </Button>
                        <Button type='button'>Save Record</Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}

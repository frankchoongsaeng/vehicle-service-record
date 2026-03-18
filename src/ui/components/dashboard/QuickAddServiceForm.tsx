import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.js'
import { Input } from '../ui/input.js'
import { Textarea } from '../ui/textarea.js'
import { Button } from '../ui/button.js'

export function QuickAddServiceForm() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Quick Add Service Record</CardTitle>
                <p className='text-sm text-slate-500'>
                    Capture work details now and finalize before filing to your history.
                </p>
            </CardHeader>
            <CardContent>
                <form className='space-y-4'>
                    <div className='grid gap-4 sm:grid-cols-2'>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-slate-700' htmlFor='serviceType'>
                                Service Type
                            </label>
                            <Input id='serviceType' placeholder='Brake Inspection & Cleaning' />
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-slate-700' htmlFor='serviceDate'>
                                Date
                            </label>
                            <Input id='serviceDate' type='date' />
                        </div>
                    </div>

                    <div className='grid gap-4 sm:grid-cols-2'>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-slate-700' htmlFor='mileage'>
                                Mileage
                            </label>
                            <Input id='mileage' placeholder='125,240 km' />
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-slate-700' htmlFor='cost'>
                                Cost
                            </label>
                            <Input id='cost' type='number' min='0' step='0.01' placeholder='180.00' />
                        </div>
                    </div>

                    <div className='grid gap-4 sm:grid-cols-2'>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-slate-700' htmlFor='workshop'>
                                Workshop / Mechanic
                            </label>
                            <Input id='workshop' placeholder='Northside Auto Care' />
                        </div>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-slate-700' htmlFor='reference'>
                                Reference
                            </label>
                            <Input id='reference' placeholder='INV-2026-0315-017' />
                        </div>
                    </div>

                    <div className='space-y-2'>
                        <label className='text-sm font-medium text-slate-700' htmlFor='notes'>
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

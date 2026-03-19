import { useMemo } from 'react'
import { Search } from 'lucide-react'
import { useSearchParams } from '@remix-run/react'

import { Input } from '../ui/input.js'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.js'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table.js'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select.js'
import { StatusBadge } from './StatusBadge.js'
import type { ServiceRecord, ServiceStatus } from './types.js'

interface ServiceRecordTableProps {
    records: ServiceRecord[]
}

const statusFilters: Array<ServiceStatus | 'All'> = ['All', 'Completed', 'Upcoming', 'Planned', 'Overdue']

export function ServiceRecordTable({ records }: ServiceRecordTableProps) {
    const [searchParams, setSearchParams] = useSearchParams()

    const query = searchParams.get('recordsQuery') ?? ''
    const categoryFromUrl = searchParams.get('recordsCategory') ?? 'All'
    const statusFromUrl = searchParams.get('recordsStatus') ?? 'All'

    const categories = useMemo(() => ['All', ...new Set(records.map(record => record.category))], [records])
    const category = categories.includes(categoryFromUrl) ? categoryFromUrl : 'All'
    const status = statusFilters.includes(statusFromUrl as ServiceStatus | 'All')
        ? (statusFromUrl as ServiceStatus | 'All')
        : 'All'

    const updateFilter = (key: 'recordsQuery' | 'recordsCategory' | 'recordsStatus', value: string) => {
        const next = new URLSearchParams(searchParams)

        if (!value || value === 'All') {
            next.delete(key)
        } else {
            next.set(key, value)
        }

        setSearchParams(next, { replace: true })
    }

    const filteredRecords = useMemo(() => {
        const loweredQuery = query.toLowerCase().trim()

        return records.filter(record => {
            const matchesQuery =
                loweredQuery.length === 0 ||
                record.service.toLowerCase().includes(loweredQuery) ||
                record.workshop.toLowerCase().includes(loweredQuery)
            const matchesCategory = category === 'All' || record.category === category
            const matchesStatus = status === 'All' || record.status === status

            return matchesQuery && matchesCategory && matchesStatus
        })
    }, [category, query, records, status])

    return (
        <Card>
            <CardHeader className='space-y-4'>
                <div>
                    <CardTitle>Service Records</CardTitle>
                    <p className='mt-1 text-sm text-muted-foreground'>
                        Track recent and planned maintenance activities with URL-backed filters.
                    </p>
                </div>

                <div className='grid gap-3 md:grid-cols-[1fr_180px_180px]'>
                    <div className='relative'>
                        <Search className='pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground' />
                        <Input
                            value={query}
                            onChange={event => updateFilter('recordsQuery', event.target.value)}
                            className='pl-9'
                            placeholder='Search by service or workshop'
                            aria-label='Search records'
                        />
                    </div>

                    <Select value={category} onValueChange={value => updateFilter('recordsCategory', value)}>
                        <SelectTrigger>
                            <SelectValue placeholder='Category' />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map(item => (
                                <SelectItem key={item} value={item}>
                                    {item}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={status}
                        onValueChange={value => updateFilter('recordsStatus', value as ServiceStatus | 'All')}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder='Status' />
                        </SelectTrigger>
                        <SelectContent>
                            {statusFilters.map(item => (
                                <SelectItem key={item} value={item}>
                                    {item}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>

            <CardContent>
                <div className='mb-4 flex items-center justify-between gap-3 text-sm text-muted-foreground'>
                    <span>
                        {filteredRecords.length} visible record{filteredRecords.length === 1 ? '' : 's'}
                    </span>
                    <span>Filters stay in the URL so views are shareable.</span>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Mileage</TableHead>
                            <TableHead>Service</TableHead>
                            <TableHead>Workshop</TableHead>
                            <TableHead className='text-right'>Cost</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRecords.map(record => (
                            <TableRow key={record.id}>
                                <TableCell>{record.date}</TableCell>
                                <TableCell>{record.mileage}</TableCell>
                                <TableCell className='font-medium text-foreground'>{record.service}</TableCell>
                                <TableCell>{record.workshop}</TableCell>
                                <TableCell className='text-right'>{record.cost}</TableCell>
                                <TableCell>
                                    <StatusBadge status={record.status} />
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredRecords.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className='py-8 text-center text-sm text-muted-foreground'>
                                    No service records match the selected filters.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

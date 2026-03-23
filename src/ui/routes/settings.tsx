import type { MetaFunction } from '@remix-run/node'
import { Link, useLocation, useNavigate, useSearchParams } from '@remix-run/react'
import { Globe, Settings2, Upload, UserRound, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import * as api from '../api/client.js'
import { ApiError } from '../api/client.js'
import { useAuth } from '../auth/useAuth.js'
import { getUserDisplayName, getUserInitials } from '../lib/account.js'
import { getCurrencyLabel } from '../lib/currency.js'
import { AuthenticatedShell } from '../components/AuthenticatedShell.js'
import BrandedLoadingScreen from '../components/BrandedLoadingScreen.js'
import { PageHeader } from '../components/PageHeader.js'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar.js'
import { Button } from '../components/ui/button.js'
import { Input } from '../components/ui/input.js'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select.js'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs.js'
import {
    PREFERRED_CURRENCIES,
    PROFILE_IMAGE_MAX_BYTES,
    PROFILE_IMAGE_MIME_TYPES,
    type PreferredCurrencyCode
} from '../../types/userSettings.js'

export const meta: MetaFunction = () => {
    return [{ title: 'Settings | Duralog' }, { name: 'description', content: 'Manage account and preferences.' }]
}

type SettingsTab = 'account' | 'preferences'

const settingsTabs: ReadonlySet<SettingsTab> = new Set(['account', 'preferences'])

function resolveSettingsTab(value: string | null): SettingsTab {
    return value && settingsTabs.has(value as SettingsTab) ? (value as SettingsTab) : 'account'
}

export default function SettingsRoute() {
    const auth = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const activeTab = resolveSettingsTab(searchParams.get('tab'))

    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [country, setCountry] = useState('')
    const [profileImageUrl, setProfileImageUrl] = useState('')
    const [preferredCurrency, setPreferredCurrency] = useState<PreferredCurrencyCode>('USD')
    const [accountError, setAccountError] = useState('')
    const [preferencesError, setPreferencesError] = useState('')
    const [accountSaved, setAccountSaved] = useState('')
    const [preferencesSaved, setPreferencesSaved] = useState('')
    const [savingAccount, setSavingAccount] = useState(false)
    const [savingPreferences, setSavingPreferences] = useState(false)
    const [uploadingImage, setUploadingImage] = useState(false)
    const [removingImage, setRemovingImage] = useState(false)
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    useEffect(() => {
        if (auth.status !== 'unauthenticated') {
            return
        }

        const redirectTo = `${location.pathname}${location.search}${location.hash}` || '/settings'
        navigate(`/login?redirectTo=${encodeURIComponent(redirectTo)}`, { replace: true })
    }, [auth.status, location.hash, location.pathname, location.search, navigate])

    useEffect(() => {
        if (!auth.user) {
            return
        }

        setFirstName(auth.user.firstName ?? '')
        setLastName(auth.user.lastName ?? '')
        setCountry(auth.user.country ?? '')
        setProfileImageUrl(auth.user.profileImageUrl ?? '')
        setPreferredCurrency(auth.user.preferredCurrency)
    }, [auth.user])

    const syncTab = (nextTab: SettingsTab) => {
        const nextParams = new URLSearchParams(searchParams)

        if (nextTab === 'account') {
            nextParams.delete('tab')
        } else {
            nextParams.set('tab', nextTab)
        }

        setSearchParams(nextParams, { replace: true })
    }

    const handleSaveAccount = async () => {
        setSavingAccount(true)
        setAccountError('')
        setAccountSaved('')

        try {
            const updatedUser = await api.updateSettings({
                firstName,
                lastName,
                country
            })

            auth.replaceUser(updatedUser)
            setAccountSaved('Account settings saved.')
        } catch (error) {
            if (error instanceof ApiError || error instanceof Error) {
                setAccountError(error.message)
            } else {
                setAccountError('Unable to save account settings right now.')
            }
        } finally {
            setSavingAccount(false)
        }
    }

    const handleSavePreferences = async () => {
        setSavingPreferences(true)
        setPreferencesError('')
        setPreferencesSaved('')

        try {
            const updatedUser = await api.updateSettings({ preferredCurrency })
            auth.replaceUser(updatedUser)
            setPreferencesSaved('Preferences saved.')
        } catch (error) {
            if (error instanceof ApiError || error instanceof Error) {
                setPreferencesError(error.message)
            } else {
                setPreferencesError('Unable to save preferences right now.')
            }
        } finally {
            setSavingPreferences(false)
        }
    }

    const handleChoosePhoto = () => {
        fileInputRef.current?.click()
    }

    const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]

        if (!file) {
            return
        }

        setAccountError('')
        setAccountSaved('')

        if (!PROFILE_IMAGE_MIME_TYPES.includes(file.type as (typeof PROFILE_IMAGE_MIME_TYPES)[number])) {
            setAccountError('Profile image must be a JPG, PNG, WebP, or GIF file.')
            event.target.value = ''
            return
        }

        if (file.size > PROFILE_IMAGE_MAX_BYTES) {
            setAccountError('Profile image must be 5 MB or smaller.')
            event.target.value = ''
            return
        }

        setUploadingImage(true)

        try {
            const updatedUser = await api.uploadProfileImage(file)
            auth.replaceUser(updatedUser)
            setProfileImageUrl(updatedUser.profileImageUrl ?? '')
            setAccountSaved('Profile image uploaded.')
        } catch (error) {
            if (error instanceof ApiError || error instanceof Error) {
                setAccountError(error.message)
            } else {
                setAccountError('Unable to upload the profile image right now.')
            }
        } finally {
            setUploadingImage(false)
            event.target.value = ''
        }
    }

    const handleRemovePhoto = async () => {
        setRemovingImage(true)
        setAccountError('')
        setAccountSaved('')

        try {
            const updatedUser = await api.removeProfileImage()
            auth.replaceUser(updatedUser)
            setProfileImageUrl('')
            setAccountSaved('Profile image removed.')
        } catch (error) {
            if (error instanceof ApiError || error instanceof Error) {
                setAccountError(error.message)
            } else {
                setAccountError('Unable to remove the profile image right now.')
            }
        } finally {
            setRemovingImage(false)
        }
    }

    if (auth.status === 'loading') {
        return <BrandedLoadingScreen message='Checking your session…' />
    }

    if (!auth.user) {
        return <div className='grid min-h-screen place-items-center text-muted-foreground'>Redirecting to login…</div>
    }

    const displayName = getUserDisplayName(auth.user)
    const initials = getUserInitials(auth.user)
    const profilePreview = profileImageUrl.trim() || undefined

    return (
        <AuthenticatedShell currentUser={auth.user} onLogout={auth.logout}>
            <div className='flex flex-col gap-6'>
                <PageHeader
                    eyebrow='Settings'
                    title='Manage your account'
                    description='Update the profile details and preferences that follow you through the app.'
                    variant='plain'
                    actions={
                        <Button asChild variant='outline'>
                            <Link to='/garage'>Back to Garage</Link>
                        </Button>
                    }
                />

                <Tabs
                    value={activeTab}
                    onValueChange={value => syncTab(resolveSettingsTab(value))}
                    className='grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start'
                >
                    <div className='lg:sticky lg:top-6'>
                        <TabsList className='flex h-auto w-full flex-col items-stretch justify-start gap-1 rounded-none bg-transparent p-0 text-foreground'>
                            <TabsTrigger
                                value='account'
                                className='w-full justify-start rounded-none border-l-2 border-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none'
                            >
                                Account
                            </TabsTrigger>
                            <TabsTrigger
                                value='preferences'
                                className='w-full justify-start rounded-none border-l-2 border-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none'
                            >
                                Preferences
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value='account' className='mt-0'>
                        <div className='flex max-w-2xl flex-col gap-6'>
                            <div className='flex flex-col gap-2'>
                                <h2 className='text-xl font-semibold text-foreground'>Account</h2>
                                <p className='text-sm text-muted-foreground'>
                                    Set the personal details used in your profile menu and account views.
                                </p>
                            </div>

                            <div className='flex items-center gap-4'>
                                <Avatar className='size-24 border border-border'>
                                    <AvatarImage src={profilePreview} alt={displayName} />
                                    <AvatarFallback className='text-xl font-semibold'>{initials}</AvatarFallback>
                                </Avatar>
                                <div className='flex flex-col gap-1'>
                                    <p className='text-lg font-semibold text-foreground'>{displayName}</p>
                                    <p className='text-sm text-muted-foreground'>{auth.user.email}</p>
                                    <p className='text-sm text-muted-foreground'>
                                        {country.trim() ? country.trim() : 'Country not set'}
                                    </p>
                                </div>
                            </div>

                            {accountError ? (
                                <p className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
                                    {accountError}
                                </p>
                            ) : null}
                            {accountSaved ? (
                                <p className='rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground'>
                                    {accountSaved}
                                </p>
                            ) : null}

                            <div className='flex flex-col gap-2'>
                                <label htmlFor='settings-first-name' className='text-sm font-medium text-foreground'>
                                    First name
                                </label>
                                <Input
                                    id='settings-first-name'
                                    value={firstName}
                                    onChange={event => setFirstName(event.target.value)}
                                    placeholder='e.g. Alex'
                                />
                            </div>

                            <div className='flex flex-col gap-2'>
                                <label htmlFor='settings-last-name' className='text-sm font-medium text-foreground'>
                                    Last name
                                </label>
                                <Input
                                    id='settings-last-name'
                                    value={lastName}
                                    onChange={event => setLastName(event.target.value)}
                                    placeholder='e.g. Driver'
                                />
                            </div>

                            <div className='flex flex-col gap-2'>
                                <label htmlFor='settings-country' className='text-sm font-medium text-foreground'>
                                    Country
                                </label>
                                <Input
                                    id='settings-country'
                                    value={country}
                                    onChange={event => setCountry(event.target.value)}
                                    placeholder='e.g. United States'
                                />
                            </div>

                            <div className='flex flex-col gap-2'>
                                <label className='text-sm font-medium text-foreground'>Profile image</label>
                                <Input
                                    ref={fileInputRef}
                                    type='file'
                                    accept={PROFILE_IMAGE_MIME_TYPES.join(',')}
                                    className='hidden'
                                    onChange={handleFileSelected}
                                />
                                <div className='flex flex-wrap gap-2'>
                                    <Button
                                        type='button'
                                        variant='outline'
                                        onClick={handleChoosePhoto}
                                        disabled={uploadingImage || removingImage}
                                    >
                                        <Upload data-icon='inline-start' />
                                        {uploadingImage
                                            ? 'Uploading…'
                                            : profilePreview
                                            ? 'Replace Photo'
                                            : 'Upload Photo'}
                                    </Button>
                                    <Button
                                        type='button'
                                        variant='outline'
                                        onClick={handleRemovePhoto}
                                        disabled={!profilePreview || uploadingImage || removingImage}
                                    >
                                        <X data-icon='inline-start' />
                                        {removingImage ? 'Removing…' : 'Remove Photo'}
                                    </Button>
                                </div>
                                <p className='text-xs text-muted-foreground'>JPG, PNG, WebP, or GIF up to 5 MB.</p>
                            </div>

                            <div className='flex justify-end'>
                                <Button type='button' onClick={handleSaveAccount} disabled={savingAccount}>
                                    <UserRound data-icon='inline-start' />
                                    {savingAccount ? 'Saving…' : 'Save Account'}
                                </Button>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value='preferences' className='mt-0'>
                        <div className='flex max-w-2xl flex-col gap-6'>
                            <div className='flex flex-col gap-2'>
                                <h2 className='text-xl font-semibold text-foreground'>Preferences</h2>
                                <p className='text-sm text-muted-foreground'>
                                    Choose the currency label and formatting used when recording and displaying amounts.
                                </p>
                            </div>

                            {preferencesError ? (
                                <p className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
                                    {preferencesError}
                                </p>
                            ) : null}
                            {preferencesSaved ? (
                                <p className='rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground'>
                                    {preferencesSaved}
                                </p>
                            ) : null}

                            <div className='flex flex-col gap-2'>
                                <label
                                    htmlFor='settings-preferred-currency'
                                    className='text-sm font-medium text-foreground'
                                >
                                    Preferred currency
                                </label>
                                <Select
                                    value={preferredCurrency}
                                    onValueChange={value => setPreferredCurrency(value as PreferredCurrencyCode)}
                                >
                                    <SelectTrigger id='settings-preferred-currency'>
                                        <SelectValue placeholder='Select a currency' />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PREFERRED_CURRENCIES.map(currency => (
                                            <SelectItem key={currency.value} value={currency.value}>
                                                {getCurrencyLabel(currency.value)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className='flex flex-col gap-1 text-sm text-muted-foreground'>
                                <p className='font-medium text-foreground'>Current preference</p>
                                <p className='flex items-center gap-2'>
                                    <Globe />
                                    {getCurrencyLabel(preferredCurrency)}
                                </p>
                            </div>

                            <div className='flex justify-end'>
                                <Button type='button' onClick={handleSavePreferences} disabled={savingPreferences}>
                                    <Settings2 data-icon='inline-start' />
                                    {savingPreferences ? 'Saving…' : 'Save Preferences'}
                                </Button>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </AuthenticatedShell>
    )
}

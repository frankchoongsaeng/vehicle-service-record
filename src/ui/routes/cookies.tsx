import type { MetaFunction } from '@remix-run/node'

import { PublicFooter } from '../components/PublicFooter.js'
import { PublicNavbar } from '../components/PublicNavbar.js'

export const meta: MetaFunction = () => {
    return [
        { title: 'Cookie Policy | Duralog' },
        { name: 'description', content: 'Duralog cookie policy — how and why we use cookies.' }
    ]
}

export default function Cookies() {
    return (
        <div className='flex min-h-screen flex-col bg-background'>
            <PublicNavbar />

            <main className='mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 lg:px-8'>
                <h1 className='text-3xl font-semibold tracking-tight text-foreground'>Cookie Policy</h1>
                <p className='mt-2 text-sm text-muted-foreground'>Last updated: March 29, 2026</p>

                <div className='mt-8 space-y-8 text-base leading-7 text-muted-foreground'>
                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>1. What Are Cookies</h2>
                        <p>
                            Cookies are small text files placed on your device by a website. They are widely used to
                            make websites work efficiently and to provide information to site operators.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>2. How We Use Cookies</h2>
                        <p>
                            Duralog uses a minimal set of cookies that are strictly necessary for the Service to
                            function. We do not use cookies for advertising, analytics tracking, or behavioral
                            profiling.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>3. Cookies We Set</h2>
                        <div className='overflow-x-auto rounded-lg border'>
                            <table className='w-full text-sm'>
                                <thead>
                                    <tr className='border-b bg-muted/50'>
                                        <th className='px-4 py-3 text-left font-medium text-foreground'>Cookie</th>
                                        <th className='px-4 py-3 text-left font-medium text-foreground'>Purpose</th>
                                        <th className='px-4 py-3 text-left font-medium text-foreground'>Type</th>
                                        <th className='px-4 py-3 text-left font-medium text-foreground'>Duration</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className='border-b'>
                                        <td className='px-4 py-3 font-mono text-foreground'>session</td>
                                        <td className='px-4 py-3'>
                                            Keeps you signed in and authenticates API requests. Contains an encrypted
                                            session token.
                                        </td>
                                        <td className='px-4 py-3'>Strictly necessary</td>
                                        <td className='px-4 py-3'>Session / 30 days</td>
                                    </tr>
                                    <tr>
                                        <td className='px-4 py-3 font-mono text-foreground'>theme</td>
                                        <td className='px-4 py-3'>
                                            Remembers your preferred color theme (light or dark) so it persists across
                                            visits.
                                        </td>
                                        <td className='px-4 py-3'>Functional</td>
                                        <td className='px-4 py-3'>1 year</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>4. Session Cookie Details</h2>
                        <p>
                            Our session cookie is set with the <strong className='text-foreground'>HttpOnly</strong> and{' '}
                            <strong className='text-foreground'>Secure</strong> flags. The HttpOnly flag means the
                            cookie cannot be accessed by client-side JavaScript, which helps protect against cross-site
                            scripting (XSS) attacks. The Secure flag ensures the cookie is only transmitted over
                            encrypted HTTPS connections.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>5. Third-Party Cookies</h2>
                        <p>
                            Our payment processor (Stripe) may set its own cookies during the checkout process. These
                            cookies are governed by{' '}
                            <a
                                href='https://stripe.com/cookies-policy/legal'
                                target='_blank'
                                rel='noopener noreferrer'
                                className='font-medium text-primary underline underline-offset-4 hover:text-primary/80'
                            >
                                Stripe&apos;s Cookie Policy
                            </a>
                            . We do not control or have access to third-party cookies.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>6. Managing Cookies</h2>
                        <p>
                            You can manage or delete cookies through your browser settings. Please note that disabling
                            the session cookie will prevent you from signing in to Duralog. Clearing the theme cookie
                            will reset your color preference to the system default.
                        </p>
                        <p>
                            Most browsers allow you to view, manage, and delete cookies in their privacy or security
                            settings. Refer to your browser&apos;s help documentation for specific instructions.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>7. Changes to This Policy</h2>
                        <p>
                            We may update this Cookie Policy as our use of cookies evolves. When we do, we will revise
                            the &quot;Last updated&quot; date at the top of this page.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>8. Contact Us</h2>
                        <p>
                            If you have questions about our use of cookies, please contact us at{' '}
                            <a
                                href='mailto:privacy.duralog@tumivo.com'
                                className='font-medium text-primary underline underline-offset-4 hover:text-primary/80'
                            >
                                privacy.duralog@tumivo.com
                            </a>
                            .
                        </p>
                    </section>
                </div>
            </main>

            <PublicFooter />
        </div>
    )
}

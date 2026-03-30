import type { MetaFunction } from '@remix-run/node'
import { Link } from '@remix-run/react'

import { PublicFooter } from '../components/PublicFooter.js'
import { PublicNavbar } from '../components/PublicNavbar.js'

export const meta: MetaFunction = () => {
    return [
        { title: 'Privacy Policy | Duralog' },
        { name: 'description', content: 'Duralog privacy policy — how we collect, use, and protect your data.' }
    ]
}

export default function Privacy() {
    return (
        <div className='flex min-h-screen flex-col bg-background'>
            <PublicNavbar />

            <main className='mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 lg:px-8'>
                <h1 className='text-3xl font-semibold tracking-tight text-foreground'>Privacy Policy</h1>
                <p className='mt-2 text-sm text-muted-foreground'>Last updated: March 29, 2026</p>

                <div className='mt-8 space-y-8 text-base leading-7 text-muted-foreground'>
                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>1. Introduction</h2>
                        <p>
                            Duralog (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the Duralog web
                            application. This Privacy Policy explains how we collect, use, disclose, and safeguard your
                            information when you use our service.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>2. Information We Collect</h2>
                        <h3 className='text-lg font-medium text-foreground'>Account Information</h3>
                        <p>
                            When you create an account, we collect your email address and a hashed version of your
                            password. If you sign in with Google, we receive your name, email address, and profile
                            picture from Google.
                        </p>
                        <h3 className='text-lg font-medium text-foreground'>Vehicle &amp; Service Data</h3>
                        <p>
                            We store the vehicle details and service records you enter, including make, model, year,
                            VIN, mileage, service dates, service types, costs, notes, and any uploaded images.
                        </p>
                        <h3 className='text-lg font-medium text-foreground'>Usage Data</h3>
                        <p>
                            We automatically collect certain technical information when you use the service, including
                            IP address, browser type, operating system, referring URLs, and pages visited. This data is
                            used for analytics and improving the service.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>3. How We Use Your Information</h2>
                        <ul className='list-inside list-disc space-y-1'>
                            <li>To provide, operate, and maintain the Duralog service</li>
                            <li>To manage your account and authenticate your sessions</li>
                            <li>To process subscription billing through our payment provider</li>
                            <li>To send service reminders and maintenance notifications you configure</li>
                            <li>To send transactional emails such as password resets and email verification</li>
                            <li>To improve and personalize your experience</li>
                            <li>To detect, prevent, and address technical issues or abuse</li>
                        </ul>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>4. Payment Processing</h2>
                        <p>
                            Subscription payments are processed by Stripe. We do not store your full credit card number
                            on our servers. Stripe&apos;s handling of your payment information is governed by their{' '}
                            <a
                                href='https://stripe.com/privacy'
                                target='_blank'
                                rel='noopener noreferrer'
                                className='font-medium text-primary underline underline-offset-4 hover:text-primary/80'
                            >
                                Privacy Policy
                            </a>
                            .
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>5. Cookies &amp; Session Storage</h2>
                        <p>
                            We use an HTTP-only session cookie to keep you signed in. This cookie does not track you
                            across other websites. For more details, see our{' '}
                            <Link
                                to='/cookies'
                                className='font-medium text-primary underline underline-offset-4 hover:text-primary/80'
                            >
                                Cookie Policy
                            </Link>
                            .
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>6. Data Sharing &amp; Third Parties</h2>
                        <p>
                            We do not sell your personal data. We may share information with third parties only in the
                            following circumstances:
                        </p>
                        <ul className='list-inside list-disc space-y-1'>
                            <li>
                                <strong className='text-foreground'>Service providers</strong> — such as our payment
                                processor (Stripe) and email delivery provider — that assist us in operating the service
                            </li>
                            <li>
                                <strong className='text-foreground'>Legal requirements</strong> — when required by law,
                                regulation, or valid legal process
                            </li>
                            <li>
                                <strong className='text-foreground'>Business transfers</strong> — in connection with a
                                merger, acquisition, or sale of assets, in which case you will be notified
                            </li>
                        </ul>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>7. Data Retention</h2>
                        <p>
                            We retain your account data and vehicle records for as long as your account is active. If
                            you delete your account, we will remove your personal data within 30 days, except where
                            retention is required by law or for legitimate business purposes such as resolving disputes.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>8. Data Security</h2>
                        <p>
                            We implement industry-standard security measures to protect your data, including encrypted
                            connections (HTTPS), hashed passwords, and secure session management. However, no method of
                            transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>9. Your Rights</h2>
                        <p>Depending on your jurisdiction, you may have the right to:</p>
                        <ul className='list-inside list-disc space-y-1'>
                            <li>Access the personal data we hold about you</li>
                            <li>Request correction of inaccurate data</li>
                            <li>Request deletion of your data</li>
                            <li>Object to or restrict certain processing</li>
                            <li>Export your data in a portable format</li>
                        </ul>
                        <p>To exercise any of these rights, please contact us at the email address listed below.</p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>10. Children&apos;s Privacy</h2>
                        <p>
                            Duralog is not intended for use by anyone under the age of 16. We do not knowingly collect
                            personal information from children. If you believe we have collected data from a child,
                            please contact us and we will promptly delete it.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>11. Changes to This Policy</h2>
                        <p>
                            We may update this Privacy Policy from time to time. When we do, we will revise the
                            &quot;Last updated&quot; date at the top of this page. We encourage you to review this page
                            periodically.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>12. Contact Us</h2>
                        <p>
                            If you have questions about this Privacy Policy or your personal data, please contact us at{' '}
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

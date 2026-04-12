import type { MetaFunction } from '@remix-run/node'

import { PublicFooter } from '../components/PublicFooter.js'
import { PublicNavbar } from '../components/PublicNavbar.js'

export const meta: MetaFunction = () => {
    return [
        { title: 'Terms of Use | Duralog' },
        {
            name: 'description',
            content:
                'Duralog terms of use — the rules, conditions, and limitations that apply when you use the platform.'
        }
    ]
}

export default function Terms() {
    return (
        <div className='flex min-h-screen flex-col bg-background'>
            <PublicNavbar />

            <main className='mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 lg:px-8'>
                <h1 className='text-3xl font-semibold tracking-tight text-foreground'>Terms of Use</h1>
                <p className='mt-2 text-sm text-muted-foreground'>Last updated: April 5, 2026</p>

                <div className='mt-8 space-y-8 text-base leading-7 text-muted-foreground'>
                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>1. Acceptance of These Terms</h2>
                        <p>
                            These Terms of Use govern your access to and use of Duralog, including our website,
                            applications, reminders, and related services (collectively, the &quot;Service&quot;). By
                            creating an account, accessing, or using the Service, you agree to these Terms of Use. If
                            you do not agree, do not use the Service.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>2. Eligibility and Accounts</h2>
                        <p>
                            You must be at least 16 years old and capable of entering into a binding agreement to use
                            the Service. You are responsible for providing accurate account information, keeping your
                            credentials secure, and all activity that occurs under your account.
                        </p>
                        <p>
                            You may register with an email address and password or through a supported third-party sign
                            in provider such as Google. You must notify us promptly if you believe your account has been
                            accessed without authorization.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>3. The Service</h2>
                        <p>
                            Duralog is a vehicle maintenance and service history platform. The Service may include
                            vehicle profiles, service records, workshop information, maintenance plans, reminder emails,
                            image uploads, and account-management features. We may add, remove, or modify features at
                            any time.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>4. Subscription Plans and Billing</h2>
                        <p>
                            Some parts of the Service may be offered for free and others may require a paid
                            subscription. If you purchase a paid plan, you authorize us and our payment processor,
                            Stripe, to charge the payment method you provide at the price and billing interval shown at
                            checkout.
                        </p>
                        <ul className='list-inside list-disc space-y-1'>
                            <li>Paid subscriptions renew automatically until cancelled</li>
                            <li>You can cancel future renewals from your account settings or by contacting us</li>
                            <li>Unless required by law, fees already paid are non-refundable</li>
                            <li>We may change pricing or plan features with prospective notice</li>
                        </ul>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>5. Acceptable Use</h2>
                        <p>You agree not to:</p>
                        <ul className='list-inside list-disc space-y-1'>
                            <li>Use the Service for any unlawful purpose</li>
                            <li>Attempt to gain unauthorized access to any part of the Service</li>
                            <li>Interfere with or disrupt the Service or its infrastructure</li>
                            <li>Upload malicious content, viruses, or harmful code</li>
                            <li>Scrape, data-mine, or use automated tools to access the Service without permission</li>
                            <li>Impersonate another person or entity</li>
                            <li>Use the Service to infringe privacy, intellectual property, or other legal rights</li>
                            <li>Use the Service in a way that could harm other users, our systems, or our business</li>
                        </ul>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>6. User Content</h2>
                        <p>
                            You retain ownership of the data you submit to the Service, including vehicle information,
                            service records, images, notes, and workshop information. By submitting content, you grant
                            us a limited, non-exclusive license to host, process, transmit, and display that content
                            solely as needed to operate, secure, and improve the Service for you.
                        </p>
                        <p>
                            You are responsible for ensuring that you have the rights needed to submit your content and
                            that it does not violate law or these terms.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>7. Intellectual Property</h2>
                        <p>
                            The Service, including its design, code, logos, and documentation, is owned by Duralog and
                            protected by intellectual property laws. You may not copy, modify, distribute, or reverse
                            engineer any part of the Service without our written permission.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>8. Third-Party Services</h2>
                        <p>
                            The Service may integrate with third-party providers, including Stripe for billing, Google
                            for sign-in, and providers that help us deliver emails or store uploaded content. Your use
                            of those third-party services may also be subject to their terms and policies, and we are
                            not responsible for third-party products or services.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>9. Availability and Changes</h2>
                        <p>
                            We may suspend, limit, or modify the Service at any time for maintenance, upgrades,
                            security, legal compliance, or other operational reasons. We do not guarantee that the
                            Service will be available without interruption, error-free, or that any particular feature
                            will continue to be offered.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>10. Disclaimer of Warranties</h2>
                        <p>
                            The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of
                            any kind, express or implied, including implied warranties of merchantability, fitness for a
                            particular purpose, and non-infringement. We do not warrant that the Service will meet your
                            requirements, be uninterrupted, secure, or error-free.
                        </p>
                        <p>
                            Maintenance recommendations and reminders provided by the Service are for informational
                            purposes only and do not constitute mechanical, safety, legal, insurance, or financial
                            advice. You remain solely responsible for inspection, maintenance, and operation of your
                            vehicles and equipment.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>11. Limitation of Liability</h2>
                        <p>
                            To the maximum extent permitted by law, Duralog and its officers, employees, and affiliates
                            shall not be liable for any indirect, incidental, special, consequential, or punitive
                            damages, or any loss of data, profits, revenue, business, or goodwill, arising from or
                            related to your use of or inability to use the Service.
                        </p>
                        <p>
                            To the maximum extent permitted by law, our total liability for claims arising out of or
                            relating to the Service will not exceed the greater of the amount you paid us in the 12
                            months before the event giving rise to the claim or $100.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>12. Suspension and Termination</h2>
                        <p>
                            We may suspend or terminate your access to the Service if we reasonably believe you have
                            violated these terms, created risk for other users, exposed us to legal liability, or used
                            the Service fraudulently or abusively. You may stop using the Service at any time, and you
                            may request account deletion subject to our legal and operational retention obligations.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>13. Changes to These Terms</h2>
                        <p>
                            We may modify these Terms of Use from time to time. When we do, we will post the updated
                            version and revise the &quot;Last updated&quot; date above. If you continue to use the
                            Service after the updated terms become effective, you agree to the revised terms.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>14. Governing Law and Disputes</h2>
                        <p>
                            These Terms of Use are governed by the laws that apply in the jurisdiction from which the
                            Service operator provides the Service, without regard to conflict-of-laws rules. Before
                            filing a formal legal claim, you and Duralog agree to try to resolve the dispute through
                            good-faith written notice and discussion.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>15. Contact</h2>
                        <p>
                            If you have questions about these Terms of Use, please contact us at{' '}
                            <a
                                href='mailto:legal.duralog@tumivo.com'
                                className='font-medium text-primary underline underline-offset-4 hover:text-primary/80'
                            >
                                legal.duralog@tumivo.com
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

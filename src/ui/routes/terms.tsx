import type { MetaFunction } from '@remix-run/node'

import { PublicFooter } from '../components/PublicFooter.js'
import { PublicNavbar } from '../components/PublicNavbar.js'

export const meta: MetaFunction = () => {
    return [
        { title: 'Terms of Service | Duralog' },
        { name: 'description', content: 'Duralog terms of service — the rules and guidelines for using our platform.' }
    ]
}

export default function Terms() {
    return (
        <div className='flex min-h-screen flex-col bg-background'>
            <PublicNavbar />

            <main className='mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 lg:px-8'>
                <h1 className='text-3xl font-semibold tracking-tight text-foreground'>Terms of Service</h1>
                <p className='mt-2 text-sm text-muted-foreground'>Last updated: March 29, 2026</p>

                <div className='mt-8 space-y-8 text-base leading-7 text-muted-foreground'>
                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>1. Acceptance of Terms</h2>
                        <p>
                            By accessing or using Duralog (&quot;the Service&quot;), you agree to be bound by these
                            Terms of Service. If you do not agree to these terms, you may not use the Service.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>2. Description of Service</h2>
                        <p>
                            Duralog is a web application that allows users to track vehicle maintenance history, manage
                            service records, create maintenance plans, and manage workshops. The Service is available on
                            a free tier and through paid subscription plans.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>3. Account Registration</h2>
                        <p>
                            To use the Service, you must create an account by providing a valid email address and
                            password, or by authenticating through a supported third-party provider (e.g., Google). You
                            are responsible for maintaining the confidentiality of your account credentials and for all
                            activities that occur under your account.
                        </p>
                        <p>You agree to:</p>
                        <ul className='list-inside list-disc space-y-1'>
                            <li>Provide accurate and complete information during registration</li>
                            <li>Keep your login credentials secure</li>
                            <li>Notify us immediately of any unauthorized access to your account</li>
                            <li>Accept responsibility for all activity under your account</li>
                        </ul>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>4. Subscriptions &amp; Billing</h2>
                        <p>
                            Duralog offers free and paid subscription plans. Paid subscriptions are billed on a monthly
                            or annual basis through Stripe. By subscribing to a paid plan, you authorize us to charge
                            your payment method at the applicable rate.
                        </p>
                        <ul className='list-inside list-disc space-y-1'>
                            <li>Subscriptions renew automatically unless cancelled before the renewal date</li>
                            <li>You may cancel your subscription at any time from your account settings</li>
                            <li>Refunds are handled on a case-by-case basis at our discretion</li>
                            <li>
                                We reserve the right to change pricing with reasonable notice to existing subscribers
                            </li>
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
                            <li>Use the Service to store content unrelated to vehicle maintenance</li>
                        </ul>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>6. User Content</h2>
                        <p>
                            You retain ownership of the data you submit to the Service, including vehicle information,
                            service records, images, and notes. By using the Service, you grant us a limited license to
                            store, process, and display your content solely for the purpose of providing the Service to
                            you.
                        </p>
                        <p>You are solely responsible for the accuracy and legality of the content you submit.</p>
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
                        <h2 className='text-xl font-semibold text-foreground'>8. Service Availability</h2>
                        <p>
                            We strive to keep the Service available at all times but do not guarantee uninterrupted
                            access. The Service may be temporarily unavailable due to maintenance, updates, or
                            circumstances beyond our control. We are not liable for any loss or damage resulting from
                            service interruptions.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>9. Disclaimer of Warranties</h2>
                        <p>
                            The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of
                            any kind, whether express or implied, including but not limited to warranties of
                            merchantability, fitness for a particular purpose, and non-infringement. Duralog does not
                            warrant that the Service will be error-free or that any information stored will be preserved
                            indefinitely.
                        </p>
                        <p>
                            Maintenance recommendations and reminders provided by the Service are for informational
                            purposes only and do not constitute professional mechanical advice. Always consult a
                            qualified mechanic for vehicle maintenance decisions.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>10. Limitation of Liability</h2>
                        <p>
                            To the maximum extent permitted by law, Duralog and its officers, employees, and affiliates
                            shall not be liable for any indirect, incidental, special, consequential, or punitive
                            damages, or any loss of data, profits, or revenue, arising from your use of or inability to
                            use the Service.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>11. Account Termination</h2>
                        <p>
                            We reserve the right to suspend or terminate your account at any time if you violate these
                            terms or engage in conduct that we determine to be harmful to the Service or other users.
                            You may delete your account at any time through your account settings.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>12. Changes to These Terms</h2>
                        <p>
                            We may modify these Terms of Service at any time. When we make changes, we will update the
                            &quot;Last updated&quot; date at the top of this page. Continued use of the Service after
                            changes are posted constitutes your acceptance of the revised terms.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>13. Governing Law</h2>
                        <p>
                            These terms shall be governed by and construed in accordance with applicable law, without
                            regard to conflict of law principles. Any disputes arising from these terms or your use of
                            the Service shall be resolved through good-faith negotiation before pursuing formal legal
                            action.
                        </p>
                    </section>

                    <section className='space-y-3'>
                        <h2 className='text-xl font-semibold text-foreground'>14. Contact Us</h2>
                        <p>
                            If you have questions about these Terms of Service, please contact us at{' '}
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

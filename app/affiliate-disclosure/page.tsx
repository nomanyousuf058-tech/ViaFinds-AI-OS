import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Affiliate Disclosure | ViaFinds',
  description: 'Read ViaFinds Affiliate Disclosure to understand how we earn commissions and maintain our editorial independence.',
  alternates: {
    canonical: 'https://viafinds.com/affiliate-disclosure',
  },
  openGraph: {
    title: 'Affiliate Disclosure | ViaFinds',
    description: 'Read ViaFinds Affiliate Disclosure to understand how we earn commissions and maintain our editorial independence.',
    url: 'https://viafinds.com/affiliate-disclosure',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Affiliate Disclosure | ViaFinds',
    description: 'Read ViaFinds Affiliate Disclosure to understand how we earn commissions and maintain our editorial independence.',
  },
};

const sections = [
  { id: 'ftc', title: 'FTC Affiliate Disclosure' },
  { id: 'commission', title: 'Commission Transparency' },
  { id: 'independence', title: 'Editorial Independence' },
  { id: 'pricing', title: 'Pricing Disclaimer' },
  { id: 'merchant', title: 'External Merchant Disclaimer' },
  { id: 'faq', title: 'FAQ' },
];

const STATIC_LAST_UPDATED = 'August 1, 2026';

export default function AffiliateDisclosurePage() {
  return (
    <main className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen py-8">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        <h1 className="font-headline-xl text-headline-xl text-on-background mb-2">
          Affiliate Disclosure
        </h1>
        <p className="font-ui-body text-ui-body text-on-surface-variant mb-6">
          Last Updated: {STATIC_LAST_UPDATED}
        </p>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebPage',
              '@id': 'https://viafinds.com/affiliate-disclosure',
              url: 'https://viafinds.com/affiliate-disclosure',
              name: 'Affiliate Disclosure | ViaFinds',
              description:
                'Read ViaFinds Affiliate Disclosure to understand how we earn commissions and maintain our editorial independence.',
            }),
          }}
        />

        <div className="prose dark:prose-invert max-w-none mt-8 space-y-12">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="font-display text-2xl text-primary font-bold mb-4">
                {section.title}
              </h2>
              <p className="font-body text-sm text-secondary leading-relaxed">
                {section.id === 'ftc' &&
                  'Some links on this site are affiliate links. If you make a purchase through these links, we may earn a commission at no extra cost to you.'}
                {section.id === 'commission' &&
                  'We may earn commissions from qualifying purchases made through links on this site. These commissions help support our editorial operations.'}
                {section.id === 'independence' &&
                  'Our editorial content is not influenced by affiliate relationships. We only recommend products and services that we believe provide value to our readers.'}
                {section.id === 'pricing' &&
                  'Prices and availability are subject to change. We do not guarantee that the information on this site is current or accurate at the time of your purchase.'}
                {section.id === 'merchant' &&
                  'Purchases made through affiliate links are fulfilled by the respective merchant. We are not responsible for customer service, shipping, or returns.'}
                {section.id === 'faq' &&
                  'For questions about our affiliate relationships, please contact us through our contact page.'}
              </p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

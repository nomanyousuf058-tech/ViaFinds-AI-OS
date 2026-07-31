import { Metadata } from 'next';
import Breadcrumbs from '@/components/Breadcrumbs';
import AffiliateSection from '@/components/AffiliateSection';

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
  { id: 'amazon', title: 'Amazon Associates Disclosure' },
  { id: 'networks', title: 'Affiliate Networks' },
  { id: 'transparency', title: 'Commission Transparency' },
  { id: 'sponsored', title: 'Sponsored Content Policy' },
  { id: 'honest-reviews', title: 'Honest Reviews Policy' },
  { id: 'independence', title: 'Editorial Independence' },
  { id: 'pricing', title: 'Product Pricing Disclaimer' },
  { id: 'merchant-disclaimer', title: 'External Merchant Disclaimer' },
  { id: 'faq', title: 'FAQ' },
];

const STATIC_LAST_UPDATED = 'August 1, 2026';

export default function AffiliateDisclosurePage() {
  const lastUpdated = STATIC_LAST_UPDATED;

  return (
    <main className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen py-8">
      <div className="container mx-auto px-4 md:px-8 lg:px-12">
        <Breadcrumbs
          items={[
            { name: 'Home', slug: '' },
            { name: 'Affiliate Disclosure', slug: 'affiliate-disclosure' },
          ]}
        />
        <h1 className="text-3xl font-bold mt-4 mb-2">Affiliate Disclosure</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Last Updated: {lastUpdated}</p>
        
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          '@id': 'https://viafinds.com/affiliate-disclosure',
          url: 'https://viafinds.com/affiliate-disclosure',
          name: 'Affiliate Disclosure | ViaFinds',
          description: 'Read ViaFinds Affiliate Disclosure to understand how we earn commissions and maintain our editorial independence.',
        }) }} />
        
        <div className="prose dark:prose-invert max-w-none mt-8 space-y-12">
          {sections.map((section) => (
            <AffiliateSection key={section.id} id={section.id} title={section.title} />
          ))}
        </div>
      </div>
    </main>
  );
}

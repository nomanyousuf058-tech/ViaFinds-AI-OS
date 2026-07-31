import { Metadata } from 'next';
import Breadcrumbs from '@/components/Breadcrumbs';
import TermsSection from '@/components/TermsSection';

export const metadata: Metadata = {
  title: 'Terms of Service | ViaFinds',
  description: 'Read ViaFinds Terms of Service outlining website usage, intellectual property, and user responsibilities.',
  alternates: {
    canonical: 'https://viafinds.com/terms-of-service',
  },
  openGraph: {
    title: 'Terms of Service | ViaFinds',
    description: 'Read ViaFinds Terms of Service outlining website usage, intellectual property, and user responsibilities.',
    url: 'https://viafinds.com/terms-of-service',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Terms of Service | ViaFinds',
    description: 'Read ViaFinds Terms of Service outlining website usage, intellectual property, and user responsibilities.',
  },
};

const sections = [
  { id: 'acceptance', title: 'Acceptance of Terms' },
  { id: 'eligibility', title: 'Eligibility' },
  { id: 'website-usage', title: 'Website Usage' },
  { id: 'intellectual-property', title: 'Intellectual Property' },
  { id: 'affiliate-disclaimer', title: 'Affiliate Disclaimer' },
  { id: 'product-disclaimer', title: 'Product Information Disclaimer' },
  { id: 'ai-disclaimer', title: 'AI Generated Content Disclaimer' },
  { id: 'external-links', title: 'External Links' },
  { id: 'user-responsibilities', title: 'User Responsibilities' },
  { id: 'limitation-liability', title: 'Limitation of Liability' },
  { id: 'indemnification', title: 'Indemnification' },
  { id: 'governing-law', title: 'Governing Law' },
  { id: 'changes', title: 'Changes to Terms' },
  { id: 'contact', title: 'Contact Information' },
  { id: 'faq', title: 'FAQ' },
];

const STATIC_LAST_UPDATED = 'August 1, 2026';

export default function TermsOfServicePage() {
  const lastUpdated = STATIC_LAST_UPDATED;

  return (
    <main className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen py-8">
      <div className="container mx-auto px-4 md:px-8 lg:px-12">
        <Breadcrumbs
          items={[
            { name: 'Home', slug: '' },
            { name: 'Terms of Service', slug: 'terms-of-service' },
          ]}
        />
        <h1 className="text-3xl font-bold mt-4 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Last Updated: {lastUpdated}</p>
        
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          '@id': 'https://viafinds.com/terms-of-service',
          url: 'https://viafinds.com/terms-of-service',
          name: 'Terms of Service | ViaFinds',
          description: 'Read ViaFinds Terms of Service outlining website usage, intellectual property, and user responsibilities.',
        }) }} />
        
        <div className="prose dark:prose-invert max-w-none mt-8 space-y-12">
          {sections.map((section) => (
            <TermsSection key={section.id} id={section.id} title={section.title} />
          ))}
        </div>
      </div>
    </main>
  );
}

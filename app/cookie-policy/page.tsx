import { Metadata } from 'next';
import CookieSection from '@/components/CookieSection';

export const metadata: Metadata = {
  title: 'Cookie Policy | ViaFinds',
  description: 'Read ViaFinds Cookie Policy to learn how we use cookies and how you can manage your preferences.',
  alternates: {
    canonical: 'https://viafinds.com/cookie-policy',
  },
  openGraph: {
    title: 'Cookie Policy | ViaFinds',
    description: 'Read ViaFinds Cookie Policy to learn how we use cookies and how you can manage your preferences.',
    url: 'https://viafinds.com/cookie-policy',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cookie Policy | ViaFinds',
    description: 'Read ViaFinds Cookie Policy to learn how we use cookies and how you can manage your preferences.',
  },
};

const sections = [
  { id: 'what-are-cookies', title: 'What Cookies Are' },
  { id: 'essential', title: 'Essential Cookies' },
  { id: 'analytics', title: 'Analytics Cookies' },
  { id: 'advertising', title: 'Advertising Cookies' },
  { id: 'affiliate-tracking', title: 'Affiliate Tracking Cookies' },
  { id: 'pinterest', title: 'Pinterest Cookies' },
  { id: 'google', title: 'Google Cookies' },
  { id: 'managing', title: 'Managing Cookies' },
  { id: 'browser-settings', title: 'Browser Settings' },
  { id: 'third-party', title: 'Third Party Cookies' },
  { id: 'faq', title: 'FAQ' },
];

const STATIC_LAST_UPDATED = 'August 1, 2026';

export default function CookiePolicyPage() {
  const lastUpdated = STATIC_LAST_UPDATED;

  return (
    <main className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen py-8">
      <div className="container mx-auto px-4 md:px-8 lg:px-12">
        <h1 className="text-3xl font-bold mt-4 mb-2">Cookie Policy</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Last Updated: {lastUpdated}</p>
        
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          '@id': 'https://viafinds.com/cookie-policy',
          url: 'https://viafinds.com/cookie-policy',
          name: 'Cookie Policy | ViaFinds',
          description: 'Read ViaFinds Cookie Policy to learn how we use cookies and how you can manage your preferences.',
        }) }} />
        
        <div className="prose dark:prose-invert max-w-none mt-8 space-y-12">
          {sections.map((section) => (
            <CookieSection key={section.id} id={section.id} title={section.title} />
          ))}
        </div>
      </div>
    </main>
  );
}

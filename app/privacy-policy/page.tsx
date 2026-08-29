import { Metadata } from 'next';
import PrivacySection from '@/components/PrivacySection';

export const metadata: Metadata = {
  title: 'Privacy Policy | ViaFinds',
  description: "Read ViaFinds' privacy policy outlining data collection, usage, and your rights.",
  alternates: {
    canonical: 'https://viafinds.com/privacy-policy',
  },
  openGraph: {
    title: 'Privacy Policy | ViaFinds',
    description: "Read ViaFinds' privacy policy outlining data collection, usage, and your rights.",
    url: 'https://viafinds.com/privacy-policy',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Privacy Policy | ViaFinds',
    description: "Read ViaFinds' privacy policy outlining data collection, usage, and your rights.",
  },
};

const sections = [
  { id: 'introduction', title: 'Introduction' },
  { id: 'info-we-collect', title: 'Information We Collect' },
  { id: 'info-you-provide', title: 'Information You Provide' },
  { id: 'info-auto', title: 'Information Collected Automatically' },
  { id: 'cookies', title: 'Cookies and Similar Technologies' },
  { id: 'google-analytics', title: 'Google Analytics' },
  { id: 'google-search-console', title: 'Google Search Console' },
  { id: 'advertising', title: 'Advertising Services' },
  { id: 'affiliate', title: 'Affiliate Links and Affiliate Programs' },
  { id: 'pinterest', title: 'Pinterest Integration' },
  { id: 'third-party', title: 'Third‑Party Services' },
  { id: 'ai-services', title: 'AI Services' },
  { id: 'how-we-use', title: 'How We Use Information' },
  { id: 'legal-basis', title: 'Legal Basis for Processing (GDPR)' },
  { id: 'data-retention', title: 'Data Retention' },
  { id: 'data-security', title: 'Data Security' },
  { id: 'children-privacy', title: "Children's Privacy" },
  { id: 'international', title: 'International Data Transfers' },
  { id: 'your-rights', title: 'Your Privacy Rights' },
  { id: 'managing-cookies', title: 'Managing Cookies' },
  { id: 'external-links', title: 'External Links' },
  { id: 'changes', title: 'Changes to This Privacy Policy' },
  { id: 'contact', title: 'Contact Information' },
  { id: 'faq', title: 'FAQ' },
];
const STATIC_LAST_UPDATED = 'August 1, 2026';
export default function PrivacyPolicyPage() {
  const lastUpdated = STATIC_LAST_UPDATED;

  return (
    <main className="w-full flex flex-col bg-background text-on-background font-ui-body antialiased min-h-screen py-8">
      <div className="container mx-auto px-4 md:px-8 lg:px-12">
        <h1 className="text-3xl font-bold mt-4 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Last Updated: {lastUpdated}</p>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': 'https://viafinds.com/privacy-policy',
        url: 'https://viafinds.com/privacy-policy',
        name: 'Privacy Policy | ViaFinds',
        description: "Read ViaFinds' privacy policy outlining data collection, usage, and your rights.",
      }) }} />
        <div className="prose dark:prose-invert max-w-none mt-8 space-y-12">
          {sections.map((section) => (
            <PrivacySection key={section.id} id={section.id} title={section.title} />
          ))}
        </div>
      </div>
    </main>
  );
}

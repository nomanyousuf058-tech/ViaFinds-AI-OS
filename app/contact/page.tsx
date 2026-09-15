import { Metadata } from 'next';
import Link from 'next/link';
import ContactForm from '@/components/ContactForm';

export const metadata: Metadata = {
  title: 'Contact Us | ViaFinds',
  description: 'Get in touch with the ViaFinds team for support, partnerships, or general inquiries.',
  alternates: {
    canonical: 'https://viafinds.com/contact',
  },
  openGraph: {
    title: 'Contact Us | ViaFinds',
    description: 'Get in touch with the ViaFinds team for support, partnerships, or general inquiries.',
    url: 'https://viafinds.com/contact',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Us | ViaFinds',
    description: 'Get in touch with the ViaFinds team for support, partnerships, or general inquiries.',
  },
};

export default function ContactPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact Us | ViaFinds',
    description: 'Get in touch with the ViaFinds team for support, partnerships, or general inquiries.',
    url: 'https://viafinds.com/contact',
    mainEntity: {
      '@type': 'Organization',
      name: 'ViaFinds',
      url: 'https://viafinds.com',
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'viafinds77@gmail.com',
        contactType: 'customer support',
      },
    },
  };

  return (
    <main className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero Section */}
      <section className="bg-surface-container-low py-16 md:py-24 px-4 text-center border-b border-outline-variant/20">
        <h1 className="font-display text-4xl md:text-5xl font-bold uppercase tracking-tighter text-primary mb-4">
          Contact <span className="text-gold-accent">Us</span>
        </h1>
        <p className="font-body text-secondary max-w-2xl mx-auto">
          Whether you have a question, partnership proposal, or just want to say hello, our team is ready to listen.
        </p>
      </section>

      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Left Column: Form */}
        <ContactForm />

        {/* Right Column: Info & Map */}
        <div className="space-y-12">
          {/* Contact Info */}
          <div className="bg-surface-container-low p-8 border border-outline-variant/20 luxury-shadow">
            <h3 className="font-display text-xl font-bold text-primary mb-6">Contact Information</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-4">
                <span className="material-symbols-outlined text-gold-accent mt-0.5" aria-hidden="true">mail</span>
                <div>
                  <strong className="block font-body text-sm text-primary uppercase tracking-wide">Email</strong>
                  <a href="mailto:viafinds77@gmail.com" className="font-body text-secondary hover:text-gold-accent transition-colors">viafinds77@gmail.com</a>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="material-symbols-outlined text-gold-accent mt-0.5" aria-hidden="true">schedule</span>
                <div>
                  <strong className="block font-body text-sm text-primary uppercase tracking-wide">Business Hours</strong>
                  <span className="font-body text-secondary">Monday – Friday, 9am – 5pm EST</span>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="material-symbols-outlined text-gold-accent mt-0.5" aria-hidden="true">bolt</span>
                <div>
                  <strong className="block font-body text-sm text-primary uppercase tracking-wide">Response Time</strong>
                  <span className="font-body text-secondary">Typically within 24–48 hours</span>
                </div>
              </li>
            </ul>
          </div>


        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-surface-container py-16 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-primary mb-8 text-center">Frequently Asked Questions</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 border border-outline-variant/10">
              <dt className="font-body font-bold text-lg text-primary mb-2">Do you accept guest posts?</dt>
              <dd className="text-secondary font-body text-sm">We currently do not accept unsolicited guest posts. All our content is produced by our in-house editorial team to maintain strict quality standards.</dd>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 border border-outline-variant/10">
              <dt className="font-body font-bold text-lg text-primary mb-2">How can I partner with ViaFinds?</dt>
              <dd className="text-secondary font-body text-sm">Please use the contact form above and select &quot;Partnership / PR&quot; as the subject. Include details about your brand and how you envision a collaboration.</dd>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 border border-outline-variant/10">
              <dt className="font-body font-bold text-lg text-primary mb-2">Can I request a product review?</dt>
              <dd className="text-secondary font-body text-sm">Yes! We love hearing from our community. Send us a message with your request, and we&apos;ll add it to our editorial consideration list.</dd>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 border border-outline-variant/10">
              <dt className="font-body font-bold text-lg text-primary mb-2">What if I have an issue with a product?</dt>
              <dd className="text-secondary font-body text-sm">Because we are a curation platform and do not sell products directly, you will need to contact the retailer where you made the purchase for returns or support.</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 text-center">
        <h2 className="font-display text-2xl font-bold text-primary mb-4">Looking for something specific?</h2>
        <p className="font-body text-secondary mb-6 max-w-lg mx-auto">Browse our curated collections to find the products you need.</p>
        <Link href="/search" className="inline-flex items-center gap-2 bg-primary text-white font-body font-bold uppercase tracking-widest px-8 py-4 hover:bg-gold-accent transition-colors">
          Explore Products
          <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </Link>
      </section>
    </main>
  );
}

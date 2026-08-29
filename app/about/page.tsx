import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Us | ViaFinds',
  description: 'Discover the story behind ViaFinds, our mission, vision, and the core values that drive our expert curation.',
  alternates: {
    canonical: 'https://viafinds.com/about',
  },
  openGraph: {
    title: 'About Us | ViaFinds',
    description: 'Discover the story behind ViaFinds, our mission, vision, and the core values that drive our expert curation.',
    url: 'https://viafinds.com/about',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Us | ViaFinds',
    description: 'Discover the story behind ViaFinds, our mission, vision, and the core values that drive our expert curation.',
  },
};

export default function AboutPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About Us | ViaFinds',
    description: 'Discover the story behind ViaFinds, our mission, vision, and the core values that drive our expert curation.',
    url: 'https://viafinds.com/about',
    mainEntity: {
      '@type': 'Organization',
      name: 'ViaFinds',
      url: 'https://viafinds.com',
    }
  };

  return (
    <main className="w-full flex flex-col bg-background text-on-background font-ui-body antialiased min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      
      {/* Hero Section */}
      <section className="relative bg-surface-container-low dark:bg-gray-800 py-24 md:py-32 overflow-hidden flex flex-col items-center text-center px-4">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold-accent via-transparent to-transparent blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <span className="material-symbols-outlined text-gold-accent text-5xl mb-6 font-light">
            explore
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-bold uppercase tracking-tighter text-primary mb-6">
            Discovery <span className="text-gold-accent">Defined.</span>
          </h1>
          <p className="font-body text-lg md:text-xl text-secondary max-w-2xl mx-auto leading-relaxed">
            We cut through the noise of the modern internet to bring you expertly curated software, collectibles, and luxury essentials. Quality over quantity, always.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 px-4 md:px-8 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24 items-start">
        <div>
          <h2 className="font-display text-3xl font-bold text-primary mb-6">Our Mission</h2>
          <p className="font-body text-secondary leading-relaxed mb-6">
            To empower discerning buyers by providing deeply researched, uncompromisingly honest reviews and recommendations. We believe that finding the right product shouldn&apos;t feel like a chore; it should be an experience of discovery.
          </p>
        </div>
        <div>
          <h2 className="font-display text-3xl font-bold text-primary mb-6">Our Vision</h2>
          <p className="font-body text-secondary leading-relaxed mb-6">
            To become the most trusted digital curator for individuals who value precision, design, and longevity in the products they choose to invite into their lives.
          </p>
        </div>
      </section>

      {/* Our Story & Why We Exist */}
      <section className="bg-surface-container py-20 px-4 md:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-3xl font-bold text-primary mb-6">Our Story</h2>
          <p className="font-body text-secondary leading-relaxed mb-8">
            ViaFinds was born out of frustration with the modern web. Every search query yielded hundreds of low-effort affiliate sites, fake reviews, and SEO spam. Finding genuine recommendations had become nearly impossible. We decided to build the antidote: a curation platform built on transparency, deep research, and a commitment to recommending only what truly stands out.
          </p>
        </div>
      </section>

      {/* Trust & Accuracy / Methodology */}
      <section className="py-20 px-4 md:px-8 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl font-bold text-primary mb-4">How We Select Products</h2>
          <p className="font-body text-secondary max-w-2xl mx-auto">
            Our curation process is rigorous and multi-faceted, combining human expertise with advanced research methods.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-surface-container p-8 border border-outline-variant/20 luxury-shadow flex flex-col items-center text-center">
            <span className="material-symbols-outlined text-gold-accent text-4xl mb-4">verified_user</span>
            <h3 className="font-display text-xl font-bold text-primary mb-3">Independent Research</h3>
            <p className="font-body text-sm text-secondary leading-relaxed">
              Every item is evaluated based on its merits, durability, and user feedback across multiple platforms.
            </p>
          </div>
          <div className="bg-surface-container p-8 border border-outline-variant/20 luxury-shadow flex flex-col items-center text-center">
            <span className="material-symbols-outlined text-gold-accent text-4xl mb-4">smart_toy</span>
            <h3 className="font-display text-xl font-bold text-primary mb-3">AI-Assisted Analysis</h3>
            <p className="font-body text-sm text-secondary leading-relaxed">
              We leverage advanced AI to aggregate thousands of data points, ensuring we don&apos;t miss subtle patterns in product performance.
            </p>
          </div>
          <div className="bg-surface-container p-8 border border-outline-variant/20 luxury-shadow flex flex-col items-center text-center">
            <span className="material-symbols-outlined text-gold-accent text-4xl mb-4">handshake</span>
            <h3 className="font-display text-xl font-bold text-primary mb-3">Affiliate Transparency</h3>
            <p className="font-body text-sm text-secondary leading-relaxed">
              While we earn commissions on some links, our editorial choices are never influenced by affiliate partnerships. Trust is our true currency.
            </p>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="bg-surface-container text-on-background py-20 px-4 md:px-8 border-y border-slate-border">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="font-display text-3xl font-bold text-gold-accent mb-12">Our Core Values</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <h4 className="font-body font-bold text-lg mb-2 uppercase tracking-widest">Precision</h4>
              <p className="text-on-surface-variant text-sm">Exactness in our reviews, data, and recommendations.</p>
            </div>
            <div>
              <h4 className="font-body font-bold text-lg mb-2 uppercase tracking-widest">Integrity</h4>
              <p className="text-on-surface-variant text-sm">Honesty in every interaction and disclosure.</p>
            </div>
            <div>
              <h4 className="font-body font-bold text-lg mb-2 uppercase tracking-widest">Aesthetics</h4>
              <p className="text-on-surface-variant text-sm">An appreciation for beautiful design and form.</p>
            </div>
            <div>
              <h4 className="font-body font-bold text-lg mb-2 uppercase tracking-widest">Utility</h4>
              <p className="text-on-surface-variant text-sm">A focus on function, longevity, and true value.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 md:px-8 max-w-4xl mx-auto">
        <h2 className="font-display text-3xl font-bold text-primary mb-8 text-center">Frequently Asked Questions</h2>
        <dl className="space-y-6">
          <div className="border-b border-surface-container pb-6">
            <dt className="font-body font-bold text-lg text-primary mb-2">How does ViaFinds make money?</dt>
            <dd className="text-secondary font-body">
              We participate in affiliate programs. If you purchase through our links, we may earn a commission at no extra cost to you. Read our <Link href="/affiliate-disclosure" className="text-gold-accent hover:underline">Affiliate Disclosure</Link> for full details.
            </dd>
          </div>
          <div className="border-b border-surface-container pb-6">
            <dt className="font-body font-bold text-lg text-primary mb-2">Are your reviews influenced by brands?</dt>
            <dd className="text-secondary font-body">
              Never. Our editorial independence is paramount. We do not accept payment in exchange for positive reviews.
            </dd>
          </div>
          <div className="border-b border-surface-container pb-6">
            <dt className="font-body font-bold text-lg text-primary mb-2">How do you use AI?</dt>
            <dd className="text-secondary font-body">
              We use AI to aggregate data, analyze sentiment across thousands of user reviews, and structure our research. However, final editorial decisions and curation are always handled by our human experts.
            </dd>
          </div>
        </dl>
      </section>

      {/* CTA */}
      <section className="bg-surface-container-low py-20 px-4 text-center">
        <h2 className="font-display text-3xl font-bold text-primary mb-6">Ready to Discover?</h2>
        <p className="font-body text-secondary mb-8 max-w-xl mx-auto">
          Explore our latest curated collections and find the precise gear and software you&apos;ve been looking for.
        </p>
        <Link href="/search" className="inline-flex items-center gap-2 bg-primary text-white font-body font-bold uppercase tracking-widest px-8 py-4 hover:bg-gold-accent transition-colors">
          Start Exploring
          <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </Link>
      </section>
    </main>
  );
}

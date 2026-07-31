// components/PrivacySection.tsx
import React from 'react';

type PrivacySectionProps = {
  id: string;
  title: string;
};

/**
 * Renders the full content for a given privacy‑policy section.
 * The content is written directly in this component to keep the
 * implementation self‑contained and to avoid having to create a
 * large number of separate files. Each case returns semantic HTML
 * that follows WCAG contrast guidelines and uses the project's
 * typography utilities (via Tailwind classes).
 */
export default function PrivacySection({ id, title }: PrivacySectionProps) {
  const renderContent = () => {
    switch (id) {
      case 'introduction':
        return (
          <>
            <p className="mb-4">
              At ViaFinds ("we", "us", or "our"), we respect your privacy and are
              committed to protecting the personal information you share with us.
              This Privacy Policy explains what information we collect, how we use
              it, and your rights regarding that data.
            </p>
            <p className="mb-4">
              By accessing or using https://viafinds.com (the "Site"), you agree to
              the practices described in this policy.
            </p>
          </>
        );
      case 'info-we-collect':
        return (
          <>
            <p className="mb-4">
              We collect information that you provide directly, information that
              is collected automatically when you browse the Site, and
              information from third‑party services.
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Personal identifiers (e.g., name, email address).</li>
              <li>Device and usage data (IP address, browser type, operating
                system, referral URLs).</li>
              <li>Interaction data (pages viewed, links clicked, search terms).
              </li>
            </ul>
          </>
        );
      case 'info-you-provide':
        return (
          <>
            <p className="mb-4">
              When you contact us, subscribe to newsletters, or submit a
              comment, you voluntarily provide personal information such as your
              name and email address. This information is used solely for the
              purpose you provided it for (e.g., responding to your inquiry).
            </p>
          </>
        );
      case 'info-auto':
        return (
          <>
            <p className="mb-4">
              Automatically collected information includes:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Cookies and similar tracking technologies (see the Cookies
                section).</li>
              <li>Analytics data from Google Analytics, Search Console, and
                other services.</li>
            </ul>
          </>
        );
      case 'cookies':
        return (
          <>
            <p className="mb-4">
              We use both session and persistent cookies to enhance your
              experience, analyse traffic, and serve personalized content. You can
              manage cookies through your browser settings.
            </p>
            <p className="mb-4 font-semibold">Types of cookies we use:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Essential cookies – required for core site functionality.</li>
              <li>Performance cookies – help us understand how visitors use the
                Site.</li>
              <li>Targeting cookies – used for personalized advertising via
                Google AdSense and affiliate networks.</li>
            </ul>
          </>
        );
      case 'google-analytics':
        return (
          <>
            <p className="mb-4">
              Google Analytics collects anonymised data such as page views,
              session duration, and referral sources. This information helps us
              improve the Site and understand user interests.
            </p>
            <p className="mb-4">
              You may opt‑out of Google Analytics tracking by installing the
              Google Analytics Opt‑Out Browser Add‑on.
            </p>
          </>
        );
      case 'google-search-console':
        return (
          <>
            <p className="mb-4">
              Google Search Console provides us with aggregated data about how
              the Site appears in Google Search results. No personally identifying
              information is transmitted.
            </p>
          </>
        );
      case 'advertising':
        return (
          <>
            <p className="mb-4">
              We display advertising through Google AdSense and other third‑
              party networks. These services may place cookies, use web beacons,
              and collect device identifiers to deliver relevant ads.
            </p>
          </>
        );
      case 'affiliate':
        return (
          <>
            <p className="mb-4">
              ViaFinds participates in affiliate programmes. When you click an
              affiliate link, we may receive a commission at no extra cost to you.
              Affiliate partners may set cookies to track referrals.
            </p>
          </>
        );
      case 'pinterest':
        return (
          <>
            <p className="mb-4">
              We embed Pinterest widgets to showcase product images. Pinterest may
              collect information about your interaction with those widgets.
            </p>
          </>
        );
      case 'third-party':
        return (
          <>
            <p className="mb-4">
              We may share aggregated, non‑identifiable data with third‑party
              service providers for analytics, advertising, and content delivery.
            </p>
          </>
        );
      case 'ai-tools':
        return (
          <>
            <p className="mb-4">
              Some content on the Site is generated by AI services. These tools
              may process your input (e.g., search queries) to produce responses.
              No personal data is stored beyond the immediate session.
            </p>
          </>
        );
      case 'how-we-use':
        return (
          <>
            <p className="mb-4">
              We use the collected information to:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Provide, maintain, and improve the Site.</li>
              <li>Respond to user inquiries and provide support.</li>
              <li>Personalise content, offers, and advertising.</li>
              <li>Analyse usage trends and perform statistical research.</li>
              <li>Comply with legal obligations.</li>
            </ul>
          </>
        );
      case 'legal-basis':
        return (
          <>
            <p className="mb-4">
              If you are located in the European Economic Area (EEA), we rely
              on the following lawful bases under the GDPR:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Consent – where you have given us explicit permission.</li>
              <li>Legitimate interests – for the direct marketing and analytics
                purposes that are necessary for our business.
              </li>
              <li>Performance of a contract – when you interact with us via the
                Site.
              </li>
            </ul>
          </>
        );
      case 'data-retention':
        return (
          <>
            <p className="mb-4">
              Personal data is retained only as long as necessary to fulfil the
              purposes described in this policy, unless a longer retention period
              is required by law.
            </p>
          </>
        );
      case 'data-security':
        return (
          <>
            <p className="mb-4">
              We implement reasonable technical and organisational measures to
              protect your information from unauthorised access, alteration, or
              disclosure. However, no method of transmission over the internet is
              100 % secure.
            </p>
          </>
        );
      case 'children-privacy':
        return (
          <>
            <p className="mb-4">
              Our Site is not intended for children under 13 years of age, and
              we do not knowingly collect personal information from children.
            </p>
          </>
        );
      case 'international':
        return (
          <>
            <p className="mb-4">
              We may transfer your data to jurisdictions outside your country
              that may have different data‑protection laws. Where required, we
              ensure appropriate safeguards such as Standard Contractual Clauses.
            </p>
          </>
        );
      case 'your-rights':
        return (
          <>
            <p className="mb-4">
              Depending on your location, you have rights to:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Access the personal data we hold about you.</li>
              <li>Correct inaccurate or incomplete data.</li>
              <li>Delete your data (right to be forgotten).</li>
              <li>Object to or restrict processing.</li>
              <li>Data portability.</li>
              <li>Withdraw consent at any time.</li>
            </ul>
            <p className="mb-4">
              To exercise these rights, please contact us at
              support@viafinds.com.
            </p>
          </>
        );
      case 'managing-cookies':
        return (
          <>
            <p className="mb-4">
              You can manage cookies via your browser settings. Most browsers
              allow you to reject all cookies or to receive a warning before a
              cookie is set.
            </p>
          </>
        );
      case 'external-links':
        return (
          <>
            <p className="mb-4">
              Our Site may contain links to external sites. We are not responsible
              for the privacy practices of those websites. We encourage you to
              review the privacy policies of any third‑party sites you visit.
            </p>
          </>
        );
      case 'changes':
        return (
          <>
            <p className="mb-4">
              We may update this Privacy Policy from time to time. Changes will
              be posted on this page with an updated "Last Updated" date.
            </p>
          </>
        );
      case 'contact':
        return (
          <>
            <p className="mb-4">
              If you have any questions or concerns about this Privacy Policy,
              please contact us at:
            </p>
            <address className="not-italic">
              ViaFinds<br />
              support@viafinds.com
            </address>
          </>
        );
      case 'faq':
        return (
          <>
            <h3 className="text-xl font-semibold mb-3">Frequently Asked Questions</h3>
            <dl className="space-y-4">
              <div>
                <dt className="font-medium">What cookies does ViaFinds use?</dt>
                <dd className="ml-4 text-gray-700 dark:text-gray-300">
                  We use essential, performance, and targeting cookies as described
                  in the Cookies section.
                </dd>
              </div>
              <div>
                <dt className="font-medium">Do you earn commissions from affiliate links?</dt>
                <dd className="ml-4 text-gray-700 dark:text-gray-300">
                  Yes. Affiliate links may generate a commission at no extra cost to
                  you. The affiliate partner may set a tracking cookie.
                </dd>
              </div>
              <div>
                <dt className="font-medium">How does Google Analytics collect data?</dt>
                <dd className="ml-4 text-gray-700 dark:text-gray-300">
                  Google Analytics records anonymised usage data such as page views
                  and referral sources. No personal identifiers are stored.
                </dd>
              </div>
              <div>
                <dt className="font-medium">Can I opt out of Google AdSense ads?</dt>
                <dd className="ml-4 text-gray-700 dark:text-gray-300">
                  Yes. You can use the Google Ad Settings page to personalise or
                  disable interest‑based ads.
                </dd>
              </div>
              <div>
                <dt className="font-medium">Does ViaFinds use Pinterest?</dt>
                <dd className="ml-4 text-gray-700 dark:text-gray-300">
                  We embed Pinterest widgets for visual content. Pinterest may
                  collect information about your interaction with those widgets.
                </dd>
              </div>
              <div>
                <dt className="font-medium">Is any content generated by AI?</dt>
                <dd className="ml-4 text-gray-700 dark:text-gray-300">
                  Some article summaries and product recommendations are produced
                  with AI tools. These tools process your input only for the
                  duration of the request and do not retain personal data.
                </dd>
              </div>
              <div>
                <dt className="font-medium">How do you protect my data?</dt>
                <dd className="ml-4 text-gray-700 dark:text-gray-300">
                  We use industry‑standard security measures such as TLS encryption
                  and secure server configurations.
                </dd>
              </div>
              <div>
                <dt className="font-medium">What are my privacy rights?</dt>
                <dd className="ml-4 text-gray-700 dark:text-gray-300">
                  You have the right to access, correct, delete, or restrict the
                  processing of your personal data. Contact us at
                  support@viafinds.com to exercise these rights.
                </dd>
              </div>
              <div>
                <dt className="font-medium">How can I contact ViaFinds about privacy?</dt>
                <dd className="ml-4 text-gray-700 dark:text-gray-300">
                  Email us at support@viafinds.com.
                </dd>
              </div>
            </dl>
          </>
        );
      default:
        return (
          <p className="text-gray-700 dark:text-gray-300">Content not available.</p>
        );
    }
  };

  return (
    <section id={id} className="mt-12 scroll-mt-24">
      <h2 className="text-2xl font-semibold mb-4">{title}</h2>
      {renderContent()}
    </section>
  );
}

import React from 'react';

type CookieSectionProps = {
  id: string;
  title: string;
};

export default function CookieSection({ id, title }: CookieSectionProps) {
  const renderContent = () => {
    switch (id) {
      case 'what-are-cookies':
        return (
          <>
            <p className="mb-4">
              Cookies are small text files that are placed on your computer, smartphone, or other device when you visit our website. They are widely used to make websites work, or work more efficiently, as well as to provide reporting information and assist with service or advertising personalization.
            </p>
          </>
        );
      case 'essential':
        return (
          <>
            <p className="mb-4">
              Essential cookies are strictly necessary to provide you with services available through our Site and to use some of its features. Without these cookies, the services that you have asked for cannot be provided, and we only use these cookies to provide you with those services.
            </p>
          </>
        );
      case 'analytics':
        return (
          <>
            <p className="mb-4">
              Analytics cookies collect information that is used either in aggregate form to help us understand how our Site is being used or how effective our marketing campaigns are, or to help us customize our Site and application for you in order to enhance your experience.
            </p>
          </>
        );
      case 'advertising':
        return (
          <>
            <p className="mb-4">
              These cookies are used to make advertising messages more relevant to you. They perform functions like preventing the same ad from continuously reappearing, ensuring that ads are properly displayed for advertisers, and in some cases selecting advertisements that are based on your interests.
            </p>
          </>
        );
      case 'affiliate-tracking':
        return (
          <>
            <p className="mb-4">
              When you click on an affiliate link on ViaFinds, a cookie is placed on your browser to track any resulting purchases. This ensures that the merchant knows you were referred by our Site, allowing us to earn our commission. These cookies do not store personally identifiable information.
            </p>
          </>
        );
      case 'pinterest':
        return (
          <>
            <p className="mb-4">
              We may use Pinterest widgets and tags on our Site. Pinterest may use cookies, web beacons, and similar technologies to collect or receive information from our website and elsewhere on the internet and use that information to provide measurement services and target ads.
            </p>
          </>
        );
      case 'google':
        return (
          <>
            <p className="mb-4">
              We use Google Analytics and Google AdSense. Google uses cookies to serve ads based on your prior visits to our Site or other websites. Google's use of advertising cookies enables it and its partners to serve ads to you based on your visit to our Site and/or other sites on the Internet.
            </p>
          </>
        );
      case 'managing':
        return (
          <>
            <p className="mb-4">
              You have the right to decide whether to accept or reject cookies. You can exercise your cookie preferences by clicking on the appropriate opt-out links provided in this policy, or by setting or amending your web browser controls to accept or refuse cookies.
            </p>
          </>
        );
      case 'browser-settings':
        return (
          <>
            <p className="mb-4">
              As the means by which you can refuse cookies through your web browser controls vary from browser to browser, you should visit your browser's help menu for more information.
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Chrome:</strong> Settings &gt; Privacy and security &gt; Cookies and other site data</li>
              <li><strong>Safari:</strong> Preferences &gt; Privacy &gt; Block all cookies</li>
              <li><strong>Firefox:</strong> Options &gt; Privacy &amp; Security &gt; Cookies and Site Data</li>
              <li><strong>Edge:</strong> Settings &gt; Site permissions &gt; Cookies and site data</li>
            </ul>
          </>
        );
      case 'third-party':
        return (
          <>
            <p className="mb-4">
              In some special cases, we also use cookies provided by trusted third parties. Third-party analytics are used to track and measure usage of this Site so that we can continue to produce engaging content. These cookies may track things such as how long you spend on the site or pages you visit, which helps us to understand how we can improve the Site for you.
            </p>
          </>
        );
      case 'faq':
        return (
          <>
            <h3 className="text-xl font-semibold mb-3">Frequently Asked Questions</h3>
            <dl className="space-y-4">
              <div>
                <dt className="font-medium">Can I use ViaFinds if I disable all cookies?</dt>
                <dd className="ml-4 text-gray-700 dark:text-gray-300">
                  Yes, you can still browse the site, but some features may not function optimally without essential cookies.
                </dd>
              </div>
              <div>
                <dt className="font-medium">Do affiliate tracking cookies store my personal data?</dt>
                <dd className="ml-4 text-gray-700 dark:text-gray-300">
                  No, affiliate cookies generally only store an anonymous identifier to attribute the referral to ViaFinds.
                </dd>
              </div>
              <div>
                <dt className="font-medium">How long do cookies stay on my device?</dt>
                <dd className="ml-4 text-gray-700 dark:text-gray-300">
                  Session cookies are deleted when you close your browser. Persistent cookies (like affiliate tracking) remain for a set period, typically between 24 hours and 90 days, depending on the merchant.
                </dd>
              </div>
              <div>
                <dt className="font-medium">How do I opt-out of personalized ads?</dt>
                <dd className="ml-4 text-gray-700 dark:text-gray-300">
                  You can opt-out of personalized ads from Google by visiting Google Ad Settings.
                </dd>
              </div>
              <div>
                <dt className="font-medium">Are cookies dangerous?</dt>
                <dd className="ml-4 text-gray-700 dark:text-gray-300">
                  No. Cookies cannot be used to transmit viruses or run programs on your computer. They are simply text files.
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

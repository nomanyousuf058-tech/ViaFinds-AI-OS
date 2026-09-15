import React from 'react';

type TermsSectionProps = {
  id: string;
  title: string;
};

export default function TermsSection({ id, title }: TermsSectionProps) {
  const renderContent = () => {
    switch (id) {
      case 'acceptance':
        return (
          <>
            <p className="mb-4">
              By accessing and using ViaFinds (the &quot;Site&quot;), you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.
            </p>
            <p className="mb-4">
              Any participation in this service will constitute acceptance of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </>
        );
      case 'eligibility':
        return (
          <>
            <p className="mb-4">
              You must be at least 18 years of age to use our Site. By using the Site and agreeing to these terms, you warrant and represent that you are at least 18 years of age.
            </p>
          </>
        );
      case 'website-usage':
        return (
          <>
            <p className="mb-4">
              You agree to use the Site only for lawful purposes, and in a way that does not infringe the rights of, restrict or inhibit anyone else&apos;s use and enjoyment of the Site. Prohibited behavior includes harassing or causing distress or inconvenience to any other user, transmitting obscene or offensive content or disrupting the normal flow of dialogue within our Site.
            </p>
          </>
        );
      case 'intellectual-property':
        return (
          <>
            <p className="mb-4">
              The Site and its original content, features, and functionality are owned by ViaFinds and are protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
            </p>
          </>
        );
      case 'affiliate-disclaimer':
        return (
          <>
            <p className="mb-4">
              The Site contains links to affiliate websites, and we receive an affiliate commission for any purchases made by you on the affiliate website using such links. 
            </p>
          </>
        );
      case 'product-disclaimer':
        return (
          <>
            <p className="mb-4">
              The information provided by the Site regarding digital products, software, and online services is for general informational purposes only. We provide our honest feedback and research, but we make no representation or warranty of any kind regarding the completeness or accuracy of any information on the Site.
            </p>
          </>
        );
      case 'ai-disclaimer':
        return (
          <>
            <p className="mb-4">
              We leverage advanced tools to help gather data and structure our findings about digital products. While we review our content carefully, always verify critical product details independently before making a purchase.
            </p>
          </>
        );
      case 'external-links':
        return (
          <>
            <p className="mb-4">
              The Site may contain links to third-party web sites or services that are not owned or controlled by ViaFinds. ViaFinds has no control over, and assumes no responsibility for, the content, privacy policies, or practices of any third party web sites or services.
            </p>
          </>
        );
      case 'user-responsibilities':
        return (
          <>
            <p className="mb-4">
              As a user of the Site, you agree not to use the Site to:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Upload, post or otherwise transmit any content that is unlawful, harmful, threatening, abusive, harassing, tortious, defamatory, vulgar, obscene, libelous, invasive of another&apos;s privacy, hateful, or racially, ethnically or otherwise objectionable.</li>
              <li>Impersonate any person or entity.</li>
              <li>Upload, post or otherwise transmit any material that contains software viruses or any other computer code, files or programs designed to interrupt, destroy or limit the functionality of any computer software or hardware.</li>
            </ul>
          </>
        );
      case 'limitation-liability':
        return (
          <>
            <p className="mb-4">
              In no event shall ViaFinds, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Site.
            </p>
          </>
        );
      case 'indemnification':
        return (
          <>
            <p className="mb-4">
              You agree to defend, indemnify and hold harmless ViaFinds and its licensee and licensors, and their employees, contractors, agents, officers and directors, from and against any and all claims, damages, obligations, losses, liabilities, costs or debt, and expenses.
            </p>
          </>
        );
      case 'governing-law':
        return (
          <>
            <p className="mb-4">
              These Terms shall be governed and construed in accordance with the laws, without regard to its conflict of law provisions.
            </p>
          </>
        );
      case 'changes':
        return (
          <>
            <p className="mb-4">
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our Site after those revisions become effective, you agree to be bound by the revised terms.
            </p>
          </>
        );
      case 'contact':
        return (
          <>
            <p className="mb-4">
              If you have any questions about these Terms, please contact us at:
            </p>
            <address className="not-italic">
              ViaFinds<br />
              viafinds77@gmail.com
            </address>
          </>
        );
      case 'faq':
        return (
          <>
            <h3 className="text-xl font-semibold mb-3">Frequently Asked Questions</h3>
            <dl className="space-y-4">
              <div>
                <dt className="font-medium">Do I need an account to use ViaFinds?</dt>
                <dd className="ml-4 text-gray-700 dark:text-gray-300">
                  No, you can browse and access most features without creating an account.
                </dd>
              </div>
              <div>
                <dt className="font-medium">Are the product reviews unbiased?</dt>
                <dd className="ml-4 text-gray-700 dark:text-gray-300">
                  Yes, our reviews are independent. While we may earn affiliate commissions, it does not influence our editorial assessments.
                </dd>
              </div>
              <div>
                <dt className="font-medium">What happens if a product is out of stock?</dt>
                <dd className="ml-4 text-gray-700 dark:text-gray-300">
                  We link to third-party retailers. Availability is subject to the retailer&apos;s inventory and we do not guarantee product availability.
                </dd>
              </div>
              <div>
                <dt className="font-medium">Can I reuse content from ViaFinds?</dt>
                <dd className="ml-4 text-gray-700 dark:text-gray-300">
                  No, all content is protected by intellectual property laws. You may not reproduce our content without explicit permission.
                </dd>
              </div>
              <div>
                <dt className="font-medium">How often are the terms updated?</dt>
                <dd className="ml-4 text-gray-700 dark:text-gray-300">
                  We update these terms periodically to reflect legal or operational changes. The &quot;Last Updated&quot; date will reflect the most recent changes.
                </dd>
              </div>
              <div>
                <dt className="font-medium">Who is responsible for third-party links?</dt>
                <dd className="ml-4 text-gray-700 dark:text-gray-300">
                  We are not responsible for the content or practices of third-party websites linked on our Site.
                </dd>
              </div>
              <div>
                <dt className="font-medium">Does AI content replace professional advice?</dt>
                <dd className="ml-4 text-gray-700 dark:text-gray-300">
                  No. AI-generated content is for informational purposes and should not be considered professional or legal advice.
                </dd>
              </div>
              <div>
                <dt className="font-medium">How do I report a violation of these terms?</dt>
                <dd className="ml-4 text-gray-700 dark:text-gray-300">
                  Please contact us at viafinds77@gmail.com to report any suspected violations.
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

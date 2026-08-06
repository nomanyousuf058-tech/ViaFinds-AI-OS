import React from 'react';

type AffiliateSectionProps = {
  id: string;
  title: string;
};

export default function AffiliateSection({ id, title }: AffiliateSectionProps) {
  const renderContent = () => {
    switch (id) {
      case 'ftc':
        return (
          <>
            <p className="mb-4">
              In compliance with the Federal Trade Commission (FTC) guidelines, please assume that any and all links on ViaFinds are affiliate links. If you click on an affiliate link and make a purchase, we may receive a small commission. This does not result in any additional cost to you.
            </p>
          </>
        );
      case 'amazon':
        return (
          <>
            <p className="mb-4">
              ViaFinds is a participant in the Amazon Services LLC Associates Program, an affiliate advertising program designed to provide a means for sites to earn advertising fees by advertising and linking to Amazon.com. As an Amazon Associate, we earn from qualifying purchases.
            </p>
          </>
        );
      case 'networks':
        return (
          <>
            <p className="mb-4">
              We also partner with other affiliate networks and merchants. This means that when you click on links to various merchants on this site and make a purchase, this can result in a commission that is credited to ViaFinds.
            </p>
          </>
        );
      case 'transparency':
        return (
          <>
            <p className="mb-4">
              Our goal is to provide you with the best possible recommendations for products and services. We are completely transparent about our revenue model. The commissions we earn support the ongoing maintenance and growth of this website.
            </p>
          </>
        );
      case 'sponsored':
        return (
          <>
            <p className="mb-4">
              Occasionally, we may publish sponsored content. Any sponsored posts will be clearly labeled as such. We only accept sponsorships from brands and products that align with our core values and standards of quality.
            </p>
          </>
        );
      case 'honest-reviews':
        return (
          <>
            <p className="mb-4">
              Whether a link is an affiliate link or not, we only recommend products or services that we believe will add value to our readers. We never recommend a product solely for the purpose of earning a commission. Our reviews are based on our own research, analysis, and editorial discretion.
            </p>
          </>
        );
      case 'independence':
        return (
          <>
            <p className="mb-4">
              Our editorial content is not influenced by affiliate partnerships. We maintain strict editorial independence to ensure that our product evaluations remain objective and trustworthy.
            </p>
          </>
        );
      case 'pricing':
        return (
          <>
            <p className="mb-4">
              We make every effort to ensure that the product pricing and availability information on our site is accurate. However, prices and availability are subject to change by the merchant at any time. We do not guarantee the price or availability of any product.
            </p>
          </>
        );
      case 'merchant-disclaimer':
        return (
          <>
            <p className="mb-4">
              Any purchase you make is directly with the third-party merchant, not with ViaFinds. We are not responsible for the quality, safety, delivery, or any other aspect of the products or services you purchase from these merchants.
            </p>
          </>
        );
      case 'faq':
        return (
          <>
            <h3 className="text-xl font-semibold mb-3">Frequently Asked Questions</h3>
            <dl className="space-y-4">
              <div>
                <dt className="font-medium">Do affiliate links cost me money?</dt>
                <dd className="ml-4 text-gray-700 dark:text-gray-300">
                  No. You pay the exact same price whether you use our affiliate link or go directly to the merchant&apos;s website.
                </dd>
              </div>
              <div>
                <dt className="font-medium">Can I trust your product reviews?</dt>
                <dd className="ml-4 text-gray-700 dark:text-gray-300">
                  Yes. We pride ourselves on maintaining editorial independence and only recommending products we truly believe in.
                </dd>
              </div>
              <div>
                <dt className="font-medium">Do you get paid for every click?</dt>
                <dd className="ml-4 text-gray-700 dark:text-gray-300">
                  Typically, we only earn a commission if you click the link and make a qualifying purchase within a certain timeframe.
                </dd>
              </div>
              <div>
                <dt className="font-medium">How can I identify an affiliate link?</dt>
                <dd className="ml-4 text-gray-700 dark:text-gray-300">
                  For simplicity, assume that any link directing you to a retailer is an affiliate link.
                </dd>
              </div>
              <div>
                <dt className="font-medium">What if I have a problem with a product I bought?</dt>
                <dd className="ml-4 text-gray-700 dark:text-gray-300">
                  You should contact the merchant or retailer from whom you made the purchase. We do not handle customer service for third-party products.
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

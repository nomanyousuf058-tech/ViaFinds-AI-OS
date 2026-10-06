# 31 CURRENT BUSINESS MODEL

## What ViaFinds ACTUALLY Does Today (Implemented)
ViaFinds operates as a highly automated **Affiliate Publishing Platform**. 

**The Pipeline:**
Traffic (via SEO/GEO) $\rightarrow$ Audience $\rightarrow$ Search Intent $\rightarrow$ Content $\rightarrow$ Affiliate Links (CTAs) $\rightarrow$ Click $\rightarrow$ Conversion (on Digistore24/ClickBank) $\rightarrow$ Revenue.

1. The AI Automation pipeline identifies (or is given) a trending affiliate product.
2. It writes a high-quality, editorial review or guide.
3. It injects the affiliate hop-link into the article.
4. The article is published, indexed, and ranks in search engines.
5. Users read the article, click the CTA, and purchase on the third-party merchant site.
6. ViaFinds earns a commission.

## Future / Potential Business Models (NOT CURRENTLY IMPLEMENTED)
While the current architecture serves affiliate links, the foundation is primed for hybrid models:

1. **Owned Digital Products (100% Margin)**:
   - ViaFinds could sell its own e-books, AI prompt bundles, or courses directly to users.
   - *Requires*: Stripe/checkout integration, gated content delivery, and a shift in the AI Strategy to prioritize owned products over affiliate products when intents overlap.

2. **Hybrid Model**:
   - The AI promotes an affiliate software tool (e.g., an SEO tool) but sells a "ViaFinds Exclusive Training Course" on how to use it.

3. **Lead Generation / B2B**:
   - Capturing leads via `NewsletterForm.tsx` to build an email list for direct marketing. (Currently, the form exists, but automated email marketing workflows were not explicitly found outside of `.env` configurations for Resend/SendGrid).

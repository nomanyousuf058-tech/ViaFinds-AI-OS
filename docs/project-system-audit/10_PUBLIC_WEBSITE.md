# 10 PUBLIC WEBSITE

## Overview
The public-facing website acts as a premium digital magazine. It does not look like a typical "niche affiliate site", but rather an authoritative editorial destination.

## Page/Route Registry (Verified from `app/` directory)
- **`/` (Index)**: The home page, likely displaying featured articles, recent reviews, and trending digital products.
- **`/[...slug]`**: Dynamic catch-all for resolving article or page URLs. If a user visits `/best-ai-software`, this route queries the database (`articles` table, matching `slug`) and renders the content.
- **`/articles/`**: Archive/feed of all editorial articles.
- **`/reviews/`**: Dedicated route for product reviews. 
- **`/category/`**: Taxonomy filtering (e.g., `/category/digital-products`, `/category/luxury-beauty`).
- **`/brands/`**: Directory of brands/merchants covered on the site.
- **`/search/`**: Internal search utilizing the PostgreSQL full-text `search_vector`.
- **Static Pages**: `/about`, `/contact`, `/privacy-policy`, `/terms-of-service`, `/cookie-policy`, `/affiliate-disclosure`.

## Component Architecture
- **Navigation**: Uses `Navbar.tsx` and `Footer.tsx`.
- **Content Rendering**: 
  - Content is stored in the database as a JSONB array of blocks.
  - The frontend maps these blocks (e.g., `{ type: 'paragraph', text: '...' }`) to React components.
  - Generates a `TableOfContents.tsx` dynamically from `h2` and `h3` blocks.
- **Engagement & Compliance**:
  - `NewsletterForm.tsx`: Captures leads.
  - `CookieSection.tsx` & `affiliate-disclosure`: Ensures FTC and GDPR compliance, which is critical for affiliate businesses.
  - `ShareButtons.tsx`: Social sharing.

## SEO Metadata
Pages utilize Next.js `generateMetadata()` leveraging the `seo`, `geo`, and `aeo` JSONB fields from the database to inject precise meta titles, descriptions, canonical URLs, and Schema.org structured data (like `Article` or `Review` schema).

## Feed Generation
- **`/rss.xml`**: Dynamically generates RSS feeds for syndication and SEO.
- **`/sitemap.ts` & `/robots.ts`**: Dynamic sitemap generation ensuring new automated articles are indexed immediately.

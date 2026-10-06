# 05 FRONTEND ARCHITECTURE

## Technology Stack
- **Framework**: Next.js 16.3.2 using the **App Router** (`app/` directory).
- **UI Rendering**: React 19.1.0 with a heavy emphasis on Server Components.
- **Styling**: TailwindCSS 3.4.17 with PostCSS.
- **Typography/Design**: Aimed at a premium editorial aesthetic (magazine style).

## Routing Structure (Public)
The frontend relies heavily on dynamic routing to serve editorial content:
- **`app/page.tsx`**: The main landing page / index.
- **`app/[...slug]/page.tsx`**: Dynamic catch-all route. Likely used to render articles or dynamic pages matching a database slug.
- **`app/articles/`**: Article archives and specific article rendering.
- **`app/reviews/`**: Product review archives.
- **`app/category/`**: Category taxonomy pages.
- **`app/brands/`, `app/search/`**: Additional taxonomy and discovery routes.
- **`app/about/`, `app/contact/`, `app/privacy-policy/`, etc.**: Static information pages.

## Component Library
Housed in `components/`, the UI is modularized:
- **Layout & Navigation**: `Navbar.tsx`, `Footer.tsx`.
- **Editorial UI**: `ArticleCard.tsx`, `TableOfContents.tsx`.
- **Engagement**: `NewsletterForm.tsx`, `ShareButtons.tsx`, `SearchForm.tsx`.
- **Legal/Tracking**: `CookieSection.tsx`, `Clarity.tsx` (MS Clarity analytics), `PrivacySection.tsx`.
- **Admin/Editor UI**: `ArticleEditor.tsx` (A massive 35k byte complex component likely providing block-based rich text editing), `AdminGuard.tsx`.

## Data Fetching
As an App Router application, data fetching for public pages happens server-side directly against the Supabase PostgreSQL database using the `pg` driver, ensuring fast time-to-first-byte (TTFB) and secure handling of data without exposing API endpoints unnecessarily to the client.

## SEO & Meta
- Heavily automated via `app/sitemap.ts` and `app/robots.ts`.
- The database schema indicates fields for `seo` (JSONB) on articles, which are dynamically injected into Next.js metadata objects.
- Image unoptimization is explicitly configured in `next.config.js` (`images: { unoptimized: true }`), likely relying on external CDNs or Supabase storage directly for image delivery.

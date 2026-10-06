# 23 COMPONENT REGISTRY

Verified from `components/` directory.

## Layout & Global
- **`Navbar.tsx`** (3.2kb): Site header and navigation.
- **`Footer.tsx`** (5.6kb): Site footer.
- **`AnnouncementBar.tsx`** (1.8kb): Top promotion bar.

## Editorial Rendering
- **`ArticleCard.tsx`** (2.8kb): Card component for lists/grids.
- **`TableOfContents.tsx`** (2.4kb): Dynamically renders links based on `h2`/`h3` JSON blocks.

## Admin & Editing
- **`ArticleEditor.tsx`** (35.5kb): The most complex component. Handles rendering and editing of the Universal Content Object (JSON blocks). Allows admins to fix AI mistakes before publishing.
- **`AdminGuard.tsx`** (0.9kb): Authentication wrapper for dashboard routes.
- **`DeleteArticleButton.tsx`** (1.3kb): Admin utility.

## Engagement & Legal
- **`NewsletterForm.tsx`** (3.1kb): Lead capture.
- **`ShareButtons.tsx`** (6.2kb): Social sharing.
- **`SearchForm.tsx`** (1.4kb): Search input.
- **`CookieSection.tsx`** (7.4kb): GDPR consent.
- **`PrivacySection.tsx`** (15.2kb) & **`TermsSection.tsx`** (9.9kb): Legal text components.
- **`Clarity.tsx`** (0.7kb): Microsoft Clarity integration script.

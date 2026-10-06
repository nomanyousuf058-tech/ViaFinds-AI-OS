# 17 SEO, GEO, AND AEO SYSTEM

ViaFinds treats Search Engine Optimization (SEO), Generative Engine Optimization (GEO), and Answer Engine Optimization (AEO) as first-class citizens in its content pipeline.

## Automation Pipeline Integration
Within `pipeline.ts`, after an article is drafted by the AI, it passes through strict optimization checks:
1. `runEEATAnalysis(job, draftedArticle)`: Checks for Experience, Expertise, Authoritativeness, and Trustworthiness.
2. `runSEOAnalysis(job, draftedArticle)`
3. `runGEOAnalysis(job, draftedArticle)`
4. `runAEOAnalysis(job, draftedArticle)`

## Data Storage
The `articles` table contains dedicated JSONB columns for these vectors:
- `seo JSONB DEFAULT '{}'`
- `geo JSONB DEFAULT '{}'`
- `aeo JSONB DEFAULT '{}'`

## Next.js Metadata Implementation
The frontend uses Next.js `generateMetadata()` in `app/[...slug]/page.tsx` to dynamically parse these JSON fields and inject:
- Perfect `<title>` and `<meta description>` tags.
- Schema.org JSON-LD (structured data for Articles, Reviews, and Products).
- OpenGraph and Twitter card imagery.

## Automated Sitemaps & Indexing
- **`app/sitemap.ts`**: Dynamically generates XML sitemaps by querying the database for all `status = 'published'` articles.
- **`app/robots.ts`**: Manages crawler access.
- **Auto-Indexing**: Configurable via `.env` (`SEO_AUTO_INDEXING`), potentially pinging Google Search Console APIs when new content goes live.

## Generative & Answer Engine Optimization (GEO/AEO)
Unlike traditional niche sites that only optimize for keywords, ViaFinds optimizes for AI Overviews (Google SGE, Perplexity, ChatGPT). The AI pipeline explicitly structures headings and bullet points to maximize the chance of being cited as a source by Answer Engines.

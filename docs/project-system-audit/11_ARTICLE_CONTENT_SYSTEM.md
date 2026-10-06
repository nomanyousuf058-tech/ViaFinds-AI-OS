# 11 ARTICLE CONTENT SYSTEM

## Universal Content Object (UCO) Architecture
ViaFinds normalizes content using an internal Universal Content Object (UCO) architecture (`core/uco/`). This ensures that regardless of which AI generated the text, or whether an admin wrote it manually, the data structure is identical.

## Data Storage Strategy
- **Table**: `articles` and `reviews`.
- **Content Field**: `content JSONB DEFAULT '[]'`.
- **Why JSONB?** Instead of storing raw HTML or Markdown, ViaFinds stores an array of discrete blocks. 
  - Example: `[{ type: "h2", text: "Introduction" }, { type: "paragraph", text: "..." }]`
  - This allows the Next.js frontend to map specific blocks to highly styled React components (e.g., a "pros and cons" block renders as a styled React card, not just a bulleted list).

## The Article Lifecycle
1. **Queued**: An entry in `automation_jobs` dictates an article needs to be written.
2. **Drafting (AI)**: `ContentIntelligenceAgent` prompts an LLM with strict editorial guidelines (e.g., "Write like a Conde Nast editor").
3. **Refinement**: A secondary AI pass checks for flow, tone, and removes generic AIisms (like "delve" or "In today's fast paced world").
4. **Draft Status**: Stored in DB with `status = 'draft'`.
5. **Quality Gates**: E-E-A-T analysis is appended. Image placeholders are requested.
6. **Admin Review**: Admin reviews via `ArticleEditor.tsx`.
7. **Publishing**: Admin clicks publish. Status becomes `published`. `published_at` timestamp is set.
8. **Protection**: PostgreSQL trigger `protect_manual_articles()` fires on future updates, preventing automated systems from accidentally reverting a published article to a draft.

## Editorial Enforcement
The `ContentIntelligenceAgent` strictly enforces:
- **No Markdown**: LLMs are forced to output the JSON block structure.
- **Tone**: First-person perspective, authoritative, narrative-driven.
- **Taxonomy**: Must fit into `Luxury Beauty` or `High-Ticket Digital Products`.

## Related Content
The schema manages relationships natively:
- `article_related_products`: Links articles to specific products/affiliate links.
- `article_related_articles`: Internal linking system (crucial for SEO).

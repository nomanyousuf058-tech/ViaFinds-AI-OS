# 12 AFFILIATE SYSTEM

## Current Implementation Status
The affiliate system is the core monetization engine of ViaFinds, but it operates as a **Content-First Affiliate System**, not a storefront. 

## Data Architecture
1. **Products Table (`products`)**:
   - Stores editorial references to products, NOT an e-commerce catalog.
   - Fields: `title`, `price`, `affiliate_url`, `affiliate_network`, `brand`.
2. **Affiliate References Table (`affiliate_references`)**:
   - A polymorphic mapping table linking a `content_id` (an article or review) to a specific affiliate URL.
   - Allows tracking of exactly which article generated a click.
3. **Integration**: Digistore24 (and potentially Clickbank) are explicitly targeted in the automation prompts and Git history (`fix(automation): fix Digistore24 hop-link format`).

## Automation Workflow (The "Manual Affiliate" Flow)
Verified from `pipeline.ts`:
1. **Input**: An admin pastes an raw affiliate link (e.g., a Digistore24 hop-link).
2. **Scraping**: The backend fetches the target URL, extracts the `<title>`, `<meta description>`, `og:image`, and a snippet of the `<body>`.
3. **Analysis**: An AI processes the scraped text to determine:
   - Product Name
   - Category
   - Optimal Article Strategy (e.g., "in-depth-review" vs "problem-solution-story").
4. **Generation**: The pipeline then feeds this strategy into the `ContentIntelligenceAgent` to write the article.
5. **CTA Injection**: The pipeline automatically injects the original affiliate URL into a Call-To-Action (CTA) block within the article JSON structure.

## Verification & Fallbacks
- Git history shows recent fixes for "strict hop-link validation" and "active product validation", proving this system is actively utilized and hardened against broken links.

## Future Owned-Product Support (Gap)
- **Currently**: The system assumes external fulfillment (affiliate).
- **Future AI Brain**: If ViaFinds sells its *own* digital products, the `products` schema will need extending (or a new module) to handle inventory/access-control, and the AI will need a decision matrix to choose between promoting an owned product (100% margin) vs an affiliate product (commission).

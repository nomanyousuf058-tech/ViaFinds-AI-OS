# 29 TECHNICAL DEBT & RISKS

## High Priority Risks
1. **LLM JSON Fragility**: The system depends heavily on LLMs outputting perfect JSON matching a strict schema (e.g., the UCO block format). Even with `cleanJsonResponse`, unexpected markdown or conversational padding (e.g., "Here is your JSON:") can break the pipeline, stranding jobs in a `failed` state.
2. **Procedural Automation vs Agentic Autonomy**: `pipeline.ts` is a massive (1600+ line) file. It is a rigid state machine. If an intermediate step needs to change based on new information (e.g., the AI realizes a product is discontinued during the research phase), the pipeline lacks the "agentic" ability to pivot. It will simply fail or generate hallucinated content.
3. **Scraping Reliability**: The manual affiliate workflow relies on fetching and parsing HTML `<title>` and `<meta>` tags. If a merchant blocks server-side scraping (e.g., via Cloudflare Bot Management), the pipeline will fail to extract product details.

## Medium Priority Debt
1. **Dead/Unused Code**: `Sanity CMS` is referenced but removed. There are early `Agent` framework files (`agents/core/`) that seem largely bypassed by the procedural `pipeline.ts`.
2. **Complex Provider Fallbacks**: The `AIRouter` is robust, but maintaining configurations for 15+ providers is overhead. 
3. **Image Generation Quality**: Relying on Cloudflare Workers AI SDXL as a free fallback often results in sub-par editorial imagery compared to Midjourney or DALL-E 3.

## Low/Informational Debt
- **Testing Coverage**: E2E tests are relegated to custom scripts (`scripts/`) rather than fully integrated into GitHub Actions, likely to save API costs.
- **Component Size**: `<ArticleEditor.tsx>` is over 35kb, suggesting a monolithic React component that should ideally be broken down for maintainability.

# 07 - Remaining Capability Gaps

Despite the successful wiring of the `SearchRouter` to the Brain context, the following capability gaps remain before the system can operate autonomously in Phase 4:

## 1. AI Text Provider Reliability (CRITICAL)
- **Gap:** The system lacks a reliable, funded AI provider for complex JSON generation tasks.
- **Impact:** The Brain can gather research but fails to analyze it when Gemini returns 503 errors, as all other fallback providers have invalid keys, insufficient balance, or rate limits.
- **Fix:** Update `.env.local` with a valid, funded API key for at least one failover provider (e.g., OpenAI `OPENAI_API_KEY` or Anthropic `ANTHROPIC_API_KEY`).

## 2. Digistore24 Affiliate Credentials (CRITICAL)
- **Gap:** The `Digistore24Provider` is fully implemented in code but lacks an API key.
- **Impact:** The system cannot discover monetizable products to attach to the generated opportunities.
- **Fix:** Obtain and inject `DIGISTORE24_API_KEY` into `.env.local`.

## 3. Official Google Custom Search or SerpAPI (MODERATE)
- **Gap:** Google Custom Search is returning 403 due to HTTP Referrer restrictions in the Google Cloud Console.
- **Impact:** We are currently relying on a custom HTML scraper for DuckDuckGo. While functional, it is prone to breaking if DuckDuckGo changes their DOM structure.
- **Fix:** Either fix the API Key restrictions in Google Cloud Console, or provide a `SERPAPI_API_KEY`.

## 4. Agent Reach (OPTIONAL/FUTURE)
- **Gap:** "Agent Reach" does not exist in the codebase.
- **Impact:** None for MVP. The current `SearchRouter` integration acts as the primary external research layer, fulfilling the immediate requirements of the Brain. Agent Reach can be safely deferred.

## 5. PostHog (OPTIONAL/DEFERRED)
- **Gap:** PostHog API key returns 403.
- **Impact:** Lack of product analytics. This does not block external research or content generation. It is not a Phase 3.2 blocker.

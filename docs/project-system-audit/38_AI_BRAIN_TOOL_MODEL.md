# 38 AI BRAIN TOOL MODEL

*How the proposed AI Brain will interact with the world.*

## Tool Concept
The Brain's Agents should not rely purely on their internal LLM weights. They need to call external functions (Tools). 

## Required Tool Registry
The `AutomationPipeline` functions should be refactored into independent Tools:

1. **`Tool_SearchWeb(query)`**: Allows the Research Agent to query Google/Bing for current facts (e.g., current pricing of a software tool).
2. **`Tool_ScrapeURL(url)`**: Extracts text from a target affiliate page (reusing existing HTML parser logic).
3. **`Tool_QueryAnalytics(metric, date_range)`**: Connects to PostHog/Plausible API to let the Strategy Engine check traffic.
4. **`Tool_DraftArticle(uco_json)`**: Submits the final JSON payload to the PostgreSQL database as a draft.
5. **`Tool_CheckSEO(keyword, content)`**: Validates keyword density and semantic relevance.
6. **`Tool_ValidateAffiliateLink(url)`**: Pings the URL to ensure it doesn't 404 or redirect to a dead offer.

## Execution Flow
Instead of `pipeline.ts` deciding "Step 1 is Scrape, Step 2 is Write", the Orchestrator Agent is given the Goal and the Tools.
*Example*: "Goal: Write a review of Product X."
*Agent*: "I need to know what Product X is. I will call `Tool_SearchWeb(Product X)`. Then I will call `Tool_ScrapeURL(...)`."

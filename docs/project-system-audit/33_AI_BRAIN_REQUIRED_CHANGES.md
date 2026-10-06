# 33 AI BRAIN REQUIRED CHANGES

*These are proposed changes to support the future AI Brain. Do not implement these yet.*

## A. Reuse Existing Systems (Do Not Rebuild)
- **The Next.js Frontend**: Perfectly capable of rendering JSON blocks. No changes needed.
- **The Database Schema**: Extremely robust. Keep `articles`, `categories`, and `jobs`.
- **The AIRouter**: The multi-provider failover system is excellent and should be reused by the Brain's agents to save costs and ensure uptime.
- **The Admin Dashboard**: Keep the UI for reviewing articles. The UI for "Jobs" can be rebranded or extended to show "Agent Thoughts".

## B. Modify Existing Systems
- **`lib/automation/pipeline.ts`**: Currently, it is a monolithic state machine. It needs to be broken down into discrete *Tools* or *Capabilities* (e.g., `draft_article_tool`, `analyze_seo_tool`) that the AI Brain can call dynamically, rather than executing in a rigid 1-to-7 sequence.
- **Agent Framework**: `BaseAgent` needs to be expanded to support Tool Calling (Function Calling API) and Memory retrieval.

## C. New Systems Required
- **Memory/Knowledge Graph Layer**: A database (e.g., Pinecone, or PostgreSQL pgvector) to store the Brain's long-term learnings (e.g., "Articles about SaaS convert at 4%, but Beauty converts at 1%").
- **Strategy Loop (The 'Brain' Process)**: A continuous background process that evaluates analytics, identifies market gaps, and spawns new tasks.
- **Evaluation Engine**: Before sending an article to `awaiting_approval`, a distinct "Critic" Agent should evaluate the drafted text against the original Strategy.

## D. Replace Systems
- **Cron-Driven Discovery**: The hardcoded `TrendingDiscoveryStep` should be replaced by a `MarketResearchAgent` that browses the web, reads affiliate network APIs, and pitches ideas to the Strategy Engine.

## E. Remove Systems
- Only remove existing rigid pipeline code *after* the new Agentic tools are proven to work reliably. (e.g., eventually deprecate `pipeline.ts` entirely in favor of an Orchestrator Agent).

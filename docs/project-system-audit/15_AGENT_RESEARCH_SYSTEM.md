# 15 AGENT RESEARCH SYSTEM

## Current State: Transitional
ViaFinds is currently transitioning from a rigid procedural automation pipeline to an Agentic framework. The Agent system exists, but is not yet fully autonomous.

## Core Framework (`agents/core/`)
- **`BaseAgent.ts`**: The abstract class defining all agents. 
  - Enforces `identity` (name, version), `config` (retries, timeouts), and `capabilities` (supported tasks).
  - Implements a standardized `execute()` pipeline: `validate()` -> `process()` -> Metric Tracking -> Logging.
  - Maintains `currentHealth` (active connections, online status) and `metrics` (latency, tokens used).
- **`AgentRegistry.ts` & `AgentFactory.ts`**: Centralized systems for registering and instantiating agents based on their IDs.

## Active Agents
1. **`ContentIntelligenceAgent`**: 
   - Responsible for taking product data and drafting the editorial article.
   - Enforces the strict "Conde Nast" editorial tone.
   - Outputs strict JSON block formatting.
2. **`AffiliateIntelligenceAgent`**:
   - Currently a stub/framework implementation.
   - Intended for affiliate link validation and product matching.

## Research Flow (`pipeline.ts` context)
Currently, "Research" is handled primarily by procedural steps in the Automation Pipeline rather than an autonomous Web Browsing agent.
- **Product Extraction**: The pipeline fetches an affiliate URL, scrapes the `<title>`, `<meta>`, and `<body>` snippet, and feeds it to the `AIRouter` to extract product details.
- **Trend Discovery**: Uses a specific `TrendingDiscoveryStep` or falls back to an LLM prompt to invent trending products.

## The Gap (Why AI Brain is needed)
The current "agents" are essentially highly structured wrappers around LLM prompts. They cannot:
- Browse the internet to verify facts.
- Execute sub-tasks dynamically.
- Pivot their strategy if they realize a product is a scam.
The future **AI Brain** will require a robust `ResearchLayer` where agents have access to a Tool Registry (Search, Web Browsing, DB Query) to perform deep, multi-step investigation before drafting content.

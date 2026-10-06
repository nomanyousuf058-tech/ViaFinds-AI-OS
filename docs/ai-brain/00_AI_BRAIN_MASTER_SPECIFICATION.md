# 00 AI BRAIN MASTER SPECIFICATION

## Executive Summary
This document serves as the master blueprint for the ViaFinds AI Brain. The AI Brain is a strategic intelligence layer that sits above the existing execution engine (Automation Pipeline). It acts as a long-term, upgradeable business operating intelligence system capable of observing analytics, generating strategies, orchestrating tasks, and learning from performance metrics. 

## Current Architecture Understanding (VERIFIED)
Based on the comprehensive forensic audit:
- The system is an **execution engine**, heavily reliant on procedural automation (`lib/automation/pipeline.ts`).
- It processes tasks well but lacks a cognitive planning layer. It cannot independently pivot or learn from analytics.
- It features robust failovers via `AIRouter.ts`, a normalized PostgreSQL schema, and an agent framework (`BaseAgent`) that currently only wraps prompts.

## AI Brain Vision
The AI Brain is designed to transform ViaFinds from a reactive pipeline to a proactive, strategic business entity. 
- **Observe**: Monitor traffic, revenue, and trends.
- **Understand**: Identify gaps and opportunities.
- **Strategize**: Determine whether to publish reviews, comparisons, or promote owned products.
- **Orchestrate**: Delegate actionable execution plans to the Automation Pipeline.
- **Learn**: Persist findings in long-term memory to improve future decision-making.

## Design Principles
1. **Loosely Coupled**: The Brain must not be tightly integrated into `pipeline.ts`.
2. **Provider & Model Independent**: Reuses the existing `AIRouter`.
3. **Database-Aware**: Utilizes PostgreSQL heavily, prioritizing relational/JSONB storage over unnecessary new vector databases.
4. **Free-First**: Always prefers free/low-cost options, caching, and batching to minimize API spend.
5. **Human-in-the-Loop**: Adheres strictly to a conservative Permission Model where destructive actions or high-ticket publishing require Admin approval.
6. **Future-Resistant**: Upgradeable architecture capable of supporting both affiliate and owned-product business models.

## Architectural Links
- [01 AI Brain Architecture](01_AI_BRAIN_ARCHITECTURE.md)
- [02 AI Brain Modules](02_AI_BRAIN_MODULES.md)
- [03 Data Architecture](03_AI_BRAIN_DATA_ARCHITECTURE.md)
- [45 Final Decisions](45_AI_BRAIN_FINAL_DECISIONS.md)

*(See `docs/ai-brain` directory for the complete 46-part specification).*

# 00 MASTER PROJECT INDEX: ViaFinds AI OS

## Audit Information
- **Audit Date**: 2026-09-24
- **Git Commit Inspected**: 7bfb6ed (main)
- **Audit Methodology**: Forensic file system analysis, dependency review, code trace of API routes, Database Schema review, AI Provider evaluation, Pipeline state check.
- **Confidence Level**: High (Verified from source code, configuration, and database schema)

## What is ViaFinds?
ViaFinds is a premium editorial publication platform inspired by luxury lifestyle magazines (e.g. Conde Nast, Vox Media). It currently operates heavily in two niches: Luxury Beauty (supplements, biohacking) and High-Ticket Digital Products (software, elite courses). The system combines an editorial frontend with an advanced backend "Automation Pipeline" capable of trend discovery, product research, article generation using AI, content refinement, SEO/GEO/AEO analysis, and auto-publishing.

## Current Business Model
The current implementation primarily functions as an **Affiliate Content Engine**.
1. **Traffic Generation**: Via automated, high-quality SEO/AEO-optimized editorial articles.
2. **Product Focus**: Digital products (via Digistore24/Clickbank) and Luxury Beauty.
3. **Monetization**: Affiliate links strategically placed in generated content using CTA blocks.
*Note: A future owned-digital-product model is proposed but the system currently targets affiliate tracking as its primary revenue architecture.*

## Key Technical Systems
- **Frontend/Backend**: Next.js 16.3.2 (App Router) + React 19.1.0, TypeScript, TailwindCSS
- **Database**: PostgreSQL (Supabase) via direct `pg` wire protocol and `@supabase/supabase-js`.
- **AI Router**: An internal multi-provider router supporting Gemini, Groq, Mistral, OpenAI, Claude, DeepSeek, and more.
- **Automation Pipeline**: A state machine job runner (`lib/automation/pipeline.ts`) managing the discovery-to-publishing lifecycle.
- **Agentic Framework**: Early implementation of `BaseAgent`, `ContentIntelligenceAgent`, and `AffiliateIntelligenceAgent`.
- **Integrations**: Extensive (Playwright for E2E, Cloudflare Workers AI for free image generation fallback, Supabase Storage).

## Known Problems & Technical Debt
- Heavy reliance on LLM JSON outputs which frequently break (handled via `cleanJsonResponse` retry loops).
- Complex fallback chains in the AI Router.
- Feature flags are extensive, meaning many features can be toggled and might not be active simultaneously.
- AI Agent framework is in its infancy (`BaseAgent` is defined but only a few agents actively implement the pattern, while the main `pipeline.ts` holds the bulk of logic).

## AI Brain Opportunity & Required Changes
The future "AI Brain" aims to elevate ViaFinds from an automated content publisher to an autonomous business operating system. The AI Brain will sit *above* the current Automation Pipeline. 
- **Required**: Strategy Engine, Memory (Knowledge Graph), Agent Orchestration, Quality Evaluation Engine, Business Intelligence.
- **Modifications**: The current `AutomationPipeline` will become the *execution arm* of the AI Brain, taking strategic directives rather than running on static cron schedules.

---

## Documentation Index

**Core Architecture & Overviews**
- [01_PROJECT_EXECUTIVE_SUMMARY.md](01_PROJECT_EXECUTIVE_SUMMARY.md)
- [02_CURRENT_TECHNOLOGY_STACK.md](02_CURRENT_TECHNOLOGY_STACK.md)
- [03_PROJECT_STRUCTURE.md](03_PROJECT_STRUCTURE.md)
- [04_SYSTEM_ARCHITECTURE.md](04_SYSTEM_ARCHITECTURE.md)
- [05_FRONTEND_ARCHITECTURE.md](05_FRONTEND_ARCHITECTURE.md)
- [06_BACKEND_ARCHITECTURE.md](06_BACKEND_ARCHITECTURE.md)
- [07_DATABASE_ARCHITECTURE.md](07_DATABASE_ARCHITECTURE.md)

**Features & Subsystems**
- [08_AUTHENTICATION_SECURITY.md](08_AUTHENTICATION_SECURITY.md)
- [09_ADMIN_DASHBOARD.md](09_ADMIN_DASHBOARD.md)
- [10_PUBLIC_WEBSITE.md](10_PUBLIC_WEBSITE.md)
- [11_ARTICLE_CONTENT_SYSTEM.md](11_ARTICLE_CONTENT_SYSTEM.md)
- [12_AFFILIATE_SYSTEM.md](12_AFFILIATE_SYSTEM.md)
- [13_AUTOMATION_SYSTEM.md](13_AUTOMATION_SYSTEM.md)
- [14_AI_SYSTEM.md](14_AI_SYSTEM.md)
- [15_AGENT_RESEARCH_SYSTEM.md](15_AGENT_RESEARCH_SYSTEM.md)
- [16_JOBS_QUEUE_SCHEDULER.md](16_JOBS_QUEUE_SCHEDULER.md)
- [17_SEO_GEO_AEO.md](17_SEO_GEO_AEO.md)
- [18_ANALYTICS_MONITORING.md](18_ANALYTICS_MONITORING.md)

**Registries & Interfaces**
- [19_EXTERNAL_INTEGRATIONS.md](19_EXTERNAL_INTEGRATIONS.md)
- [20_TOOL_REGISTRY.md](20_TOOL_REGISTRY.md)
- [21_API_ROUTE_REGISTRY.md](21_API_ROUTE_REGISTRY.md)
- [22_PAGE_ROUTE_REGISTRY.md](22_PAGE_ROUTE_REGISTRY.md)
- [23_COMPONENT_REGISTRY.md](23_COMPONENT_REGISTRY.md)

**Data Flow & Operations**
- [24_DATA_FLOW.md](24_DATA_FLOW.md)
- [25_TESTING_QA.md](25_TESTING_QA.md)
- [26_DEPLOYMENT_INFRASTRUCTURE.md](26_DEPLOYMENT_INFRASTRUCTURE.md)
- [27_GITHUB_ACTIONS.md](27_GITHUB_ACTIONS.md)
- [28_ENVIRONMENT_CONFIGURATION.md](28_ENVIRONMENT_CONFIGURATION.md)
- [29_TECHNICAL_DEBT.md](29_TECHNICAL_DEBT.md)

**Business & Future State**
- [30_CURRENT_FEATURE_STATUS.md](30_CURRENT_FEATURE_STATUS.md)
- [31_CURRENT_BUSINESS_MODEL.md](31_CURRENT_BUSINESS_MODEL.md)
- [32_AI_BRAIN_GAP_ANALYSIS.md](32_AI_BRAIN_GAP_ANALYSIS.md)
- [33_AI_BRAIN_REQUIRED_CHANGES.md](33_AI_BRAIN_REQUIRED_CHANGES.md)
- [34_PROPOSED_AI_BRAIN_ARCHITECTURE.md](34_PROPOSED_AI_BRAIN_ARCHITECTURE.md)
- [35_AI_BRAIN_BUSINESS_SCENARIOS.md](35_AI_BRAIN_BUSINESS_SCENARIOS.md)
- [36_AI_BRAIN_PERMISSION_MODEL.md](36_AI_BRAIN_PERMISSION_MODEL.md)
- [37_AI_BRAIN_MEMORY_MODEL.md](37_AI_BRAIN_MEMORY_MODEL.md)
- [38_AI_BRAIN_TOOL_MODEL.md](38_AI_BRAIN_TOOL_MODEL.md)
- [39_AI_BRAIN_STRATEGY_EVOLUTION.md](39_AI_BRAIN_STRATEGY_EVOLUTION.md)
- [40_AI_BRAIN_PRODUCT_EVOLUTION.md](40_AI_BRAIN_PRODUCT_EVOLUTION.md)
- [41_AI_BRAIN_QUALITY_AND_EVALUATION.md](41_AI_BRAIN_QUALITY_AND_EVALUATION.md)
- [42_AI_BRAIN_ROADMAP.md](42_AI_BRAIN_ROADMAP.md)

**Wrap-up**
- [43_OPEN_QUESTIONS_AND_UNKNOWN.md](43_OPEN_QUESTIONS_AND_UNKNOWN.md)
- [44_FINAL_SYSTEM_MAP.md](44_FINAL_SYSTEM_MAP.md)
- [45_AUDIT_COMPLETION_REPORT.md](45_AUDIT_COMPLETION_REPORT.md)

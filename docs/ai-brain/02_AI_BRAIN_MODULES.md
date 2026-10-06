# 02 AI BRAIN MODULES

This document defines the distinct functional modules required to construct the AI Brain.

## 1. Brain Core
- **Purpose**: The central nervous system uniting all sub-modules.
- **Responsibilities**: Initialization, dependency injection, and state management.

## 2. Context Builder
- **Purpose**: Prepares payloads for LLM requests.
- **Responsibilities**: Gathers pertinent memory, active strategy, and system rules into a cohesive prompt prefix.

## 3. Memory Manager
- **Purpose**: Interacts with the database.
- **Responsibilities**: CRUD operations for `brain_memory` and retrieving relevant historical context.

## 4. Knowledge Graph
- **Purpose**: Relational mapping.
- **Responsibilities**: Queries PostgreSQL to map connections between Audience, Products, and Performance.

## 5. Strategy Engine
- **Purpose**: High-level directional planning.
- **Responsibilities**: Decides *why* the system should do something, emitting `Strategy` objects.

## 6. Opportunity Engine
- **Purpose**: Finds specific execution targets.
- **Responsibilities**: Scans affiliate networks and owned products against the Strategy to find matches.

## 7. Task Engine
- **Purpose**: Work breakdown.
- **Responsibilities**: Converts Opportunities into granular `Task` objects.

## 8. Agent Orchestrator
- **Purpose**: Delegation.
- **Responsibilities**: Routes Tasks to Tools, Automation Jobs, or Agent Reach.

## 9. Research Engine
- **Purpose**: External verification.
- **Responsibilities**: Executes internet searches and site scraping to validate facts.

## 10. Agent Reach Adapter
- **Purpose**: Abstraction layer for external agents.
- **Responsibilities**: Prevents external research agents from directly mutating internal state.

## 11. Tool Registry
- **Purpose**: Directory of executable functions.
- **Responsibilities**: Maintains a list of callable endpoints/methods the Brain can use.

## 12. Model Router
- **Purpose**: LLM interaction.
- **Responsibilities**: Wraps the existing `AIRouter.ts` to execute Brain-specific prompts with priority/failover logic.

## 13. Business Intelligence
- **Purpose**: Analytics ingestion.
- **Responsibilities**: Reads PostHog/Google Analytics APIs to track traffic and behavior.

## 14. Product Intelligence
- **Purpose**: Product analysis.
- **Responsibilities**: Understands margins, conversion rates, and features of Affiliate and Owned products.

## 15. Content Intelligence
- **Purpose**: Content formatting strategy.
- **Responsibilities**: Chooses the best format (Listicle vs Review) based on intent.

## 16. Automation Adapter
- **Purpose**: Interface with `pipeline.ts`.
- **Responsibilities**: Translates Brain Tasks into `automation_jobs` table entries.

## 17. Quality Gate
- **Purpose**: Pre-publish validation.
- **Responsibilities**: Checks outputs against E-E-A-T and JSON schema requirements.

## 18. Evaluation Engine
- **Purpose**: Post-execution review.
- **Responsibilities**: Grades the success of a completed task or published article.

## 19. Learning Engine
- **Purpose**: Knowledge extraction.
- **Responsibilities**: Converts Evaluation results into persistent Rules in Memory.

## 20. Experiment Engine
- **Purpose**: A/B testing management.
- **Responsibilities**: Tracks experimental variations and calculates statistical significance.

## 21. Technology Watch
- **Purpose**: Ecosystem monitoring.
- **Responsibilities**: Scans for new LLMs, SEO trends, and integrations.

## 22. Capability Gap Detector
- **Purpose**: Identifies missing system features.
- **Responsibilities**: Flags when the Brain cannot complete a task due to missing technical implementation.

## 23. Self-Healing Engine
- **Purpose**: Error recovery.
- **Responsibilities**: Catches tool/model failures, classifies them, and retries with alternative parameters.

## 24. Permission Engine
- **Purpose**: Security.
- **Responsibilities**: Enforces "Bounded Autonomy" (e.g., blocking autonomous destructive actions).

## 25. Approval Engine
- **Purpose**: Human-in-the-loop management.
- **Responsibilities**: Pauses execution and alerts the Admin for required sign-offs.

## 26. Scheduler
- **Purpose**: Temporal execution.
- **Responsibilities**: Ticks the Brain loop (likely via Vercel cron targeting a new Brain API).

## 27. Event Engine
- **Purpose**: Reactive execution.
- **Responsibilities**: Listens for system events (e.g., `article_published`) to trigger Brain modules.

## 28. Observability
- **Purpose**: Transparency.
- **Responsibilities**: Logs all Brain thoughts, decisions, and actions for Admin review.

## 29. Audit Log
- **Purpose**: Compliance.
- **Responsibilities**: Writes to `audit_logs` table for critical state changes.

## 30. Cost Controller
- **Purpose**: Budget enforcement.
- **Responsibilities**: Tracks token usage and blocks execution if daily limits are breached.

## 31. Revenue Intelligence
- **Purpose**: Financial tracking.
- **Responsibilities**: Maps affiliate clicks and owned-product sales back to specific content pieces.

## 32. Strategy Version Manager
- **Purpose**: Strategy tracking.
- **Responsibilities**: Maintains history of past business strategies to prevent cyclical mistakes.

# 32 AI BRAIN GAP ANALYSIS

*Comparing the Current ViaFinds system vs. the requirements of the Future AI Brain.*

| Capability | Current Status | AI Brain Requirement | Gap / Action |
|------------|----------------|----------------------|--------------|
| **1. Memory** | None. Only DB records of past articles. | Must remember past strategies, failures, and performance metrics. | **New Component**: Vector DB or Knowledge Graph layer needed. |
| **2. Task System** | Rigid pipeline (`pipeline.ts`). | Autonomous breakdown of tasks. | **Modify**: Decouple `pipeline.ts` into individual Agent Tools. |
| **3. Agent Orchestration** | Basic Registry (`AgentRegistry`). | Master Agent routing sub-tasks. | **New Component**: Orchestration engine. |
| **4. Tool Registry** | Static service connections. | Agents must dynamically call tools (Search, Scrape, Query). | **New Component**: Standardized Tool APIs. |
| **5. Strategy Engine** | Hardcoded in `pipeline.ts` switch statements. | Analyzes traffic and decides *what* to write/promote next. | **New Component**: Strategy Agent layer. |
| **6. Business Intelligence** | None. | Reads PostHog/Plausible APIs to measure conversion rates. | **New Component**: Analytics Feedback Loop. |
| **7. Self-Healing** | Tries next LLM on API error. | If content generation fails, re-plan the approach. | **Modify**: Agents need autonomous retry/re-plan logic. |
| **8. Permissions/Approval**| Built-in (Admin must approve drafts). | Brain must understand what it can publish vs what needs a human. | **Reuse**: Existing `awaiting_approval` status in jobs table. |
| **9. Observability** | Good. (Audit logs, Sentry). | Brain actions must be fully traceable in a "Thought Log". | **Reuse/Modify**: Extend `audit_logs` to include LLM reasoning traces. |

## Conclusion
The current system is an excellent **Execution Engine** (hands and feet). The gap is entirely cognitive: it lacks the **Strategy Engine** (the Brain) to decide what to do next without a human pasting a link or a rigid cron job firing a static discovery script.

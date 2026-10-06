# 01 AI BRAIN ARCHITECTURE

## High-Level Topology

```text
                         USER
                           │
                           ▼
                    ┌──────────────┐
                    │   AI BRAIN   │
                    └──────┬───────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
       ▼                   ▼                   ▼
   MEMORY              RESEARCH           BUSINESS DATA
       │                   │                   │
       ▼                   ▼                   ▼
 KNOWLEDGE GRAPH      AGENT REACH        ANALYTICS
       │                   │                   │
       └───────────────────┼───────────────────┘
                           ▼
                    STRATEGY ENGINE
                           │
                           ▼
                    OPPORTUNITY ENGINE
                           │
                           ▼
                     TASK ENGINE
                           │
                           ▼
                 AGENT ORCHESTRATOR
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
        TOOLS          AUTOMATION       RESEARCH
            │              │              │
            └──────────────┼──────────────┘
                           ▼
                    EXISTING JOB SYSTEM
                           │
                           ▼
                    EXISTING PIPELINE
                           │
                           ▼
                       RESULTS
                           │
                           ▼
                     EVALUATION
                           │
                           ▼
                        MEMORY
                           │
                           ▼
                       LEARNING
                           │
                           ▼
                  STRATEGY EVOLUTION
```

## Connection Explanations
1. **User $\rightarrow$ AI Brain**: The admin initiates goals, reviews proposed strategies, and approves high-risk actions via the Admin UI.
2. **Brain $\rightarrow$ Memory/Research/Business Data**: The Brain continuously ingests context. It reads PostHog analytics, queries the internal Knowledge Graph (DB), and uses Agent Reach to scan the web.
3. **Data $\rightarrow$ Strategy Engine**: The Strategy Engine synthesizes the ingested data to formulate a high-level approach (e.g., "Pivot from software reviews to SaaS case studies").
4. **Strategy $\rightarrow$ Opportunity Engine**: Identifies specific actionable opportunities matching the strategy (e.g., "Review software X").
5. **Opportunity $\rightarrow$ Task Engine**: Breaks down the opportunity into discrete tasks.
6. **Task Engine $\rightarrow$ Orchestrator**: The Orchestrator routes tasks to the appropriate executor: internal Tools, external Research agents, or the existing Automation Pipeline.
7. **Orchestrator $\rightarrow$ Existing Job System**: **Crucial integration point.** The Brain does not reinvent the wheel. It inserts a payload into `automation_jobs`.
8. **Pipeline $\rightarrow$ Results $\rightarrow$ Evaluation**: The existing pipeline completes the job. The Brain's Evaluation Engine grades the output.
9. **Evaluation $\rightarrow$ Memory $\rightarrow$ Learning**: Success/Failure metrics and critique are stored in Memory, altering the Strategy Engine's weights for the next cycle.

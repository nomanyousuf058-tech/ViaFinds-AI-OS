# 45 AI BRAIN FINAL DECISIONS

## The Definitive Answers

1. **What exactly is AI Brain?** An autonomous strategic layer that observes data, forms strategies, and dispatches tasks.
2. **What is it NOT?** It is not a chatbot, a prompt wrapper, or a replacement for the existing automation pipeline.
3. **What remains Automation?** The execution of content drafting, formatting, SEO checks, and DB insertion (`pipeline.ts`).
4. **What remains Jobs?** The state machine that tracks the progress of a specific generation sequence.
5. **What remains Agent Reach?** External web research and evidence collection.
6. **What remains Antigravity/Kilo?** Writing, modifying, and deploying production source code.
7. **What does Brain control?** Task delegation, strategy formulation, and the overarching business direction.
8. **What does Brain observe?** Traffic, conversion rates, search rankings, and external market trends.
9. **What does Brain remember?** Proven rules, past failures, audience preferences, and brand policies.
10. **What does Brain research?** Competitors, new products, and content gaps.
11. **What does Brain decide?** Which products to promote, what content format to use, and when to run an experiment.
12. **What does Brain execute?** Internal Tools. It delegates complex actions.
13. **What requires approval?** Publishing high-risk content, modifying existing content, spending money, and changing source code.
14. **What database changes are needed?** New relational tables: `brain_tasks`, `brain_memory`, `brain_strategies`, `brain_activity_log`, `brain_approvals`.
15. **What APIs are needed?** `/api/brain/*` endpoints for ticking the logic loop and feeding the Dashboard UI.
16. **What UI is needed?** Dashboard extensions for Approvals, Activity Logs, and Memory management.
17. **What existing code should be reused?** `AIRouter.ts`, `pipeline.ts`, Database clients, Next.js frontend.
18. **What existing code must be modified?** `automation_jobs` must accept a `brain_task_id`.
19. **What should NOT be changed?** The public-facing Next.js rendering engine and the core DB schema.
20. **What should be deprecated?** Manual admin trend discovery (eventually).
21. **How will Brain support owned digital products?** By identifying search intents that match high-margin owned products and generating dedicated content.
22. **How will Brain support affiliate products?** By continually scanning networks for the best EPC offers and maintaining link health.
23. **How will Brain support future business models?** Via versioned Strategies and the Capability Gap engine to request new features.
24. **How does Brain detect changing user behavior?** Through the Business Intelligence module reading analytics.
25. **How does Brain create new strategy?** By synthesizing analytics, research, and memory to hypothesize a better approach.
26. **How does Brain verify implementation?** By using its Evaluation Engine to check the final output against the original Strategy.
27. **How does Brain learn?** By grading the success of its actions and persisting the findings in the Knowledge Graph.
28. **How does Brain remain free-first?** Caching, batching, and routing simple logic to free/cheap models.
29. **What is Phase 1?** Building the Read-Only Observer (Strategy Engine + Business Intelligence).
30. **What is the exact implementation order?** Data Foundation $\rightarrow$ Observer $\rightarrow$ Orchestrator $\rightarrow$ Evaluation $\rightarrow$ Agent Reach $\rightarrow$ Full Autonomy.

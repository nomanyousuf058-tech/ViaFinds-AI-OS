# 24 AI BRAIN PERMISSIONS

## Principle of Bounded Autonomy
The AI Brain must be restricted by default. It earns autonomy only through proven reliability and Admin configuration.

## Permission Matrix

| Action Type | Default Permission | Approval Required? | Allowed Tools |
|-------------|--------------------|--------------------|---------------|
| **READ** (Analytics, DB) | Allowed | No | `query_db`, `read_analytics` |
| **RESEARCH** (Web, Competitors) | Allowed | No | `AgentReach`, `search_web` |
| **ANALYZE** (Evaluate performance) | Allowed | No | Internal LLM |
| **CREATE** (Draft new article) | Allowed | No | `queue_automation_job` |
| **PUBLISH** (Go Live) | **Denied** | **Yes** (Phase 1) | `publish_article` |
| **MODIFY** (Edit published article) | **Denied** | **Yes** | `propose_edit` |
| **DELETE** (Remove content) | **Denied** | **Yes** | None (Admin only) |
| **SPEND** (Buy API credits/ads) | **Denied** | **Yes** | None |
| **CODE** (Change source code) | **Denied** | **Yes** | `CapabilityGapEngine` |

## Enforcement
Permissions are enforced at the **Tool Registry** level. If the Brain attempts an action it lacks permission for, the Tool returns a `PermissionDeniedError`, forcing the Brain to queue an Approval Request instead.

## Rollback Requirements
Any action that modifies the database (e.g., updating a Strategy or Article) must support rollback. The Brain must save the previous state to the `audit_logs` or a dedicated versioning table before applying the change.

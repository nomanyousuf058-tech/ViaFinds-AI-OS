# 10 AI BRAIN TOOL REGISTRY

## Concept
The Tool Registry is the internal API that defines exactly what actions the Brain is allowed to execute autonomously.

## Core Brain Tools

### Observation & Data Tools
- `read_analytics(metric, date_range)`: Fetches data from Plausible/PostHog.
- `query_knowledge_graph(topic)`: Retrieves internal PostgreSQL relationships.
- `check_automation_status(job_id)`: Reads `automation_jobs` table.

### Action & Execution Tools
- `dispatch_research(query)`: Sends a request to Agent Reach.
- `queue_automation_job(payload)`: Inserts a task into the existing ViaFinds execution pipeline.
- `propose_strategy_update(strategy_json)`: Submits a new Strategy to the Admin for approval.
- `flag_capability_gap(description)`: Alerts Antigravity/Kilo that a system feature is missing.

### Memory Tools
- `store_memory(type, content, confidence)`: Inserts a new rule into `brain_memory`.
- `update_memory_confidence(id, new_confidence)`: Adjusts belief in a fact.

## Tool Execution Constraints
Tools are the enforcement mechanism for Permissions. 
For example, the Brain has a `queue_automation_job` tool, but it does NOT have a `drop_database_table` tool. By restricting the Tool Registry, we strictly bound the Brain's autonomy.

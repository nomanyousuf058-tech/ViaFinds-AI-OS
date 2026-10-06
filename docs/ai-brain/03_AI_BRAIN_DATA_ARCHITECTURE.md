# 03 AI BRAIN DATA ARCHITECTURE

## Database Strategy (PROPOSED)
The AI Brain requires persistent storage. However, per the Free-First design principle, we will **NOT** introduce an external vector database (like Pinecone) initially. We will leverage the existing Supabase PostgreSQL instance.

If semantic search is required, we will enable the `pgvector` extension natively within Supabase. For structured facts and rules, we will use standard relational tables with `JSONB`.

## Proposed Brain Schema Additions

### `brain_tasks`
- Tracks granular tasks orchestrated by the Brain (distinct from `automation_jobs`).
- **Columns**: `id`, `goal`, `status`, `tools_used`, `evidence`, `result`, `requires_approval`.

### `brain_memory`
- The core knowledge store.
- **Columns**: `id`, `type` (rule, fact, lesson), `content` (JSONB), `source_reference`, `confidence`, `expires_at`.

### `brain_strategies`
- Stores high-level operational directives.
- **Columns**: `id`, `version`, `name`, `description`, `status` (active, retired), `performance_score`.

### `brain_experiments`
- Tracks active A/B tests and investigations.
- **Columns**: `id`, `hypothesis`, `baseline_metric`, `target_metric`, `start_date`, `end_date`, `result`.

### `brain_capability_gaps`
- Stores detected system limitations to be passed to Antigravity/Kilo for coding.
- **Columns**: `id`, `description`, `detected_at`, `status` (open, requested, resolved), `implementation_request` (JSON).

## Mapping to Existing Tables (VERIFIED REUSE)
- `automation_jobs`: The Brain will INSERT into this table to trigger existing pipelines.
- `articles`: The Brain will READ from this to evaluate content coverage.
- `audit_logs`: The Brain will INSERT logs here for traceability.
- `service_connections`: The Brain will READ to know which tools are available.

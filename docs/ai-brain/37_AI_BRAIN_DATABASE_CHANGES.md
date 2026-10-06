# 37 AI BRAIN DATABASE CHANGES

## Core Principle
Do NOT drop or alter existing core tables (`articles`, `automation_jobs`) unnecessarily. Add new tables with foreign keys linking back to the core.

## Required New Tables (PostgreSQL)

### 1. `brain_memory`
Purpose: Long-term fact and rule storage.
Columns: `id`, `type`, `content` (JSONB), `confidence`, `source_reference`, `expires_at`.
*Replaces*: None. New capability.

### 2. `brain_strategies`
Purpose: Versioned business models.
Columns: `id`, `version`, `name`, `status`, `goals` (JSONB), `created_at`.
*Replaces*: Hardcoded logic in `pipeline.ts`.

### 3. `brain_tasks`
Purpose: Tracks high-level orchestration (e.g., "Research Top 10 CRM tools").
Columns: `id`, `strategy_id` (FK), `goal`, `status`, `result` (JSONB).
*Relationship*: 1 `brain_task` $\rightarrow$ Many `automation_jobs`.

### 4. `brain_approvals`
Purpose: Human-in-the-loop queue.
Columns: `id`, `task_id` (FK), `action_requested`, `risk_level`, `status`, `admin_feedback`.
*Replaces*: Nothing. Current system just halts `automation_jobs` at `awaiting_approval`. This is a dedicated queue for Brain-level decisions.

### 5. `brain_activity_log`
Purpose: Observability and Chain of Thought.
Columns: `id`, `timestamp`, `task_id` (FK), `action_type`, `content` (JSONB).
*Difference from `audit_logs`*: `audit_logs` tracks Admin actions and API access. `brain_activity_log` tracks LLM thoughts and decisions.

## Required Modifications to Existing Tables
- **`automation_jobs`**: Add `brain_task_id` (Nullable UUID) to track which Brain Task spawned the execution job.
- **`articles`**: Add `strategy_id` (Nullable UUID) to track which strategy resulted in this article being written (crucial for Evaluation).

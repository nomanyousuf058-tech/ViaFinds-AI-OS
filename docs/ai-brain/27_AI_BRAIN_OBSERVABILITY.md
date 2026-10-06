# 27 AI BRAIN OBSERVABILITY

## Purpose
The "Black Box" problem is the greatest risk of agentic systems. If the Admin asks, "Why did the Brain write this article?", the system must provide a deterministic, evidence-based answer.

## The Brain Activity Log
A new table `brain_activity_log` must be created. This is separate from the standard server `audit_logs`.

### Schema Requirements
- `id`: UUID
- `timestamp`: DateTime
- `task_id`: UUID
- `action_type`: Enum (Observation, Thought, Tool_Call, Tool_Result, Decision)
- `content`: JSONB (The exact LLM output or internal system state)
- `cost`: Float (API cost of this specific step)

## The "Chain of Thought" UI
The Admin Dashboard must include a "Brain Activity" viewer. 
It translates the `brain_activity_log` into a human-readable feed:
1. *09:00 AM* - **Observation**: Brain detected 20% traffic drop.
2. *09:02 AM* - **Thought**: "I need to check GSC to see which keywords dropped."
3. *09:03 AM* - **Tool**: Called `query_gsc`.
4. *09:05 AM* - **Decision**: Decided to queue an SEO Optimization Job for Article X.

This guarantees absolute transparency and allows the Admin to debug flawed reasoning.

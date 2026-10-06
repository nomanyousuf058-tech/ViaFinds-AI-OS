# 07 AI BRAIN TASK ENGINE

## Purpose
The Task Engine serves as the bridge between strategic thought and actionable execution. It converts abstract Opportunities into a DAG (Directed Acyclic Graph) of concrete steps.

## The Task Center
A dedicated tracking system (`brain_tasks` table) that is distinct from the existing `automation_jobs` table.
- `automation_jobs` = The hands (Execution Pipeline).
- `brain_tasks` = The thoughts (Brain planning).

## Supported Task Types
- Website Audit
- Full Project Audit
- Admin Dashboard Audit
- Automation Audit
- Agent Reach Market Research
- Competitor Research
- Industry Comparison
- Digital Product Trend Research
- Affiliate Product Research
- Owned Product Research
- Revenue/Monetization Audit
- Content Strategy & Publishing Strategy
- SEO/Search Performance Analysis
- Technology Watch
- Find Missing/Broken/Unused Features
- Verify Fix
- Strategy Review

## Task Definition Schema
Each task record must contain:
- `id`: UUID
- `goal`: String (e.g., "Audit top 3 competitors for Product X")
- `inputs`: JSONB (URLs, context)
- `tools_allowed`: Array of Strings
- `execution_state`: Enum (planning, researching, executing, verifying, done)
- `findings`: JSONB
- `recommendation`: Text
- `approval_required`: Boolean
- `memory_update_flag`: Boolean (Should this result in a new memory rule?)

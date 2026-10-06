# 12 PHASE 2 API

## Overview
Added REST endpoints to support the Brain Dashboard's new tabs.

## Endpoints Created
- `GET /api/brain/status`: Expanded to return strategy/opportunity counts.
- `GET /api/brain/reports`: Fetches Phase 1 observation cycles.
- `GET /api/brain/tasks`: Lists tasks.
- `POST /api/brain/tasks`: Creates a queued task.
- `GET /api/brain/tasks/[id]`: Fetches single task.
- `POST /api/brain/tasks/[id]`: Executes the LLM analysis loop for a task, returning JSON.
- `GET /api/brain/strategies`: Lists strategies.
- `POST /api/brain/strategies/[id]`: Approves/Rejects a strategy.
- `GET /api/brain/opportunities`: Lists opportunities.
- `GET /api/brain/implementation-requests`: Lists capability gap requests.
- `POST /api/brain/implementation-requests`: Manually creates a gap request.

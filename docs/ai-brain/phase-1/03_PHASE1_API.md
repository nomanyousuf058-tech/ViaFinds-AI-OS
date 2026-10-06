# 03 PHASE 1 API

## Endpoints

### `GET /api/brain/status`
Returns the operational status of the Brain.
- Mode: `READ-ONLY OBSERVER`
- Details on connected Data Sources.
- Limitations list.

### `GET /api/brain/reports`
Returns the 10 most recent Brain reports, ordered by `created_at` descending.

### `POST /api/brain/wake`
Triggers the `wakeBrain()` function.
- Synchronously builds context, queries the LLM, and updates the database.
- Returns the full generated report.
- Fully isolated from executing any tasks.

# 39 AI BRAIN FAILURE MODES

## Anticipated Failures & Graceful Degradation

### 1. Total LLM API Outage (All Providers Down)
- **Failure**: Brain cannot generate strategy, tasks, or evaluate.
- **Degradation**: Brain pauses all `brain_tasks`. Existing `automation_jobs` might also fail. UI displays "Brain Offline: API Outage". Site continues serving cached articles normally.

### 2. Memory Contradiction / Logic Loop
- **Failure**: Brain learns a false rule ("All articles must be 10 words long") and loops endlessly trying to publish them.
- **Degradation**: The Quality Gate catches the 10-word articles. After 3 Quality Gate failures, the Brain marks the task as `FAILED` and halts. Admin reviews the Activity Log and deletes the corrupted memory.

### 3. External API Outage (e.g., Digistore24)
- **Failure**: Opportunity Engine cannot find new affiliate products.
- **Degradation**: Brain switches to optimizing existing Owned Products or doing technical SEO audits instead of creating net-new affiliate content.

### 4. Budget Exhaustion
- **Failure**: `AI_DAILY_BUDGET_USD` hits limit.
- **Degradation**: Brain stops executing. Task Engine freezes.

### 5. Prompt Injection (Security Failure)
- **Failure**: Agent Reach reads a malicious site commanding it to spam the database.
- **Degradation**: Bounded Tool Registry prevents SQL injection. Approval System catches the spam before it is published. Evaluator flags the anomaly.

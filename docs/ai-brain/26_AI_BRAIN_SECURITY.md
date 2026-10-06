# 26 AI BRAIN SECURITY

## Threat Model
The Brain introduces new vectors for security risks compared to the static Automation Pipeline.
1. **Prompt Injection**: If the Brain scrapes a malicious website (e.g., during Competitor Research), the site could contain hidden text commanding the Brain to delete databases or leak API keys.
2. **Autonomous Spending**: If the Brain gets stuck in a logic loop, it could consume thousands of dollars in API credits.
3. **Data Exfiltration**: A malicious prompt could trick the Brain into sending user analytics data to a third-party server.

## Mitigations

### 1. The Bounded Tool Registry (Defense in Depth)
The Brain CANNOT execute raw SQL. It CANNOT execute arbitrary shell commands. It only has access to explicit, hardcoded Node.js functions (Tools). Even if prompt injection occurs, the Brain physically lacks the "hands" to drop a database table.

### 2. Context Sanitization
Before Agent Reach data is passed to the Brain's reasoning engine, it should pass through a cheap LLM filter (e.g., Llama 3 on Groq) instructed solely to detect and neutralize prompt injection attempts.

### 3. Hard Quotas
The `.env` budget trackers (`AI_DAILY_BUDGET_USD`) must be strictly enforced at the `AIRouter` level, completely independent of the Brain's logic. If the budget hits $0, the router throws a hard error, freezing the Brain.

### 4. Row Level Security (RLS)
The Brain connects to Supabase using a scoped service role or dedicated database user that has `INSERT`/`UPDATE` rights on `articles` but NO `DELETE` rights.

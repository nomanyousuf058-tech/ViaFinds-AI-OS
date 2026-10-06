# 23 AI BRAIN SELF HEALING

## Purpose
Graceful degradation and autonomous recovery from transient or structural failures without crashing the entire system or waking up the Admin.

## Classification of Failures
1. **Transient API Errors** (e.g., 502 Bad Gateway from Groq).
   - *Healing*: Caught by the existing `AIRouter`. Automatically falls back to the next provider. No Brain intervention needed.
2. **Tool Failures** (e.g., Target website blocks the scraping tool with Cloudflare).
   - *Healing*: Brain catches the `ToolError`. It researches an alternative (e.g., "Can I find this information in Google's cached results or via an open API?"). It retries with the new approach.
3. **Logic/Quality Failures** (e.g., Quality Gate rejects an article for hallucinating a feature).
   - *Healing*: The Brain passes the rejection reason to the Content Agent and commands a targeted rewrite.
4. **Structural Failures** (e.g., Digistore24 changes their hop-link format globally).
   - *Healing*: Brain detects a systemic 404 error across multiple tasks. It flags the system as `Degraded`, halts execution of affected tasks, and triggers a High Priority Alert to the Admin with a Capability Gap request.

## Self-Healing Constraints
- **Max Retries**: The Brain must not infinite-loop. If a task fails 3 different healing attempts, it is marked `FAILED` and abandoned.
- **Permission Boundary**: The Brain cannot "self-heal" by guessing an API key or bypassing the `.env` configuration.

# 40 AI BRAIN COST AND FREE-TIER STRATEGY

## The Challenge
An autonomous agent that runs 24/7 and reads massive amounts of analytics context can easily consume hundreds of dollars a day in API costs if not carefully architected.

## Free-First Design Principles

1. **Strategic Batching**: 
   - The Strategy Engine does not run on every pageview. It runs once a day, analyzing a batched summary of the previous day's analytics.

2. **Model Tiering**:
   - Complex reasoning (Strategy): Gemini 1.5 Pro / Claude 3.5 Sonnet (Paid).
   - Routine data formatting (JSON extraction): Groq Llama 3 / Mistral (Free/Ultra-cheap).
   - Tool calling: Gemini 1.5 Flash (Free tier available).

3. **Memory Caching**:
   - The Context Builder must not load the *entire* `brain_memory` into the prompt. It uses PostgreSQL `TSVECTOR` search to pull only the 5 most relevant rules for the specific task.

4. **Preventing LLM Loops**:
   - A hard limit of `MAX_AGENT_STEPS = 5` is enforced in the Orchestrator. If a task cannot be resolved in 5 LLM calls, it is aborted to prevent infinite token consumption.

5. **Utilizing Existing Scraping**:
   - The Brain should reuse the existing deterministic DOM parsers for scraping basic info, reserving LLMs only for semantic understanding.

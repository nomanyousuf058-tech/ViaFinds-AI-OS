# 11 AI BRAIN MODEL ROUTER

## Reusing Existing Infrastructure
ViaFinds already has a highly robust multi-provider `AIRouter` located in `core/ai/AIRouter.ts`. **The AI Brain MUST reuse this router.** Do not build a second routing system.

## Routing Logic for Cognitive Tasks
The Brain's cognitive tasks vary wildly in complexity. The router must dynamically select the model based on the task:

1. **Strategy Generation (High Complexity, High Context)**
   - *Requires*: Deep reasoning, massive context window (to read Memory + Analytics).
   - *Target*: Gemini 1.5 Pro / Claude 3.5 Sonnet / OpenAI o1.
   
2. **Task Orchestration / Tool Calling (Medium Complexity, High Reliability)**
   - *Requires*: Strict JSON adherence, reliable function calling.
   - *Target*: Gemini 1.5 Flash / GPT-4o-mini.

3. **Memory Distillation / Summarization (Low Complexity, High Volume)**
   - *Requires*: Speed, extremely low cost.
   - *Target*: Groq (Llama 3) / Mistral.

## Cost & Free-First Strategy
The Model Router must adhere to the `AI_QUOTA_TRACKING_ENABLED` environment variables. 
- The Brain must cache its research and memory retrievals.
- Background cron tasks that summarize daily analytics MUST default to the cheapest available open-weight models via Groq or Cloudflare Workers AI unless complex reasoning is strictly required.

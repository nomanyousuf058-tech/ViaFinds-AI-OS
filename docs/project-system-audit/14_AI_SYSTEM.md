# 14 AI SYSTEM

## AI Router Architecture (`core/ai/AIRouter.ts`)
ViaFinds does not hardcode a single AI provider (like OpenAI). It implements a sophisticated, multi-provider `AIRouter` designed for extreme resilience and cost-efficiency.

### Provider Priority Sequence
1. Gemini (Default/Primary)
2. Groq
3. Mistral
4. OpenRouter
5. OpenAI
6. Claude
7. DeepSeek
8. Ollama (Local fallback)

### The Routing Logic
When the system needs an LLM completion:
1. `AIRouter.route(payload)` is called.
2. It iterates through the priority sequence.
3. **Gate 1**: Checks if the API key is configured in `.env`. If not, skips.
4. **Gate 2**: Checks if the provider is registered in `ProviderRegistry`.
5. **Execution**: Attempts the generation.
6. **Failover**: If the provider throws an error (e.g., 429 Rate Limit, 500 Server Error, or Timeout), the router catches it, logs a warning, and *immediately* tries the next provider in the list.
7. **Success**: Returns on the first successful generation.

### Image Generation Routing (`routeImage`)
Image generation has its own routing sequence:
1. Paid Providers: Fal, BFL, Ideogram, Leonardo, Stability AI, Replicate, OpenAI (DALL-E).
2. **Free Fallback**: Cloudflare Workers AI (Stable Diffusion XL).
3. **Storage**: Generated images are automatically uploaded to Supabase Storage, and the public URL is returned.
4. **Final Fallback**: If all else fails, it generates a dynamic text placeholder image using `placehold.co`.

## Prompt Library (`core/ai/prompts/PromptLibrary.ts`)
- Centralized management of prompts.
- Versioned (e.g., `article_generation` v2).
- Validates required variables before execution.

## The Providers Directory
Located in `providers/`, the system contains adapter classes for massive array of AI services:
- `BaseProvider.ts` (Interface)
- `GeminiProvider.ts`, `OpenAIProvider.ts`, `ClaudeProvider.ts`
- Specialized video/image providers: `RunwayProvider.ts`, `LumaProvider.ts`, `KlingProvider.ts`, `HaiperProvider.ts`, `PikaProvider.ts`.

## AI vs System Integration
The AI is treated as a "pure function" utility. The Automation Pipeline prepares data, calls the AI Router, gets JSON back, and the Pipeline updates the Database. The AI does *not* have direct access to execute code, query the database, or browse the web autonomously.

# 19 EXTERNAL INTEGRATIONS REGISTRY

ViaFinds connects to a massive ecosystem of external APIs. 

## AI & Language Models (Text)
- **Google Gemini** (Primary driver)
- **Groq** (Fast inference)
- **Mistral**
- **OpenAI** (ChatGPT)
- **Anthropic** (Claude)
- **DeepSeek**
- **OpenRouter** (Aggregator fallback)
- **Ollama** (Local deployment support)
- *Others supported in config*: LongCat, Cerebras, Cohere, Qwen, Z.ai, Together AI, Fireworks AI, SambaNova, Nvidia NIM, Hugging Face, AI21, Perplexity.

## AI Image & Video Generation
- **Cloudflare Workers AI** (Stable Diffusion XL - Used as the Free Fallback layer)
- **Fal AI**
- **Ideogram**
- **Leonardo**
- **Stability AI**
- **Replicate**
- **OpenAI (DALL-E)**
- **Video**: Luma, Pika, Runway, Haiper, Kling, Google Veo.

## Infrastructure & Hosting
- **Vercel**: Next.js hosting, Edge functions, Cron jobs.
- **Supabase**: PostgreSQL Database, Auth (via DB), Storage (Image hosting).
- **Cloudflare**: R2 Storage (configured), AI Workers.
- **AWS S3**: Storage alternative.
- **Redis**: Caching layer.

## Affiliate & Business
- **Digistore24**: Specifically targeted in automation code for product discovery and link generation.
- **ClickBank**: Mentioned in trend discovery prompts.

## Marketing & SEO
- **Google Search Console**: Configured for auto-indexing.
- **Email**: Resend, SendGrid, Mailgun, SMTP configured for notifications/newsletters.
- **Analytics**: PostHog, Mixpanel, Plausible.

## Testing
- **Playwright**: E2E testing framework.
- **Jest**: Unit testing.

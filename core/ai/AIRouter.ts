import { AIProviderType, AIPromptPayload, AIProviderResponse } from './types';
import { providerRegistry } from '../../providers/ProviderRegistry';
import { defaultProviderConfigs } from '../../providers/ProviderConfig';
import { logger } from '../../lib/logger';


/** Providers that require an API key to be configured. Ollama is local-only. */
const REQUIRES_API_KEY: Set<AIProviderType> = new Set([
  AIProviderType.GEMINI,
  AIProviderType.OPENAI,
  AIProviderType.CLAUDE,
  AIProviderType.OPENROUTER,
  AIProviderType.GROQ,
  AIProviderType.DEEPSEEK,
  AIProviderType.MISTRAL,
]);

export class AIRouter {
  /**
   * Priority order — Gemini is the primary development provider.
   */
  private providerPriority: AIProviderType[] = [
    AIProviderType.GEMINI,
    AIProviderType.GROQ,
    AIProviderType.MISTRAL,
    AIProviderType.OPENROUTER,
    AIProviderType.OPENAI,
    AIProviderType.CLAUDE,
    AIProviderType.DEEPSEEK,
    AIProviderType.OLLAMA,
  ];

  private providersLoaded = false;

  /**
   * Routes the prompt to the best available provider based on priority and health.
   * Logs detailed diagnostics for every provider attempt.
   * Stops immediately after the first successful response.
   */
  public async route(payload: AIPromptPayload, preferredProvider?: AIProviderType): Promise<AIProviderResponse> {
    if (!this.providersLoaded) {
      const { ProviderLoader } = require('../../providers/ProviderLoader');
      await ProviderLoader.loadProviders();
      this.providersLoaded = true;
    }

    const sequence = this.getRoutingSequence(preferredProvider);
    const report: string[] = [];

    logger.info('================================');
    logger.info('AIRouter: Beginning provider routing');
    logger.info(`Provider sequence: ${sequence.join(' → ')}`);
    logger.info('================================');

    for (const providerType of sequence) {
      const config = defaultProviderConfigs[providerType];
      const provider = providerRegistry.getProvider(providerType);
      const isRegistered = !!provider;
      const isConfigured = this.isProviderConfigured(providerType);
      const model = config?.defaultModel ?? 'N/A';

      logger.info('--------------------------------');
      logger.info(`Trying provider: ${providerType}`);
      logger.info(`  Registered: ${isRegistered}`);
      logger.info(`  Configured: ${isConfigured}`);
      logger.info(`  Model:      ${model}`);

      // --- Gate 1: Not configured (missing API key) — skip without attempting ---
      if (!isConfigured) {
        const reason = 'missing API key';
        logger.warn(`  Provider error: ${reason} — skipping`);
        logger.info('--------------------------------');
        report.push(`${this.formatProviderName(providerType)}:\nSkipped\nReason: ${reason}`);
        continue;
      }

      // --- Gate 2: Not registered in ProviderRegistry ---
      if (!isRegistered) {
        const reason = 'not registered in ProviderRegistry';
        logger.warn(`  Provider error: ${reason} — skipping`);
        logger.info('--------------------------------');
        report.push(`${this.formatProviderName(providerType)}:\nSkipped\nReason: ${reason}`);
        continue;
      }

      // NOTE: Health check is ADVISORY only. We always attempt the actual request
      // regardless of health status. Health checks can fail due to cold starts,
      // network blips, or sandbox restrictions — they must not block real requests.
      logger.info(`  Attempting request (health check is advisory, not a gate)...`);

      // --- Attempt the actual request ---
      try {
        const response = await provider!.generateCompletion(payload);
        logger.info(`  ✓ Provider ${providerType} SUCCESS (model=${response.model}, tokens=${response.totalTokens ?? 'N/A'})`);
        logger.info('--------------------------------');
        report.push(`${this.formatProviderName(providerType)}:\nSUCCESS`);
        // Stop immediately after a successful response — no further fallback.
        return response;
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`  ✗ Provider ${providerType} FAILED: ${errMessage}`);
        logger.info('--------------------------------');
        report.push(`${this.formatProviderName(providerType)}:\nFailed\nReason: ${errMessage}`);
        
        // All provider errors are treated as non-fatal — always try the next provider
        continue;
      }
    }

    // --- All providers exhausted ---
    logger.error('================================');
    logger.error('AIRouter: All providers failed.');
    logger.error('Detailed provider report:');
    report.forEach((line) => logger.error(`\n${line}`));
    logger.error('================================');

    const finalError = new Error(
      `Pipeline failed:\nAll providers failed to generate a response.\n\n` +
      `Provider report:\n\n${report.join('\n\n')}`
    );
    (finalError as any).providerReport = report;
    throw finalError;
  }

  /**
   * Routes an image generation prompt to the first available image provider.
   * Falls back to free Cloudflare Workers AI + Supabase Storage if all paid providers fail.
   */
  public async routeImage(prompt: string, partnerImageUrl?: string): Promise<string> {
    if (!this.providersLoaded) {
      const { ProviderLoader } = require('../../providers/ProviderLoader');
      await ProviderLoader.loadProviders();
      this.providersLoaded = true;
    }

    const imageProviders = [
      AIProviderType.FAL,
      AIProviderType.BFL,
      AIProviderType.IDEOGRAM,
      AIProviderType.LEONARDO,
      AIProviderType.STABILITY_AI,
      AIProviderType.REPLICATE,
      AIProviderType.OPENAI, // DALL-E
    ];

    logger.info('================================');
    logger.info('AIRouter: Beginning image provider routing');
    logger.info('================================');

    for (const providerType of imageProviders) {
      const provider = providerRegistry.getProvider(providerType) as any;
      if (!provider || !this.isProviderConfigured(providerType) || !provider.generateImage) {
        continue;
      }

      logger.info(`Trying image provider: ${providerType}`);
      try {
        const imageUrl = await provider.generateImage(prompt);
        // If it's not a stub, or we assume the provider is implemented
        if (imageUrl && !imageUrl.includes('stub-')) {
          logger.info(`  ✓ Image Provider ${providerType} SUCCESS`);
          return imageUrl;
        }
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`  ✗ Image Provider ${providerType} FAILED: ${errMessage}`);
      }
    }

    // Try scraped partner image
    if (partnerImageUrl && partnerImageUrl.startsWith('http') && !partnerImageUrl.includes('placeholder')) {
      const decodedUrl = partnerImageUrl.replace(/&#x3D;/g, '=').replace(/&amp;/g, '&');
      logger.info(`Using scraped partner product image from official site: ${decodedUrl}`);
      return decodedUrl;
    }

    // FREE FALLBACK: Cloudflare Workers AI (Stable Diffusion XL) + Supabase Storage
    const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const cfToken = process.env.CLOUDFLARE_API_TOKEN;
    const supabaseKey = process.env['Api-key'] || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseRef = this.getSupabaseRef();

    if (cfAccountId && cfToken && supabaseKey && supabaseRef) {
      logger.info('Trying FREE Cloudflare Workers AI image generation...');
      try {
        const imagePrompt = `Professional product cover image for: ${prompt}, modern clean design, high quality, editorial style, no text overlay`;
        const cfRes = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${cfToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: imagePrompt }),
          }
        );

        if (cfRes.ok && cfRes.headers.get('content-type')?.includes('image')) {
          const imageBuffer = Buffer.from(await cfRes.arrayBuffer());
          logger.info(`  ✓ Cloudflare AI generated image: ${imageBuffer.length} bytes`);

          // Upload to Supabase Storage
          const filename = `cover-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
          const uploadRes = await fetch(
            `https://${supabaseRef}.supabase.co/storage/v1/object/article-images/${filename}`,
            {
              method: 'POST',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'image/png',
                'x-upsert': 'true',
              },
              body: imageBuffer,
            }
          );

          if (uploadRes.ok) {
            const publicUrl = `https://${supabaseRef}.supabase.co/storage/v1/object/public/article-images/${filename}`;
            logger.info(`  ✓ Image uploaded to Supabase Storage: ${publicUrl}`);
            return publicUrl;
          } else {
            const errBody = await uploadRes.text();
            logger.warn(`  ✗ Supabase upload failed (${uploadRes.status}): ${errBody}`);
          }
        } else {
          const errBody = await cfRes.text();
          logger.warn(`  ✗ Cloudflare AI failed (${cfRes.status}): ${errBody.substring(0, 200)}`);
        }
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`  ✗ Cloudflare AI image generation FAILED: ${errMessage}`);
      }
    }

    // Final fallback: dynamic text placeholder
    logger.warn('All image generation methods failed. Using text placeholder.');
    const shortTitle = prompt.length > 50 ? prompt.substring(0, 47) + '...' : prompt;
    const encodedText = encodeURIComponent(shortTitle);
    const placeholderUrl = `https://placehold.co/1200x630/2c3e50/ffffff.png?text=${encodedText}`;
    logger.info(`Generated fallback text placeholder: ${placeholderUrl}`);
    return placeholderUrl;
  }

  /**
   * Extract Supabase project reference from DATABASE_URL
   */
  private getSupabaseRef(): string | null {
    const dbUrl = process.env.DATABASE_URL || '';
    // Extract from format: postgresql://postgres.{ref}:password@...
    const match = dbUrl.match(/postgres\.([a-z0-9]+)[:|@]/);
    if (match) return match[1];
    return null;
  }

  private formatProviderName(type: string): string {
    const map: Record<string, string> = {
      gemini: 'Gemini',
      groq: 'Groq',
      openrouter: 'OpenRouter',
      deepseek: 'DeepSeek',
      mistral: 'Mistral',
      openai: 'OpenAI',
      claude: 'Claude',
      ollama: 'Ollama',
    };
    return map[type] || (type.charAt(0).toUpperCase() + type.slice(1));
  }

  private isFallbackError(errorText: string): boolean {
    const text = errorText.toLowerCase();
    const fallbackTriggers = [
      '429', 'too many requests', 'rate limited', 'rate_limit_exceeded',
      '401', 'billing required', 'billing_required', 'unauthorized',
      '402', 'payment required', 'payment_required',
      '403', 'quota exhausted', 'insufficient_quota', 'free tier exhausted', 'quota exceeded',
      '404', 'model unavailable', 'invalid model', 'not found',
      '408', 'timeout',
      '500', '502', '503', '504',
      'network error', 'network failure', 'fetch failed', 'econnrefused'
    ];
    return fallbackTriggers.some(trigger => text.includes(trigger));
  }

  /**
   * Checks whether a provider has the credentials / config needed to make requests.
   * Ollama is local and does not require an API key.
   * Cloud providers require an API key in their config.
   */
  private isProviderConfigured(type: AIProviderType): boolean {
    if (!REQUIRES_API_KEY.has(type)) {
      // Ollama — always considered configured (connectivity is checked via health).
      return true;
    }

    const provider = providerRegistry.getProvider(type);
    if (provider && (provider as any).config?.apiKey) {
      return true;
    }

    const config = defaultProviderConfigs[type];
    const key = config?.apiKey ||
      (type === AIProviderType.GEMINI ? process.env.GEMINI_API_KEY :
       type === AIProviderType.OPENAI ? process.env.OPENAI_API_KEY :
       type === AIProviderType.CLAUDE ? process.env.ANTHROPIC_API_KEY :
       type === AIProviderType.OPENROUTER ? process.env.OPENROUTER_API_KEY :
       type === AIProviderType.GROQ ? process.env.GROQ_API_KEY :
       type === AIProviderType.DEEPSEEK ? process.env.DEEPSEEK_API_KEY :
       type === AIProviderType.MISTRAL ? process.env.MISTRAL_API_KEY : undefined);

    return !!key;
  }

  private getRoutingSequence(preferred?: AIProviderType): AIProviderType[] {
    if (preferred) {
      // Put preferred first, followed by the standard priority
      const fallback = this.providerPriority.filter(p => p !== preferred);
      return [preferred, ...fallback];
    }
    return this.providerPriority;
  }
}

export const aiRouter = new AIRouter();

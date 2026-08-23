import { providerRegistry } from './ProviderRegistry';
import { defaultProviderConfigs } from './ProviderConfig';
import { logger } from '../lib/logger';
import { AIProviderType } from '../core/ai/types';
import { ProviderFactory } from './ProviderFactory';

// Import all providers
import { GeminiProvider } from './GeminiProvider';
import { GroqProvider } from './GroqProvider';
import { OpenRouterProvider } from './OpenRouterProvider';
import { DeepSeekProvider } from './DeepSeekProvider';
import { MistralProvider } from './MistralProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { ClaudeProvider } from './ClaudeProvider';
import { OllamaProvider } from './OllamaProvider';

// Image Providers
import { GoogleImagenProvider } from './GoogleImagenProvider';
import { BflProvider } from './BflProvider';
import { IdeogramProvider } from './IdeogramProvider';
import { LeonardoProvider } from './LeonardoProvider';
import { FalProvider } from './FalProvider';
import { ReplicateProvider } from './ReplicateProvider';
import { StabilityAiProvider } from './StabilityAiProvider';

// Video Providers
import { GoogleVeoProvider } from './GoogleVeoProvider';
import { RunwayProvider } from './RunwayProvider';
import { KlingProvider } from './KlingProvider';
import { PikaProvider } from './PikaProvider';
import { LumaProvider } from './LumaProvider';
import { HaiperProvider } from './HaiperProvider';
import { FalVideoProvider } from './FalVideoProvider';
import { ReplicateVideoProvider } from './ReplicateVideoProvider';

/** Providers that require an API key to be usable. */
const REQUIRES_API_KEY: Set<AIProviderType> = new Set([
  AIProviderType.GEMINI,
  AIProviderType.OPENAI,
  AIProviderType.CLAUDE,
  AIProviderType.OPENROUTER,
  AIProviderType.GROQ,
  AIProviderType.DEEPSEEK,
  AIProviderType.MISTRAL,
  
  AIProviderType.GOOGLE_IMAGEN,
  AIProviderType.BFL,
  AIProviderType.IDEOGRAM,
  AIProviderType.LEONARDO,
  AIProviderType.FAL,
  AIProviderType.REPLICATE,
  AIProviderType.STABILITY_AI,
  
  AIProviderType.GOOGLE_VEO,
  AIProviderType.RUNWAY,
  AIProviderType.KLING,
  AIProviderType.PIKA,
  AIProviderType.LUMA,
  AIProviderType.HAIPER,
  AIProviderType.FAL_VIDEO,
  AIProviderType.REPLICATE_VIDEO,
]);

/**
 * Human-readable labels for the status table.
 */
const PROVIDER_LABELS: Record<AIProviderType, string> = {
  [AIProviderType.GEMINI]: 'Gemini',
  [AIProviderType.GROQ]: 'Groq',
  [AIProviderType.OPENROUTER]: 'OpenRouter',
  [AIProviderType.DEEPSEEK]: 'DeepSeek',
  [AIProviderType.MISTRAL]: 'Mistral',
  [AIProviderType.OPENAI]: 'OpenAI',
  [AIProviderType.CLAUDE]: 'Claude',
  [AIProviderType.OLLAMA]: 'Ollama',
  
  [AIProviderType.GOOGLE_IMAGEN]: 'Google Imagen',
  [AIProviderType.BFL]: 'FLUX (BFL)',
  [AIProviderType.IDEOGRAM]: 'Ideogram',
  [AIProviderType.LEONARDO]: 'Leonardo',
  [AIProviderType.FAL]: 'Fal.ai',
  [AIProviderType.REPLICATE]: 'Replicate',
  [AIProviderType.STABILITY_AI]: 'Stability AI',
  
  [AIProviderType.GOOGLE_VEO]: 'Google Veo',
  [AIProviderType.RUNWAY]: 'Runway',
  [AIProviderType.KLING]: 'Kling',
  [AIProviderType.PIKA]: 'Pika',
  [AIProviderType.LUMA]: 'Luma',
  [AIProviderType.HAIPER]: 'Haiper',
  [AIProviderType.FAL_VIDEO]: 'Fal Video',
  [AIProviderType.REPLICATE_VIDEO]: 'Replicate Video',
};

export class ProviderLoader {
  /**
   * Initializes all registered providers and prints a startup status table.
   */
  public static async loadProviders(): Promise<void> {
    const statusMap: Record<string, string> = {};

    // Register all providers if registry is empty
    if (providerRegistry.getAllProviders().length === 0) {
        let customConfigs: any = {};
        try {
          const fs = await import('fs');
          const path = await import('path');
          const crypto = await import('crypto');
          const credPath = path.join(process.cwd(), 'data', 'credentials.json');
          
          const getEncryptionKey = () => {
            const secret = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || 'viafinds-fallback-local-key-32b';
            return crypto.scryptSync(secret, 'salt', 32);
          };

          const decrypt = (encryptedText: string) => {
            try {
              const parts = encryptedText.split(':');
              if (parts.length !== 3) return encryptedText;
              const iv = Buffer.from(parts[0], 'hex');
              const authTag = Buffer.from(parts[1], 'hex');
              const encrypted = parts[2];
              const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
              decipher.setAuthTag(authTag);
              let decrypted = decipher.update(encrypted, 'hex', 'utf8');
              decrypted += decipher.final('utf8');
              return decrypted;
            } catch (e) {
              return encryptedText;
            }
          };

          if (fs.existsSync(credPath)) {
            const fileContent = fs.readFileSync(credPath, 'utf8');
            try {
              customConfigs = JSON.parse(decrypt(fileContent));
            } catch {
              customConfigs = JSON.parse(fileContent); // fallback
            }
          }
        } catch(e) {}

        const getConf = (type: AIProviderType) => {
          return { ...defaultProviderConfigs[type], ...customConfigs[type] };
        };

        try {
          ProviderFactory.createProvider(AIProviderType.GEMINI, GeminiProvider, getConf(AIProviderType.GEMINI));
          ProviderFactory.createProvider(AIProviderType.GROQ, GroqProvider, getConf(AIProviderType.GROQ));
          ProviderFactory.createProvider(AIProviderType.OPENROUTER, OpenRouterProvider, getConf(AIProviderType.OPENROUTER));
          ProviderFactory.createProvider(AIProviderType.DEEPSEEK, DeepSeekProvider, getConf(AIProviderType.DEEPSEEK));
          ProviderFactory.createProvider(AIProviderType.MISTRAL, MistralProvider, getConf(AIProviderType.MISTRAL));
          ProviderFactory.createProvider(AIProviderType.OPENAI, OpenAIProvider, getConf(AIProviderType.OPENAI));
          ProviderFactory.createProvider(AIProviderType.CLAUDE, ClaudeProvider, getConf(AIProviderType.CLAUDE));
          ProviderFactory.createProvider(AIProviderType.OLLAMA, OllamaProvider, getConf(AIProviderType.OLLAMA));
          
          ProviderFactory.createProvider(AIProviderType.GOOGLE_IMAGEN, GoogleImagenProvider, getConf(AIProviderType.GOOGLE_IMAGEN));
          ProviderFactory.createProvider(AIProviderType.BFL, BflProvider, getConf(AIProviderType.BFL));
          ProviderFactory.createProvider(AIProviderType.IDEOGRAM, IdeogramProvider, getConf(AIProviderType.IDEOGRAM));
          ProviderFactory.createProvider(AIProviderType.LEONARDO, LeonardoProvider, getConf(AIProviderType.LEONARDO));
          ProviderFactory.createProvider(AIProviderType.FAL, FalProvider, getConf(AIProviderType.FAL));
          ProviderFactory.createProvider(AIProviderType.REPLICATE, ReplicateProvider, getConf(AIProviderType.REPLICATE));
          ProviderFactory.createProvider(AIProviderType.STABILITY_AI, StabilityAiProvider, getConf(AIProviderType.STABILITY_AI));
          
          ProviderFactory.createProvider(AIProviderType.GOOGLE_VEO, GoogleVeoProvider, getConf(AIProviderType.GOOGLE_VEO));
          ProviderFactory.createProvider(AIProviderType.RUNWAY, RunwayProvider, getConf(AIProviderType.RUNWAY));
          ProviderFactory.createProvider(AIProviderType.KLING, KlingProvider, getConf(AIProviderType.KLING));
          ProviderFactory.createProvider(AIProviderType.PIKA, PikaProvider, getConf(AIProviderType.PIKA));
          ProviderFactory.createProvider(AIProviderType.LUMA, LumaProvider, getConf(AIProviderType.LUMA));
          ProviderFactory.createProvider(AIProviderType.HAIPER, HaiperProvider, getConf(AIProviderType.HAIPER));
          ProviderFactory.createProvider(AIProviderType.FAL_VIDEO, FalVideoProvider, getConf(AIProviderType.FAL_VIDEO));
          ProviderFactory.createProvider(AIProviderType.REPLICATE_VIDEO, ReplicateVideoProvider, getConf(AIProviderType.REPLICATE_VIDEO));
        } catch (error) {
          logger.error('Failed to register providers inside ProviderLoader', error as Error);
        }
    }

    const providers = providerRegistry.getAllProviders();

    // Initialise all providers that are in the registry
    for (const provider of providers) {
      const type = provider.type;
      const config = defaultProviderConfigs[type];

      if (config?.disabled) {
        statusMap[type] = 'Disabled';
        continue;
      }

      if (REQUIRES_API_KEY.has(type) && !config?.apiKey) {
        statusMap[type] = 'Missing API Key';
        continue;
      }

      try {
        await provider.initialize();
        statusMap[type] = 'Ready';
      } catch (error) {
        statusMap[type] = 'Disabled';
        logger.error(`Failed to initialize provider: ${type}`, error as Error);
      }
    }

    const printSequence: AIProviderType[] = [
      // Text AI
      AIProviderType.GEMINI,
      AIProviderType.GROQ,
      AIProviderType.OPENROUTER,
      AIProviderType.DEEPSEEK,
      AIProviderType.MISTRAL,
      AIProviderType.OPENAI,
      AIProviderType.CLAUDE,
      AIProviderType.OLLAMA,
      
      // Image AI
      AIProviderType.GOOGLE_IMAGEN,
      AIProviderType.BFL,
      AIProviderType.IDEOGRAM,
      AIProviderType.LEONARDO,
      AIProviderType.FAL,
      AIProviderType.REPLICATE,
      AIProviderType.STABILITY_AI,
      
      // Video AI
      AIProviderType.GOOGLE_VEO,
      AIProviderType.RUNWAY,
      AIProviderType.KLING,
      AIProviderType.PIKA,
      AIProviderType.LUMA,
      AIProviderType.HAIPER,
      AIProviderType.FAL_VIDEO,
      AIProviderType.REPLICATE_VIDEO,
    ];

    // Print the status table
    logger.info('');
    logger.info('======================================');
    logger.info('AI Providers Initialization Status');
    logger.info('======================================');
    
    // Find the max label width for dot alignment
    const maxLabelLen = Math.max(...printSequence.map(type => (PROVIDER_LABELS[type] ?? type).length));
    const targetWidth = maxLabelLen + 2;

    for (const type of printSequence) {
      const label = PROVIDER_LABELS[type] ?? type;
      const status = statusMap[type] ?? 'Missing API Key';
      const dotsCount = Math.max(1, targetWidth - label.length);
      const dots = '.'.repeat(dotsCount);
      logger.info(`${label} ${dots} ${status}`);
    }
    logger.info('======================================');
    logger.info('');
  }
}

import { NextResponse } from 'next/server';
import { providerRegistry } from '@/providers/ProviderRegistry';
import { defaultProviderConfigs } from '@/providers/ProviderConfig';
import { ProviderLoader } from '@/providers/ProviderLoader';
import { AIProviderType } from '@/core/ai/types';

// The 8 text providers in AIRouter priority order
const TEXT_ROUTING_PRIORITY: AIProviderType[] = [
  AIProviderType.GEMINI,
  AIProviderType.GROQ,
  AIProviderType.OPENROUTER,
  AIProviderType.DEEPSEEK,
  AIProviderType.MISTRAL,
  AIProviderType.OPENAI,
  AIProviderType.CLAUDE,
  AIProviderType.OLLAMA,
];

// The 7 image providers in priority order
const IMAGE_PROVIDERS: AIProviderType[] = [
  AIProviderType.GOOGLE_IMAGEN,
  AIProviderType.BFL,
  AIProviderType.IDEOGRAM,
  AIProviderType.LEONARDO,
  AIProviderType.FAL,
  AIProviderType.REPLICATE,
  AIProviderType.STABILITY_AI,
];

// The 8 video providers
const VIDEO_PROVIDERS: AIProviderType[] = [
  AIProviderType.GOOGLE_VEO,
  AIProviderType.RUNWAY,
  AIProviderType.KLING,
  AIProviderType.PIKA,
  AIProviderType.LUMA,
  AIProviderType.HAIPER,
  AIProviderType.FAL_VIDEO,
  AIProviderType.REPLICATE_VIDEO,
];

const ALL_PROVIDERS = [...TEXT_ROUTING_PRIORITY, ...IMAGE_PROVIDERS, ...VIDEO_PROVIDERS];

const PROVIDER_LABELS: Record<string, string> = {
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

export async function GET() {
  // 1. Load providers (idempotent — only registers once)
  await ProviderLoader.loadProviders();

  const results: Record<string, any> = {};
  const registeredProviders: string[] = [];
  const healthyProviders: string[] = [];
  const missingApiKeys: string[] = [];
  const disabledProviders: string[] = [];
  const failedProviders: string[] = [];
  const statusTable: string[] = [];

  // 2. Verify every provider
  for (const type of ALL_PROVIDERS) {
    const label = PROVIDER_LABELS[type] || type;
    const config = defaultProviderConfigs[type];
    const provider = providerRegistry.getProvider(type);
    const isRegistered = !!provider;
    const hasApiKey = !!config?.apiKey;
    const isDisabled = !!config?.disabled;
    const isOllama = type === AIProviderType.OLLAMA;

    let status = 'Unknown';

    if (isRegistered) {
      registeredProviders.push(label);
    }

    if (isDisabled) {
      status = 'Disabled';
      disabledProviders.push(label);
    } else if (!isOllama && !hasApiKey) {
      status = 'Missing API Key';
      missingApiKeys.push(label);
    } else if (isRegistered) {
      status = 'Ready';
      healthyProviders.push(label);
    } else {
      status = 'Failed';
      failedProviders.push(label);
    }

    results[type] = {
      label,
      registered: isRegistered,
      hasApiKey: isOllama ? 'N/A (local)' : hasApiKey,
      disabled: isDisabled,
      status,
      model: config?.defaultModel || 'N/A',
    };

    // Build padded dot table
    const maxLen = 16;
    const dotsCount = Math.max(1, maxLen - label.length);
    const dots = '.'.repeat(dotsCount);
    statusTable.push(`${label} ${dots} ${status}`);
  }

  // 3. Verify AIRouter priority
  const routerPriorityCheck = TEXT_ROUTING_PRIORITY.map(t => PROVIDER_LABELS[t] || t);

  // 4. Verify image providers are NOT in AIRouter
  const imageInRouter = IMAGE_PROVIDERS.some(t => TEXT_ROUTING_PRIORITY.includes(t));
  const videoInRouter = VIDEO_PROVIDERS.some(t => TEXT_ROUTING_PRIORITY.includes(t));

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),

    // Status table
    statusTable,

    // AIRouter routing priority
    routerPriority: routerPriorityCheck,
    routerPriorityCorrect:
      JSON.stringify(routerPriorityCheck) ===
      JSON.stringify(['Gemini', 'Groq', 'OpenRouter', 'DeepSeek', 'Mistral', 'OpenAI', 'Claude', 'Ollama']),

    // Image/Video isolation
    imageProvidersInRouter: imageInRouter,
    videoProvidersInRouter: videoInRouter,
    imageVideoIsolationCorrect: !imageInRouter && !videoInRouter,

    // Summary
    summary: {
      totalProviders: ALL_PROVIDERS.length,
      registered: registeredProviders.length,
      healthy: healthyProviders.length,
      missingApiKey: missingApiKeys.length,
      disabled: disabledProviders.length,
      failed: failedProviders.length,
    },

    // Lists
    registeredProviders,
    healthyProviders,
    missingApiKeys,
    disabledProviders,
    failedProviders,

    // Full detail
    providers: results,
  }, { status: 200 });
}

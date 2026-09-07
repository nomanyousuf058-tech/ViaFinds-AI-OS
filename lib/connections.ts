import crypto from 'crypto'

export const ENCRYPTION_KEY = () => {
  const secret = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || 'viafinds-fallback-local-key-32b'
  return crypto.scryptSync(secret, 'salt', 32)
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY(), iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(':')
    if (parts.length !== 3) return encryptedText
    const iv = Buffer.from(parts[0], 'hex')
    const authTag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY(), iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    return encryptedText
  }
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'missing_key' | 'error'

export interface ConnectionProvider {
  id: string
  name: string
  category: string
  type: string
  icon: string
  credentialFields?: { key: string; label: string; type: 'password' | 'text'; placeholder?: string }[]
  testConfig?: {
    url: string
    method?: 'GET' | 'POST'
    headers?: Record<string, string>
    body?: Record<string, unknown>
    expectedStatus?: number
  }
}

export interface ConnectionDocument {
  _id?: string
  _type?: 'connection'
  name: string
  category: string
  type: string
  providerId: string
  apiKey: string
  enabled: boolean
  lastTested?: string
  error?: string | null
  settings?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

export interface ConnectionStatusResult {
  status: ConnectionStatus
  lastTested?: string
  error?: string | null
}

export const PROVIDER_CATALOG: ConnectionProvider[] = [
  // AI Providers
  { id: 'openai', name: 'OpenAI', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'OPENAI_API_KEY', label: 'API Key', type: 'password', placeholder: 'sk-...' }], testConfig: { url: 'https://api.openai.com/v1/models', expectedStatus: 200 } },
  { id: 'gemini', name: 'Gemini', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'GEMINI_API_KEY', label: 'API Key', type: 'password', placeholder: 'AI...' }], testConfig: { url: 'https://generativelanguage.googleapis.com/v1beta/models?key=', expectedStatus: 200 } },
  { id: 'anthropic', name: 'Anthropic', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'ANTHROPIC_API_KEY', label: 'API Key', type: 'password', placeholder: 'sk-ant-...' }], testConfig: { url: 'https://api.anthropic.com/v1/messages', method: 'POST', expectedStatus: 400 } },
  { id: 'groq', name: 'Groq', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'GROQ_API_KEY', label: 'API Key', type: 'password', placeholder: 'gsk_...' }], testConfig: { url: 'https://api.groq.com/openai/v1/models', expectedStatus: 200 } },
  { id: 'ollama', name: 'Ollama', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'OLLAMA_BASE_URL', label: 'Base URL', type: 'text', placeholder: 'http://localhost:11434' }], testConfig: { url: 'http://localhost:11434/api/tags', expectedStatus: 200 } },
  { id: 'openrouter', name: 'OpenRouter', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'OPENROUTER_API_KEY', label: 'API Key', type: 'password', placeholder: 'sk-or-...' }], testConfig: { url: 'https://openrouter.ai/api/v1/models', expectedStatus: 200 } },
  { id: 'deepseek', name: 'DeepSeek', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'DEEPSEEK_API_KEY', label: 'API Key', type: 'password', placeholder: 'sk-...' }], testConfig: { url: 'https://api.deepseek.com/v1/models', expectedStatus: 200 } },
  { id: 'mistral', name: 'Mistral', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'MISTRAL_API_KEY', label: 'API Key', type: 'password', placeholder: 'cAXx...' }], testConfig: { url: 'https://api.mistral.ai/v1/models', expectedStatus: 200 } },
  { id: 'cerebras', name: 'Cerebras', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'CEREBRAS_API_KEY', label: 'API Key', type: 'password', placeholder: 'csk-...' }], testConfig: { url: 'https://api.cerebras.ai/v1/models', expectedStatus: 200 } },
  { id: 'together', name: 'Together', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'TOGETHER_API_KEY', label: 'API Key', type: 'password', placeholder: 'key_...' }], testConfig: { url: 'https://api.together.xyz/v1/models', expectedStatus: 200 } },
  { id: 'fireworks', name: 'Fireworks', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'FIREWORKS_API_KEY', label: 'API Key', type: 'password', placeholder: 'fw_...' }], testConfig: { url: 'https://api.fireworks.ai/inference/v1/models', expectedStatus: 200 } },
  { id: 'sambanova', name: 'Sambanova', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'SAMBANOVA_API_KEY', label: 'API Key', type: 'password', placeholder: '...' }], testConfig: { url: 'https://api.sambanova.ai/v1/models', expectedStatus: 200 } },
  { id: 'nvidia-nim', name: 'NVIDIA NIM', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'NVIDIA_NIM_API_KEY', label: 'API Key', type: 'password', placeholder: 'nvapi-...' }], testConfig: { url: 'https://integrate.api.nvidia.com/v1/models', expectedStatus: 200 } },
  { id: 'huggingface', name: 'HuggingFace', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'HF_TOKEN', label: 'API Key / Token', type: 'password', placeholder: 'hf_...' }], testConfig: { url: 'https://huggingface.co/api/whoami-v2', expectedStatus: 200 } },
  { id: 'cloudflare-ai', name: 'Cloudflare AI', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'CLOUDFLARE_API_TOKEN', label: 'API Token', type: 'password', placeholder: 'cfat_...' }], testConfig: { url: 'https://api.cloudflare.com/client/v4/user/tokens/verify', expectedStatus: 200 } },
  { id: 'replicate', name: 'Replicate', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'REPLICATE_API_TOKEN', label: 'API Token', type: 'password', placeholder: 'r8_...' }], testConfig: { url: 'https://api.replicate.com/v1/models', expectedStatus: 200 } },
  { id: 'perplexity', name: 'Perplexity', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'PERPLEXITY_API_KEY', label: 'API Key', type: 'password', placeholder: '...' }], testConfig: { url: 'https://api.perplexity.ai/v1/models', expectedStatus: 200 } },
  { id: 'cohere', name: 'Cohere', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'COHERE_API_KEY', label: 'API Key', type: 'password', placeholder: '...' }], testConfig: { url: 'https://api.cohere.com/v1/models', expectedStatus: 200 } },
  { id: 'longcat', name: 'LongCat', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'LONGCAT_API_KEY', label: 'API Key', type: 'password', placeholder: 'ak_...' }], testConfig: { url: 'https://api.longcat.chat/v1/models', expectedStatus: 200 } },
  { id: 'qwen', name: 'Qwen', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'QWEN_API_KEY', label: 'API Key', type: 'password', placeholder: 'sk-...' }], testConfig: { url: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/models', expectedStatus: 200 } },
  { id: 'zai', name: 'Z.AI', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'ZAI_API_KEY', label: 'API Key', type: 'password', placeholder: '...' }], testConfig: { url: 'https://api.z.ai/api/paas/v4/models', expectedStatus: 200 } },
  { id: 'ai21', name: 'AI21', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'AI21_API_KEY', label: 'API Key', type: 'password', placeholder: '...' }], testConfig: { url: 'https://api.ai21.com/studio/v1/models', expectedStatus: 200 } },
  { id: 'writesonic', name: 'Writesonic', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'WRITESONIC_API_KEY', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'fal', name: 'FAL AI', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'FAL_KEY', label: 'API Key / ID', type: 'password', placeholder: '...' }], testConfig: { url: 'https://fal.run/v1/models', expectedStatus: 200 } },

  // Image Providers
  { id: 'openai-images', name: 'OpenAI Images', category: 'Image Providers', type: 'Image Provider', icon: 'image', credentialFields: [{ key: 'OPENAI_API_KEY', label: 'API Key', type: 'password', placeholder: 'sk-...' }], testConfig: { url: 'https://api.openai.com/v1/models', expectedStatus: 200 } },
  { id: 'gemini-images', name: 'Gemini Images', category: 'Image Providers', type: 'Image Provider', icon: 'image', credentialFields: [{ key: 'GEMINI_API_KEY', label: 'API Key', type: 'password', placeholder: 'AI...' }], testConfig: { url: 'https://generativelanguage.googleapis.com/v1beta/models?key=', expectedStatus: 200 } },
  { id: 'replicate-images', name: 'Replicate Images', category: 'Image Providers', type: 'Image Provider', icon: 'image', credentialFields: [{ key: 'REPLICATE_API_TOKEN', label: 'API Token', type: 'password', placeholder: 'r8_...' }], testConfig: { url: 'https://api.replicate.com/v1/models', expectedStatus: 200 } },
  { id: 'fal-images', name: 'FAL Images', category: 'Image Providers', type: 'Image Provider', icon: 'image', credentialFields: [{ key: 'FAL_KEY', label: 'API Key / ID', type: 'password', placeholder: '...' }], testConfig: { url: 'https://fal.run/v1/models', expectedStatus: 200 } },
  { id: 'huggingface-images', name: 'HuggingFace Images', category: 'Image Providers', type: 'Image Provider', icon: 'image', credentialFields: [{ key: 'HF_TOKEN', label: 'API Token', type: 'password', placeholder: 'hf_...' }], testConfig: { url: 'https://huggingface.co/api/whoami-v2', expectedStatus: 200 } },
  { id: 'stability-ai', name: 'Stability AI', category: 'Image Providers', type: 'Image Provider', icon: 'image', credentialFields: [{ key: 'STABILITY_API_KEY', label: 'API Key', type: 'password', placeholder: 'sk-...' }] },
  { id: 'ideogram', name: 'Ideogram', category: 'Image Providers', type: 'Image Provider', icon: 'image', credentialFields: [{ key: 'IDEOGRAM_API_KEY', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'leonardo', name: 'Leonardo', category: 'Image Providers', type: 'Image Provider', icon: 'image', credentialFields: [{ key: 'LEONARDO_API_KEY', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'bfl', name: 'BFL/FLUX', category: 'Image Providers', type: 'Image Provider', icon: 'image', credentialFields: [{ key: 'BFL_API_KEY', label: 'API Key', type: 'password', placeholder: 'bfl_...' }] },

  // Video Providers
  { id: 'google-veo', name: 'Google Veo', category: 'Video Providers', type: 'Video Provider', icon: 'videocam', credentialFields: [{ key: 'GOOGLE_VEO_API_KEY', label: 'API Key', type: 'password', placeholder: 'AI...' }] },
  { id: 'runway', name: 'Runway', category: 'Video Providers', type: 'Video Provider', icon: 'videocam', credentialFields: [{ key: 'RUNWAY_API_KEY', label: 'API Key', type: 'password', placeholder: 'key_...' }] },
  { id: 'kling', name: 'Kling', category: 'Video Providers', type: 'Video Provider', icon: 'videocam', credentialFields: [{ key: 'KLING_API_KEY', label: 'API Key', type: 'password', placeholder: 'api-key-...' }] },
  { id: 'luma', name: 'Luma', category: 'Video Providers', type: 'Video Provider', icon: 'videocam', credentialFields: [{ key: 'LUMA_API_KEY', label: 'API Key', type: 'password', placeholder: 'luma-api-...' }] },
  { id: 'fal-video', name: 'Fal Video', category: 'Video Providers', type: 'Video Provider', icon: 'videocam', credentialFields: [{ key: 'FAL_VIDEO_API_KEY', label: 'API Key / ID', type: 'password', placeholder: '...' }], testConfig: { url: 'https://fal.run/v1/models', expectedStatus: 200 } },
  { id: 'replicate-video', name: 'Replicate Video', category: 'Video Providers', type: 'Video Provider', icon: 'videocam', credentialFields: [{ key: 'REPLICATE_API_TOKEN', label: 'API Token', type: 'password', placeholder: 'r8_...' }], testConfig: { url: 'https://api.replicate.com/v1/models', expectedStatus: 200 } },
  { id: 'pika', name: 'Pika', category: 'Video Providers', type: 'Video Provider', icon: 'videocam', credentialFields: [{ key: 'PIKA_API_KEY', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'haiper', name: 'Haiper', category: 'Video Providers', type: 'Video Provider', icon: 'videocam', credentialFields: [{ key: 'HAIPER_API_KEY', label: 'API Key', type: 'password', placeholder: '...' }] },

  // Social Platforms
  { id: 'pinterest', name: 'Pinterest', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'PINTEREST_ACCESS_TOKEN', label: 'Access Token', type: 'password', placeholder: '...' }] },
  { id: 'instagram', name: 'Instagram', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'INSTAGRAM_ACCESS_TOKEN', label: 'Access Token', type: 'password', placeholder: '...' }] },
  { id: 'facebook', name: 'Facebook', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'FACEBOOK_PAGE_ACCESS_TOKEN', label: 'Page Access Token', type: 'password', placeholder: '...' }] },
  { id: 'x-twitter', name: 'X / Twitter', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'X_BEARER_TOKEN', label: 'Bearer Token', type: 'password', placeholder: '...' }] },
  { id: 'tiktok', name: 'TikTok', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'TIKTOK_ACCESS_TOKEN', label: 'Access Token', type: 'password', placeholder: '...' }] },
  { id: 'youtube', name: 'YouTube', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'YOUTUBE_API_KEY', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'linkedin', name: 'LinkedIn', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'LINKEDIN_ACCESS_TOKEN', label: 'Access Token', type: 'password', placeholder: '...' }] },
  { id: 'threads', name: 'Threads', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'THREADS_ACCESS_TOKEN', label: 'Access Token', type: 'password', placeholder: '...' }] },
  { id: 'reddit', name: 'Reddit', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'REDDIT_ACCESS_TOKEN', label: 'Access Token', type: 'password', placeholder: '...' }] },
  { id: 'discord', name: 'Discord', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'DISCORD_BOT_TOKEN', label: 'Bot Token', type: 'password', placeholder: '...' }] },
  { id: 'telegram', name: 'Telegram', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'TELEGRAM_BOT_TOKEN', label: 'Bot Token', type: 'password', placeholder: '...' }] },
  { id: 'bluesky', name: 'Bluesky', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'BLUESKY_APP_PASSWORD', label: 'App Password', type: 'password', placeholder: '...' }] },
  { id: 'mastodon', name: 'Mastodon', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'MASTODON_ACCESS_TOKEN', label: 'Access Token', type: 'password', placeholder: '...' }] },
  { id: 'snapchat', name: 'Snapchat', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'SNAPCHAT_ACCESS_TOKEN', label: 'Access Token', type: 'password', placeholder: '...' }] },
  { id: 'twitch', name: 'Twitch', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'TWITCH_ACCESS_TOKEN', label: 'Access Token', type: 'password', placeholder: '...' }] },
  { id: 'quora', name: 'Quora', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'QUORA_API_KEY', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'medium', name: 'Medium', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'MEDIUM_ACCESS_TOKEN', label: 'Integration Token', type: 'password', placeholder: '...' }] },
  { id: 'devto', name: 'Dev.to', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'DEVTO_API_KEY', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'hashnode', name: 'Hashnode', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'HASHNODE_API_KEY', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'wordpress', name: 'WordPress', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'WORDPRESS_APP_PASSWORD', label: 'Application Password', type: 'password', placeholder: '...' }] },
  { id: 'github', name: 'GitHub', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'GITHUB_TOKEN', label: 'Personal Access Token', type: 'password', placeholder: 'ghp_...' }], testConfig: { url: 'https://api.github.com/user', expectedStatus: 200 } },

  // Google Services
  { id: 'google-search-console', name: 'Search Console', category: 'Google Services', type: 'Google Service', icon: 'search', credentialFields: [{ key: 'GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_EMAIL', label: 'Service Account Email', type: 'text', placeholder: '...' }, { key: 'GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY', label: 'Private Key', type: 'password', placeholder: '...' }] },
  { id: 'google-analytics', name: 'Analytics 4', category: 'Google Services', type: 'Google Service', icon: 'search', credentialFields: [{ key: 'GA4_PROPERTY_ID', label: 'Property ID', type: 'text', placeholder: '...' }] },
  { id: 'google-ads', name: 'Ads', category: 'Google Services', type: 'Google Service', icon: 'search', credentialFields: [{ key: 'GOOGLE_ADS_DEVELOPER_TOKEN', label: 'Developer Token', type: 'password', placeholder: '...' }] },
  { id: 'google-business-profile', name: 'Business Profile', category: 'Google Services', type: 'Google Service', icon: 'search', credentialFields: [{ key: 'GOOGLE_BUSINESS_CLIENT_ID', label: 'OAuth Token', type: 'password', placeholder: '...' }] },
  { id: 'google-merchant-center', name: 'Merchant Center', category: 'Google Services', type: 'Google Service', icon: 'search', credentialFields: [{ key: 'GOOGLE_MERCHANT_CLIENT_ID', label: 'OAuth Token', type: 'password', placeholder: '...' }] },
  { id: 'google-indexing', name: 'Indexing', category: 'Google Services', type: 'Google Service', icon: 'search', credentialFields: [{ key: 'GOOGLE_INDEXING_SERVICE_ACCOUNT_EMAIL', label: 'Service Account', type: 'password', placeholder: '...' }] },
  { id: 'google-custom-search', name: 'Custom Search', category: 'Google Services', type: 'Google Service', icon: 'search', credentialFields: [{ key: 'GOOGLE_CUSTOM_SEARCH_API_KEY', label: 'API Key', type: 'password', placeholder: 'AIza...' }, { key: 'GOOGLE_CUSTOM_SEARCH_ENGINE_ID', label: 'Engine ID', type: 'text', placeholder: '...' }], testConfig: { url: 'https://www.googleapis.com/customsearch/v1?key=', expectedStatus: 400 } },
  { id: 'google-maps', name: 'Maps/Places', category: 'Google Services', type: 'Google Service', icon: 'search', credentialFields: [{ key: 'GOOGLE_MAPS_API_KEY', label: 'API Key', type: 'password', placeholder: 'AIza...' }], testConfig: { url: 'https://maps.googleapis.com/maps/api/geocode/json?address=test&key=', expectedStatus: 200 } },
  { id: 'google-translate', name: 'Translate', category: 'Google Services', type: 'Google Service', icon: 'search', credentialFields: [{ key: 'GOOGLE_TRANSLATE_API_KEY', label: 'API Key', type: 'password', placeholder: 'AIza...' }] },
  { id: 'google-vision', name: 'Vision', category: 'Google Services', type: 'Google Service', icon: 'search', credentialFields: [{ key: 'GOOGLE_VISION_API_KEY', label: 'API Key', type: 'password', placeholder: 'AIza...' }] },
  { id: 'google-gemini-grounding', name: 'Gemini Grounding', category: 'Google Services', type: 'Google Service', icon: 'search', credentialFields: [{ key: 'GEMINI_API_KEY', label: 'API Key', type: 'password', placeholder: 'AI...' }] },
  { id: 'google-trends', name: 'Trends', category: 'Google Services', type: 'Google Service', icon: 'search', credentialFields: [{ key: 'GOOGLE_TRENDS_API_KEY', label: 'API Key', type: 'password', placeholder: '...' }] },

  // Affiliate/Partners
  { id: 'amazon-associates', name: 'Amazon Associates', category: 'Affiliate/Partners', type: 'Affiliate Network', icon: 'handshake', credentialFields: [{ key: 'AMAZON_ACCESS_KEY', label: 'Access Key / Secret', type: 'password', placeholder: '...' }] },
  { id: 'ebay', name: 'eBay', category: 'Affiliate/Partners', type: 'Affiliate Network', icon: 'handshake', credentialFields: [{ key: 'EBAY_CLIENT_ID', label: 'Client ID / Secret', type: 'password', placeholder: '...' }] },
  { id: 'etsy', name: 'Etsy', category: 'Affiliate/Partners', type: 'Affiliate Network', icon: 'handshake', credentialFields: [{ key: 'ETSY_API_KEY', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'cj', name: 'CJ', category: 'Affiliate/Partners', type: 'Affiliate Network', icon: 'handshake', credentialFields: [{ key: 'CJ_API_KEY', label: 'API Key / Website ID', type: 'password', placeholder: '...' }] },
  { id: 'impact', name: 'Impact', category: 'Affiliate/Partners', type: 'Affiliate Network', icon: 'handshake', credentialFields: [{ key: 'IMPACT_ACCESS_TOKEN', label: 'Token / SID', type: 'password', placeholder: '...' }] },
  { id: 'awin', name: 'Awin', category: 'Affiliate/Partners', type: 'Affiliate Network', icon: 'handshake', credentialFields: [{ key: 'AWIN_API_KEY', label: 'API Key / Publisher ID', type: 'password', placeholder: '...' }] },
  { id: 'shareasale', name: 'ShareASale', category: 'Affiliate/Partners', type: 'Affiliate Network', icon: 'handshake', credentialFields: [{ key: 'SHAREASALE_API_TOKEN', label: 'API Token / Affiliate ID', type: 'password', placeholder: '...' }] },
  { id: 'rakuten', name: 'Rakuten', category: 'Affiliate/Partners', type: 'Affiliate Network', icon: 'handshake', credentialFields: [{ key: 'RAKUTEN_API_KEY', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'digistore24', name: 'Digistore24', category: 'Affiliate/Partners', type: 'Affiliate Network', icon: 'handshake', credentialFields: [{ key: 'DIGISTORE24_API_KEY', label: 'API Key', type: 'password', placeholder: '...' }] },

  // Search/SEO
  { id: 'serper', name: 'Serper', category: 'Search/SEO', type: 'Search API', icon: 'travel_explore', credentialFields: [{ key: 'SERPER_API_KEY', label: 'API Key', type: 'password', placeholder: '...' }], testConfig: { url: 'https://google.serper.dev/search', method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-KEY': 'REPLACE_KEY' }, body: { q: 'test' }, expectedStatus: 200 } },
  { id: 'serpapi', name: 'SerpAPI', category: 'Search/SEO', type: 'Search API', icon: 'travel_explore', credentialFields: [{ key: 'SERPAPI_API_KEY', label: 'API Key', type: 'password', placeholder: '...' }], testConfig: { url: 'https://serpapi.com/search?q=test&api_key=REPLACE_KEY', expectedStatus: 200 } },
  { id: 'tavily', name: 'Tavily', category: 'Search/SEO', type: 'Search API', icon: 'travel_explore', credentialFields: [{ key: 'TAVILY_API_KEY', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'brave-search', name: 'Brave Search', category: 'Search/SEO', type: 'Search API', icon: 'travel_explore', credentialFields: [{ key: 'BRAVE_SEARCH_API_KEY', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'bing-search', name: 'Bing Search', category: 'Search/SEO', type: 'Search API', icon: 'travel_explore', credentialFields: [{ key: 'BING_SEARCH_API_KEY', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'ahrefs', name: 'Ahrefs', category: 'Search/SEO', type: 'SEO Tool', icon: 'travel_explore', credentialFields: [{ key: 'AHREFS_API_KEY', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'semrush', name: 'SEMrush', category: 'Search/SEO', type: 'SEO Tool', icon: 'travel_explore', credentialFields: [{ key: 'SEMRUSH_API_KEY', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'dataforseo', name: 'DataForSEO', category: 'Search/SEO', type: 'SEO Tool', icon: 'travel_explore', credentialFields: [{ key: 'DATAFORSEO_LOGIN', label: 'Login / Password', type: 'password', placeholder: '...' }] },
  { id: 'moz', name: 'Moz', category: 'Search/SEO', type: 'SEO Tool', icon: 'travel_explore', credentialFields: [{ key: 'MOZ_ACCESS_ID', label: 'Access ID / Secret', type: 'password', placeholder: '...' }] },

  // Email
  { id: 'resend', name: 'Resend', category: 'Email', type: 'Email Provider', icon: 'mail', credentialFields: [{ key: 'RESEND_API_KEY', label: 'API Key', type: 'password', placeholder: 're_...' }], testConfig: { url: 'https://api.resend.com/emails', method: 'POST', expectedStatus: 422 } },
  { id: 'sendgrid', name: 'SendGrid', category: 'Email', type: 'Email Provider', icon: 'mail', credentialFields: [{ key: 'SENDGRID_API_KEY', label: 'API Key', type: 'password', placeholder: 'SG....' }] },
  { id: 'mailgun', name: 'Mailgun', category: 'Email', type: 'Email Provider', icon: 'mail', credentialFields: [{ key: 'MAILGUN_API_KEY', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'smtp', name: 'SMTP', category: 'Email', type: 'Email Provider', icon: 'mail', credentialFields: [
    { key: 'SMTP_HOST', label: 'Host', type: 'text', placeholder: 'smtp.example.com' },
    { key: 'SMTP_PORT', label: 'Port', type: 'text', placeholder: '587' },
    { key: 'SMTP_PASSWORD', label: 'Password', type: 'password', placeholder: '...' }
  ] },

  // Storage
  { id: 'aws-s3', name: 'AWS S3', category: 'Storage', type: 'Storage Provider', icon: 'cloud_upload', credentialFields: [{ key: 'AWS_ACCESS_KEY_ID', label: 'Access Key ID / Secret', type: 'password', placeholder: '...' }] },
  { id: 'cloudflare-r2', name: 'Cloudflare R2', category: 'Storage', type: 'Storage Provider', icon: 'cloud_upload', credentialFields: [{ key: 'CLOUDFLARE_R2_ACCESS_KEY_ID', label: 'Access Key ID / Secret', type: 'password', placeholder: '...' }] },

  // Analytics
  { id: 'posthog', name: 'PostHog', category: 'Analytics', type: 'Analytics Provider', icon: 'analytics', credentialFields: [{ key: 'POSTHOG_API_KEY', label: 'API Key / Project Key', type: 'password', placeholder: '...' }] },
  { id: 'mixpanel', name: 'Mixpanel', category: 'Analytics', type: 'Analytics Provider', icon: 'analytics', credentialFields: [{ key: 'MIXPANEL_TOKEN', label: 'Token / Project ID', type: 'password', placeholder: '...' }] },
  { id: 'plausible', name: 'Plausible', category: 'Analytics', type: 'Analytics Provider', icon: 'analytics', credentialFields: [{ key: 'PLAUSIBLE_API_KEY', label: 'API Key / Site ID', type: 'password', placeholder: '...' }] },

  // Monitoring
  { id: 'sentry', name: 'Sentry', category: 'Monitoring', type: 'Monitoring Provider', icon: 'monitoring', credentialFields: [{ key: 'SENTRY_DSN', label: 'DSN / Auth Token', type: 'password', placeholder: '...' }] },
]

export const CATEGORIES = Array.from(new Set(PROVIDER_CATALOG.map(p => p.category)))

export function getProviderById(id: string): ConnectionProvider | undefined {
  return PROVIDER_CATALOG.find(p => p.id === id)
}

export async function testConnection(providerId: string, apiKey: string, _settings?: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  const provider = getProviderById(providerId)
  if (!provider) {
    return { success: false, error: 'Unknown provider' }
  }

  const testConfig = provider.testConfig
  if (!testConfig) {
    return { success: true, error: 'No test endpoint configured for this provider' }
  }

  try {
    let url = testConfig.url
    const headers: Record<string, string> = { ...(testConfig.headers || {}) }

    // Replace placeholder in URL
    if (url.includes('REPLACE_KEY')) {
      url = url.replace('REPLACE_KEY', encodeURIComponent(apiKey))
    } else if (url.endsWith('key=')) {
      url = `${url}${encodeURIComponent(apiKey)}`
    } else if (providerId === 'gemini' || providerId === 'gemini-images' || providerId === 'google-gemini-grounding') {
      url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
    } else if (providerId === 'openai' || providerId === 'openai-images') {
      headers['Authorization'] = `Bearer ${apiKey}`
    } else if (providerId === 'anthropic') {
      headers['Authorization'] = `Bearer ${apiKey}`
      headers['anthropic-version'] = '2023-06-01'
    } else if (providerId === 'groq' || providerId === 'openrouter' || providerId === 'deepseek' || providerId === 'mistral' || providerId === 'cerebras' || providerId === 'together' || providerId === 'fireworks' || providerId === 'sambanova' || providerId === 'nvidia-nim' || providerId === 'longcat' || providerId === 'qwen' || providerId === 'zai') {
      headers['Authorization'] = `Bearer ${apiKey}`
    } else if (providerId === 'huggingface' || providerId === 'huggingface-images') {
      headers['Authorization'] = `Bearer ${apiKey}`
    } else if (providerId === 'replicate' || providerId === 'replicate-images' || providerId === 'replicate-video') {
      headers['Authorization'] = `Bearer ${apiKey}`
    } else if (providerId === 'fal' || providerId === 'fal-images' || providerId === 'fal-video') {
      headers['Authorization'] = `Key ${apiKey}`
    } else if (providerId === 'cloudflare-ai') {
      headers['Authorization'] = `Bearer ${apiKey}`
    } else if (providerId === 'github') {
      headers['Authorization'] = `Bearer ${apiKey}`
      headers['Accept'] = 'application/vnd.github.v3+json'
    } else if (providerId === 'serper') {
      headers['X-API-KEY'] = apiKey
    } else if (providerId === 'serpapi') {
      // key is in URL
    } else if (providerId === 'google-custom-search' || providerId === 'google-maps') {
      // key is in URL
    } else if (providerId === 'resend') {
      headers['Authorization'] = `Bearer ${apiKey}`
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const options: RequestInit = {
      method: testConfig.method || 'GET',
      headers,
      signal: controller.signal,
    }

    if (testConfig.body && testConfig.method === 'POST') {
      const body = { ...testConfig.body }
      if (providerId === 'serper') {
        body.headers = { ...(body.headers as Record<string, string>), 'X-API-KEY': apiKey }
      }
      options.body = JSON.stringify(body)
    }

    const response = await fetch(url, options)
    clearTimeout(timeoutId)

    const expectedStatus = testConfig.expectedStatus || 200
    if (response.status === expectedStatus || (expectedStatus === 422 && response.status === 401) || (expectedStatus === 400 && response.status === 401)) {
      return { success: true }
    }

    if (response.status === 401 || response.status === 403) {
      return { success: false, error: `Authentication failed (${response.status})` }
    }

    if (response.status === 404) {
      return { success: false, error: 'Endpoint not found' }
    }

    if (response.status >= 500) {
      return { success: false, error: `Server error (${response.status})` }
    }

    if (response.status !== expectedStatus) {
      return { success: false, error: `Unexpected status ${response.status}` }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error' }
  }
}

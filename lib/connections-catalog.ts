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

export interface ConnectionStatus {
  status: 'connected' | 'disconnected' | 'missing_key' | 'error'
  lastTested?: string
  error?: string | null
}

export const PROVIDER_CATALOG: ConnectionProvider[] = [
  // AI Providers
  { id: 'openai', name: 'OpenAI', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-...' }], testConfig: { url: 'https://api.openai.com/v1/models', expectedStatus: 200 } },
  { id: 'gemini', name: 'Gemini', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'AI...' }], testConfig: { url: 'https://generativelanguage.googleapis.com/v1beta/models?key=', expectedStatus: 200 } },
  { id: 'anthropic', name: 'Anthropic', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-ant-...' }], testConfig: { url: 'https://api.anthropic.com/v1/messages', method: 'POST', expectedStatus: 400 } },
  { id: 'groq', name: 'Groq', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'gsk_...' }], testConfig: { url: 'https://api.groq.com/openai/v1/models', expectedStatus: 200 } },
  { id: 'ollama', name: 'Ollama', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'baseUrl', label: 'Base URL', type: 'text', placeholder: 'http://localhost:11434' }], testConfig: { url: 'http://localhost:11434/api/tags', expectedStatus: 200 } },
  { id: 'openrouter', name: 'OpenRouter', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-or-...' }], testConfig: { url: 'https://openrouter.ai/api/v1/models', expectedStatus: 200 } },
  { id: 'deepseek', name: 'DeepSeek', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-...' }], testConfig: { url: 'https://api.deepseek.com/v1/models', expectedStatus: 200 } },
  { id: 'mistral', name: 'Mistral', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'cAXx...' }], testConfig: { url: 'https://api.mistral.ai/v1/models', expectedStatus: 200 } },
  { id: 'cerebras', name: 'Cerebras', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'csk-...' }], testConfig: { url: 'https://api.cerebras.ai/v1/models', expectedStatus: 200 } },
  { id: 'together', name: 'Together', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'key_...' }], testConfig: { url: 'https://api.together.xyz/v1/models', expectedStatus: 200 } },
  { id: 'fireworks', name: 'Fireworks', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'fw_...' }], testConfig: { url: 'https://api.fireworks.ai/inference/v1/models', expectedStatus: 200 } },
  { id: 'sambanova', name: 'Sambanova', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }], testConfig: { url: 'https://api.sambanova.ai/v1/models', expectedStatus: 200 } },
  { id: 'nvidia-nim', name: 'NVIDIA NIM', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'nvapi-...' }], testConfig: { url: 'https://integrate.api.nvidia.com/v1/models', expectedStatus: 200 } },
  { id: 'huggingface', name: 'HuggingFace', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'apiKey', label: 'API Key / Token', type: 'password', placeholder: 'hf_...' }], testConfig: { url: 'https://huggingface.co/api/whoami-v2', expectedStatus: 200 } },
  { id: 'cloudflare-ai', name: 'Cloudflare AI', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'apiKey', label: 'API Token', type: 'password', placeholder: 'cfat_...' }], testConfig: { url: 'https://api.cloudflare.com/client/v4/user/tokens/verify', expectedStatus: 200 } },
  { id: 'replicate', name: 'Replicate', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'apiKey', label: 'API Token', type: 'password', placeholder: 'r8_...' }], testConfig: { url: 'https://api.replicate.com/v1/models', expectedStatus: 200 } },
  { id: 'perplexity', name: 'Perplexity', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }], testConfig: { url: 'https://api.perplexity.ai/v1/models', expectedStatus: 200 } },
  { id: 'cohere', name: 'Cohere', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }], testConfig: { url: 'https://api.cohere.com/v1/models', expectedStatus: 200 } },
  { id: 'longcat', name: 'LongCat', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'ak_...' }], testConfig: { url: 'https://api.longcat.chat/v1/models', expectedStatus: 200 } },
  { id: 'qwen', name: 'Qwen', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-...' }], testConfig: { url: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/models', expectedStatus: 200 } },
  { id: 'zai', name: 'Z.AI', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }], testConfig: { url: 'https://api.z.ai/api/paas/v4/models', expectedStatus: 200 } },
  { id: 'ai21', name: 'AI21', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }], testConfig: { url: 'https://api.ai21.com/studio/v1/models', expectedStatus: 200 } },
  { id: 'writesonic', name: 'Writesonic', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'fal', name: 'FAL AI', category: 'AI Providers', type: 'AI Provider', icon: 'memory', credentialFields: [{ key: 'apiKey', label: 'API Key / ID', type: 'password', placeholder: '...' }], testConfig: { url: 'https://fal.run/v1/models', expectedStatus: 200 } },

  // Image Providers
  { id: 'openai-images', name: 'OpenAI Images', category: 'Image Providers', type: 'Image Provider', icon: 'image', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-...' }], testConfig: { url: 'https://api.openai.com/v1/models', expectedStatus: 200 } },
  { id: 'gemini-images', name: 'Gemini Images', category: 'Image Providers', type: 'Image Provider', icon: 'image', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'AI...' }], testConfig: { url: 'https://generativelanguage.googleapis.com/v1beta/models?key=', expectedStatus: 200 } },
  { id: 'replicate-images', name: 'Replicate Images', category: 'Image Providers', type: 'Image Provider', icon: 'image', credentialFields: [{ key: 'apiKey', label: 'API Token', type: 'password', placeholder: 'r8_...' }], testConfig: { url: 'https://api.replicate.com/v1/models', expectedStatus: 200 } },
  { id: 'fal-images', name: 'FAL Images', category: 'Image Providers', type: 'Image Provider', icon: 'image', credentialFields: [{ key: 'apiKey', label: 'API Key / ID', type: 'password', placeholder: '...' }], testConfig: { url: 'https://fal.run/v1/models', expectedStatus: 200 } },
  { id: 'huggingface-images', name: 'HuggingFace Images', category: 'Image Providers', type: 'Image Provider', icon: 'image', credentialFields: [{ key: 'apiKey', label: 'API Token', type: 'password', placeholder: 'hf_...' }], testConfig: { url: 'https://huggingface.co/api/whoami-v2', expectedStatus: 200 } },
  { id: 'stability-ai', name: 'Stability AI', category: 'Image Providers', type: 'Image Provider', icon: 'image', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-...' }] },
  { id: 'ideogram', name: 'Ideogram', category: 'Image Providers', type: 'Image Provider', icon: 'image', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'leonardo', name: 'Leonardo', category: 'Image Providers', type: 'Image Provider', icon: 'image', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'bfl', name: 'BFL/FLUX', category: 'Image Providers', type: 'Image Provider', icon: 'image', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'bfl_...' }] },

  // Video Providers
  { id: 'google-veo', name: 'Google Veo', category: 'Video Providers', type: 'Video Provider', icon: 'videocam', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'AI...' }] },
  { id: 'runway', name: 'Runway', category: 'Video Providers', type: 'Video Provider', icon: 'videocam', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'key_...' }] },
  { id: 'kling', name: 'Kling', category: 'Video Providers', type: 'Video Provider', icon: 'videocam', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'api-key-...' }] },
  { id: 'luma', name: 'Luma', category: 'Video Providers', type: 'Video Provider', icon: 'videocam', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'luma-api-...' }] },
  { id: 'fal-video', name: 'Fal Video', category: 'Video Providers', type: 'Video Provider', icon: 'videocam', credentialFields: [{ key: 'apiKey', label: 'API Key / ID', type: 'password', placeholder: '...' }], testConfig: { url: 'https://fal.run/v1/models', expectedStatus: 200 } },
  { id: 'replicate-video', name: 'Replicate Video', category: 'Video Providers', type: 'Video Provider', icon: 'videocam', credentialFields: [{ key: 'apiKey', label: 'API Token', type: 'password', placeholder: 'r8_...' }], testConfig: { url: 'https://api.replicate.com/v1/models', expectedStatus: 200 } },
  { id: 'pika', name: 'Pika', category: 'Video Providers', type: 'Video Provider', icon: 'videocam', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'haiper', name: 'Haiper', category: 'Video Providers', type: 'Video Provider', icon: 'videocam', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }] },

  // Social Platforms
  { id: 'pinterest', name: 'Pinterest', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'apiKey', label: 'Access Token', type: 'password', placeholder: '...' }] },
  { id: 'instagram', name: 'Instagram', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'apiKey', label: 'Access Token', type: 'password', placeholder: '...' }] },
  { id: 'facebook', name: 'Facebook', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'apiKey', label: 'Page Access Token', type: 'password', placeholder: '...' }] },
  { id: 'x-twitter', name: 'X / Twitter', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'apiKey', label: 'Bearer Token', type: 'password', placeholder: '...' }] },
  { id: 'tiktok', name: 'TikTok', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'apiKey', label: 'Access Token', type: 'password', placeholder: '...' }] },
  { id: 'youtube', name: 'YouTube', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'linkedin', name: 'LinkedIn', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'apiKey', label: 'Access Token', type: 'password', placeholder: '...' }] },
  { id: 'threads', name: 'Threads', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'apiKey', label: 'Access Token', type: 'password', placeholder: '...' }] },
  { id: 'reddit', name: 'Reddit', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'apiKey', label: 'Access Token', type: 'password', placeholder: '...' }] },
  { id: 'discord', name: 'Discord', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'apiKey', label: 'Bot Token', type: 'password', placeholder: '...' }] },
  { id: 'telegram', name: 'Telegram', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'apiKey', label: 'Bot Token', type: 'password', placeholder: '...' }] },
  { id: 'bluesky', name: 'Bluesky', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'apiKey', label: 'App Password', type: 'password', placeholder: '...' }] },
  { id: 'mastodon', name: 'Mastodon', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'apiKey', label: 'Access Token', type: 'password', placeholder: '...' }] },
  { id: 'snapchat', name: 'Snapchat', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'apiKey', label: 'Access Token', type: 'password', placeholder: '...' }] },
  { id: 'twitch', name: 'Twitch', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'apiKey', label: 'Access Token', type: 'password', placeholder: '...' }] },
  { id: 'quora', name: 'Quora', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'medium', name: 'Medium', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'apiKey', label: 'Integration Token', type: 'password', placeholder: '...' }] },
  { id: 'devto', name: 'Dev.to', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'hashnode', name: 'Hashnode', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'wordpress', name: 'WordPress', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'apiKey', label: 'Application Password', type: 'password', placeholder: '...' }] },
  { id: 'github', name: 'GitHub', category: 'Social Platforms', type: 'Social Platform', icon: 'share', credentialFields: [{ key: 'apiKey', label: 'Personal Access Token', type: 'password', placeholder: 'ghp_...' }], testConfig: { url: 'https://api.github.com/user', expectedStatus: 200 } },

  // Google Services
  { id: 'google-search-console', name: 'Search Console', category: 'Google Services', type: 'Google Service', icon: 'search', credentialFields: [{ key: 'apiKey', label: 'OAuth Token / Service Account', type: 'password', placeholder: '...' }] },
  { id: 'google-analytics', name: 'Analytics 4', category: 'Google Services', type: 'Google Service', icon: 'search', credentialFields: [{ key: 'apiKey', label: 'OAuth Token / Service Account', type: 'password', placeholder: '...' }] },
  { id: 'google-ads', name: 'Ads', category: 'Google Services', type: 'Google Service', icon: 'search', credentialFields: [{ key: 'apiKey', label: 'OAuth Token / Developer Token', type: 'password', placeholder: '...' }] },
  { id: 'google-business-profile', name: 'Business Profile', category: 'Google Services', type: 'Google Service', icon: 'search', credentialFields: [{ key: 'apiKey', label: 'OAuth Token', type: 'password', placeholder: '...' }] },
  { id: 'google-merchant-center', name: 'Merchant Center', category: 'Google Services', type: 'Google Service', icon: 'search', credentialFields: [{ key: 'apiKey', label: 'OAuth Token', type: 'password', placeholder: '...' }] },
  { id: 'google-indexing', name: 'Indexing', category: 'Google Services', type: 'Google Service', icon: 'search', credentialFields: [{ key: 'apiKey', label: 'Service Account', type: 'password', placeholder: '...' }] },
  { id: 'google-custom-search', name: 'Custom Search', category: 'Google Services', type: 'Google Service', icon: 'search', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'AIza...' }], testConfig: { url: 'https://www.googleapis.com/customsearch/v1?key=', expectedStatus: 400 } },
  { id: 'google-maps', name: 'Maps/Places', category: 'Google Services', type: 'Google Service', icon: 'search', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'AIza...' }], testConfig: { url: 'https://maps.googleapis.com/maps/api/geocode/json?address=test&key=', expectedStatus: 200 } },
  { id: 'google-translate', name: 'Translate', category: 'Google Services', type: 'Google Service', icon: 'search', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'AIza...' }] },
  { id: 'google-vision', name: 'Vision', category: 'Google Services', type: 'Google Service', icon: 'search', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'AIza...' }] },
  { id: 'google-gemini-grounding', name: 'Gemini Grounding', category: 'Google Services', type: 'Google Service', icon: 'search', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'AI...' }] },
  { id: 'google-trends', name: 'Trends', category: 'Google Services', type: 'Google Service', icon: 'search', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }] },

  // Affiliate/Partners
  { id: 'amazon-associates', name: 'Amazon Associates', category: 'Affiliate/Partners', type: 'Affiliate Network', icon: 'handshake', credentialFields: [{ key: 'apiKey', label: 'Access Key / Secret', type: 'password', placeholder: '...' }] },
  { id: 'ebay', name: 'eBay', category: 'Affiliate/Partners', type: 'Affiliate Network', icon: 'handshake', credentialFields: [{ key: 'apiKey', label: 'Client ID / Secret', type: 'password', placeholder: '...' }] },
  { id: 'etsy', name: 'Etsy', category: 'Affiliate/Partners', type: 'Affiliate Network', icon: 'handshake', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'cj', name: 'CJ', category: 'Affiliate/Partners', type: 'Affiliate Network', icon: 'handshake', credentialFields: [{ key: 'apiKey', label: 'API Key / Website ID', type: 'password', placeholder: '...' }] },
  { id: 'impact', name: 'Impact', category: 'Affiliate/Partners', type: 'Affiliate Network', icon: 'handshake', credentialFields: [{ key: 'apiKey', label: 'Token / SID', type: 'password', placeholder: '...' }] },
  { id: 'awin', name: 'Awin', category: 'Affiliate/Partners', type: 'Affiliate Network', icon: 'handshake', credentialFields: [{ key: 'apiKey', label: 'API Key / Publisher ID', type: 'password', placeholder: '...' }] },
  { id: 'shareasale', name: 'ShareASale', category: 'Affiliate/Partners', type: 'Affiliate Network', icon: 'handshake', credentialFields: [{ key: 'apiKey', label: 'API Token / Affiliate ID', type: 'password', placeholder: '...' }] },
  { id: 'rakuten', name: 'Rakuten', category: 'Affiliate/Partners', type: 'Affiliate Network', icon: 'handshake', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }] },

  // Search/SEO
  { id: 'serper', name: 'Serper', category: 'Search/SEO', type: 'Search API', icon: 'travel_explore', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }], testConfig: { url: 'https://google.serper.dev/search', method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-KEY': 'REPLACE_KEY' }, body: { q: 'test' }, expectedStatus: 200 } },
  { id: 'serpapi', name: 'SerpAPI', category: 'Search/SEO', type: 'Search API', icon: 'travel_explore', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }], testConfig: { url: 'https://serpapi.com/search?q=test&api_key=REPLACE_KEY', expectedStatus: 200 } },
  { id: 'tavily', name: 'Tavily', category: 'Search/SEO', type: 'Search API', icon: 'travel_explore', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'brave-search', name: 'Brave Search', category: 'Search/SEO', type: 'Search API', icon: 'travel_explore', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'bing-search', name: 'Bing Search', category: 'Search/SEO', type: 'Search API', icon: 'travel_explore', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'ahrefs', name: 'Ahrefs', category: 'Search/SEO', type: 'SEO Tool', icon: 'travel_explore', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'semrush', name: 'SEMrush', category: 'Search/SEO', type: 'SEO Tool', icon: 'travel_explore', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'dataforseo', name: 'DataForSEO', category: 'Search/SEO', type: 'SEO Tool', icon: 'travel_explore', credentialFields: [{ key: 'apiKey', label: 'Login / Password', type: 'password', placeholder: '...' }] },
  { id: 'moz', name: 'Moz', category: 'Search/SEO', type: 'SEO Tool', icon: 'travel_explore', credentialFields: [{ key: 'apiKey', label: 'Access ID / Secret', type: 'password', placeholder: '...' }] },

  // Email
  { id: 'resend', name: 'Resend', category: 'Email', type: 'Email Provider', icon: 'mail', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 're_...' }], testConfig: { url: 'https://api.resend.com/emails', method: 'POST', expectedStatus: 422 } },
  { id: 'sendgrid', name: 'SendGrid', category: 'Email', type: 'Email Provider', icon: 'mail', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'SG....' }] },
  { id: 'mailgun', name: 'Mailgun', category: 'Email', type: 'Email Provider', icon: 'mail', credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }] },
  { id: 'smtp', name: 'SMTP', category: 'Email', type: 'Email Provider', icon: 'mail', credentialFields: [
    { key: 'host', label: 'Host', type: 'text', placeholder: 'smtp.example.com' },
    { key: 'port', label: 'Port', type: 'text', placeholder: '587' },
    { key: 'apiKey', label: 'Username / Password', type: 'password', placeholder: '...' }
  ] },

  // Storage
  { id: 'aws-s3', name: 'AWS S3', category: 'Storage', type: 'Storage Provider', icon: 'cloud_upload', credentialFields: [{ key: 'apiKey', label: 'Access Key ID / Secret', type: 'password', placeholder: '...' }] },
  { id: 'cloudflare-r2', name: 'Cloudflare R2', category: 'Storage', type: 'Storage Provider', icon: 'cloud_upload', credentialFields: [{ key: 'apiKey', label: 'Access Key ID / Secret', type: 'password', placeholder: '...' }] },

  // Analytics
  { id: 'posthog', name: 'PostHog', category: 'Analytics', type: 'Analytics Provider', icon: 'analytics', credentialFields: [{ key: 'apiKey', label: 'API Key / Project Key', type: 'password', placeholder: '...' }] },
  { id: 'mixpanel', name: 'Mixpanel', category: 'Analytics', type: 'Analytics Provider', icon: 'analytics', credentialFields: [{ key: 'apiKey', label: 'Token / Project ID', type: 'password', placeholder: '...' }] },
  { id: 'plausible', name: 'Plausible', category: 'Analytics', type: 'Analytics Provider', icon: 'analytics', credentialFields: [{ key: 'apiKey', label: 'API Key / Site ID', type: 'password', placeholder: '...' }] },

  // Monitoring
  { id: 'sentry', name: 'Sentry', category: 'Monitoring', type: 'Monitoring Provider', icon: 'monitoring', credentialFields: [{ key: 'apiKey', label: 'DSN / Auth Token', type: 'password', placeholder: '...' }] },
]

export const CATEGORIES = Array.from(new Set(PROVIDER_CATALOG.map(p => p.category)))

export function getProviderById(id: string): ConnectionProvider | undefined {
  return PROVIDER_CATALOG.find(p => p.id === id)
}

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const probes: Array<{ name: string; url: string; key: string; body: unknown; extract?: (r: any) => string }> = [
  {
    name: 'Cerebras',
    key: process.env.CEREBRAS_API_KEY || '',
    url: 'https://api.cerebras.ai/v1/chat/completions',
    body: { model: 'llama-3.3-70b', messages: [{ role: 'user', content: 'Reply with the single word OK' }], max_tokens: 10 },
  },
  {
    name: 'AI21',
    key: process.env.AI21_API_KEY || '',
    url: 'https://api.ai21.com/studio/v1/chat/completions',
    body: { model: 'jamba-mini', messages: [{ role: 'user', content: 'Reply with the single word OK' }], max_tokens: 10 },
  },
  {
    name: 'Cohere',
    key: process.env.COHERE_API_KEY || '',
    url: 'https://api.cohere.com/v2/chat',
    body: { model: 'command-a-03-2025', messages: [{ role: 'user', content: 'Reply with the single word OK' }] },
    extract: (r) => r?.message?.content?.[0]?.text,
  },
  {
    name: 'SambaNova',
    key: process.env.SAMBANOVA_API_KEY || '',
    url: 'https://api.sambanova.ai/v1/chat/completions',
    body: { model: 'Meta-Llama-3.3-70B-Instruct', messages: [{ role: 'user', content: 'Reply with the single word OK' }], max_tokens: 10 },
  },
  {
    name: 'Together',
    key: process.env.TOGETHER_API_KEY || '',
    url: 'https://api.together.xyz/v1/chat/completions',
    body: { model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', messages: [{ role: 'user', content: 'Reply with the single word OK' }], max_tokens: 10 },
  },
  {
    name: 'Fireworks',
    key: process.env.FIREWORKS_API_KEY || '',
    url: 'https://api.fireworks.ai/inference/v1/chat/completions',
    body: { model: 'accounts/fireworks/models/llama-v3p3-70b-instruct', messages: [{ role: 'user', content: 'Reply with the single word OK' }], max_tokens: 10 },
  },
  {
    name: 'NvidiaNIM',
    key: process.env.NVIDIA_NIM_API_KEY || '',
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    body: { model: 'meta/llama-3.3-70b-instruct', messages: [{ role: 'user', content: 'Reply with the single word OK' }], max_tokens: 10 },
  },
  {
    name: 'LongCat',
    key: process.env.LONGCAT_API_KEY || '',
    url: 'https://api.longcat.chat/openai/v1/chat/completions',
    body: { model: 'LongCat-Flash-Chat', messages: [{ role: 'user', content: 'Reply with the single word OK' }], max_tokens: 10 },
  },
  {
    name: 'Qwen',
    key: process.env.QWEN_API_KEY || '',
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    body: { model: 'qwen-plus', messages: [{ role: 'user', content: 'Reply with the single word OK' }], max_tokens: 10 },
  },
  {
    name: 'ZAI',
    key: process.env.ZAI_API_KEY || '',
    url: 'https://api.z.ai/api/paas/v4/chat/completions',
    body: { model: 'glm-4-flash', messages: [{ role: 'user', content: 'Reply with the single word OK' }], max_tokens: 10 },
  },
  {
    name: 'Perplexity',
    key: process.env.PERPLEXITY_API_KEY || '',
    url: 'https://api.perplexity.ai/chat/completions',
    body: { model: 'sonar', messages: [{ role: 'user', content: 'Reply with the single word OK' }], max_tokens: 10 },
  },
  {
    name: 'Omniroute',
    key: process.env.omniroute_API_KEY || '',
    url: 'https://api.omniroute.ai/v1/chat/completions',
    body: { model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Reply with the single word OK' }], max_tokens: 10 },
  },
  {
    name: 'Voyage',
    key: process.env.VOYAGE_API_KEY || '',
    url: 'https://api.voyageai.com/v1/chat/completions',
    body: { model: 'voyage-3', messages: [{ role: 'user', content: 'Reply with the single word OK' }], max_tokens: 10 },
  },
  {
    name: 'Writesonic',
    key: process.env.WRITESONIC_API_KEY || '',
    url: 'https://api.writesonic.com/v3/chat/completions',
    body: { model: 'gpt-4o', messages: [{ role: 'user', content: 'Reply with the single word OK' }], max_tokens: 10 },
  },
];

async function probe(p: (typeof probes)[number]) {
  if (!p.key) return `${p.name.padEnd(12)} NO_KEY`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    const res = await fetch(p.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${p.key}` },
      body: JSON.stringify(p.body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const text = await res.text();
    if (!res.ok) return `${p.name.padEnd(12)} HTTP ${res.status} ${text.slice(0, 110).replace(/\s+/g, ' ')}`;
    const json = JSON.parse(text);
    const out = p.extract ? p.extract(json) : json?.choices?.[0]?.message?.content;
    return `${p.name.padEnd(12)} OK  ->  ${String(out).slice(0, 40).replace(/\s+/g, ' ')}`;
  } catch (e) {
    return `${p.name.padEnd(12)} ERROR ${e instanceof Error ? e.message.slice(0, 80) : String(e)}`;
  }
}

async function main() {
  for (const p of probes) {
    console.log(await probe(p));
  }
}

main();

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { aiRouter } from '../core/ai/AIRouter';
import { AIResponseType } from '../core/ai/types';

async function main() {
  const r = await aiRouter.route({
    systemPrompt: 'You respond in strictly valid JSON.',
    userPrompt: 'Return JSON: {"ok":true,"echo":"hello"}',
    responseType: AIResponseType.JSON,
    temperature: 0.1,
  });
  console.log('provider=', r.provider, 'model=', r.model, 'tokens=', r.usage?.totalTokens);
  console.log('content=', r.content);
}

main().catch((e) => { console.error('ERR', e); process.exit(1); });

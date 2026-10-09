import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { AIRouter } from '@/core/ai/AIRouter';

async function testAIRouter() {
  console.log('Testing AI Router with real providers...');
  
  const router = new AIRouter();
  
  try {
    const response = await router.route({
      systemPrompt: 'You are a helpful assistant.',
      userPrompt: 'Say "OK" only.',
      responseType: 'text',
    });
    
    console.log('SUCCESS!');
    console.log('Provider:', response.provider);
    console.log('Model:', response.model);
    console.log('Latency:', response.latencyMs, 'ms');
    console.log('Content:', response.content);
  } catch (e) {
    console.log('FAILED:', e instanceof Error ? e.message : String(e));
  }
}

testAIRouter();
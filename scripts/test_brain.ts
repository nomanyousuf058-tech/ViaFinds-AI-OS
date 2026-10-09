import { config } from 'dotenv';
config({ path: '.env.local' });
import { buildBrainContext } from '../lib/brain/contextBuilder';
import { analyzeContext } from '../lib/brain/analyzer';

async function testBrainLoop() {
  console.log('Waking Brain with research query: "digital product trends 2026"');
  try {
    const context = await buildBrainContext('digital product trends 2026');
    console.log('Research data retrieved! Feeding to AI Analyzer...');
    
    const analysis = await analyzeContext(context);
    console.log('\n--- BRAIN ANALYSIS COMPLETE ---');
    
    console.log('\n--- OBSERVATIONS ---');
    analysis.observations?.forEach((o: any) => console.log(`- [${o.confidence}] ${o.fact}`));

    console.log('\n--- OPPORTUNITIES (Based on Research) ---');
    analysis.opportunities?.forEach((o: any) => {
      console.log(`\nTitle: ${o.fact?.substring(0, 100) || 'Untitled'}`);
      console.log(`Inference: ${o.inference}`);
      console.log(`Recommendation: ${o.recommendation}`);
      console.log(`Source: ${o.source}`);
    });
    
  } catch (error) {
    console.error('Brain test failed:', error);
  }
}

testBrainLoop().catch(console.error);

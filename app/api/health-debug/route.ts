import { NextResponse } from 'next/server';
import { providerRegistry } from '@/providers/ProviderRegistry';
import { healthChecker } from '@/core/ai/HealthChecker';
import { ProviderLoader } from '@/providers/ProviderLoader';
import { AIProviderType } from '@/core/ai/types';

export async function GET() {
  await ProviderLoader.loadProviders();
  
  const results: Record<string, any> = {};
  const providers = providerRegistry.getAllProviders();
  
  for (const provider of providers) {
    const type = provider.type;
    let validateHealthCalled = false;
    let validateHealthResult = false;
    let reason = '';
    
    try {
      validateHealthCalled = true;
      validateHealthResult = await provider.validateHealth();
    } catch (err: any) {
      reason = err.message || String(err);
    }
    
    results[type] = {
      registered: true,
      validateHealthCalled,
      validateHealthResult,
      reason
    };
  }
  
  // also check those not registered
  Object.values(AIProviderType).forEach(type => {
    if (!results[type]) {
      results[type] = {
        registered: false,
        validateHealthCalled: false,
        validateHealthResult: false,
        reason: 'Not registered'
      };
    }
  });

  return NextResponse.json(results);
}

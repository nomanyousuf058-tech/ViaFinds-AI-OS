import { AIProviderResponse, AIProviderType } from '../types';
import { modelRegistry } from '../ModelRegistry';

export class CostManager {
  public calculateCost(response: AIProviderResponse): number {
    if (response.provider === AIProviderType.OLLAMA) {
      return 0; // Local models are free
    }

    const modelInfo = modelRegistry.getModel(response.model);
    if (!modelInfo || !modelInfo.pricing) {
      return 0;
    }

    const inputCost = ((response.promptTokens || 0) / 1000) * modelInfo.pricing.inputPer1k;
    const outputCost = ((response.completionTokens || 0) / 1000) * modelInfo.pricing.outputPer1k;
    
    return inputCost + outputCost;
  }
}

export const costManager = new CostManager();

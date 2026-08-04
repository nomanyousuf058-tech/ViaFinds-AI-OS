import { promptLibrary } from './PromptLibrary';
import { promptValidator } from './PromptValidator';
import { AIPromptPayload, AIOptions } from '../types';

export class PromptManager {
  public async buildPayload(
    templateId: string, 
    variables: Record<string, any>, 
    options?: AIOptions
  ): Promise<AIPromptPayload> {
    const template = promptLibrary.get(templateId);
    if (!template) {
      throw new Error(`Prompt template ${templateId} not found`);
    }

    promptValidator.validateVariables(template, variables);

    // Simple string replacement for variables
    let userPrompt = template.template;
    for (const [key, value] of Object.entries(variables)) {
      const replacement = Array.isArray(value) ? JSON.stringify(value, null, 2) : String(value);
      userPrompt = userPrompt.replace(new RegExp(`{{${key}}}`, 'g'), replacement);
    }

    return {
      userPrompt,
      ...options,
    };
  }
}

export const promptManager = new PromptManager();

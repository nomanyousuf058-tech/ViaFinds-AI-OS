import { PromptTemplate } from '../types';

export class PromptValidator {
  public validateVariables(template: PromptTemplate, variables: Record<string, any>): void {
    const missing = template.requiredVariables.filter(v => variables[v] === undefined);
    if (missing.length > 0) {
      throw new Error(`Missing required variables for prompt ${template.id}: ${missing.join(', ')}`);
    }
  }
}

export const promptValidator = new PromptValidator();

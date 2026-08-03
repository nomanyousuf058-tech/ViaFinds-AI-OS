import { PromptTemplate } from '../types';

export class PromptLibrary {
  private templates: Map<string, PromptTemplate> = new Map();

  constructor() {
    this.register({
      id: 'simple-test',
      version: 1,
      category: 'test',
      template: '{{message}}',
      requiredVariables: ['message'],
    });

    this.register({
      id: 'product_extraction',
      version: 1,
      category: 'extraction',
      template: 'Extract the following fields from the given text: title, description, summary, tags (array), and brand. Format as valid JSON.\nText:\n{{rawProductData}}',
      requiredVariables: ['rawProductData'],
    });

    this.register({
      id: 'product_validation',
      version: 1,
      category: 'validation',
      template: 'Evaluate the following product data. Provide a quality score between 0.0 and 1.0, and a list of improvements. Format as JSON with "score" and "improvements" keys.\nData:\n{{draftContent}}',
      requiredVariables: ['draftContent'],
    });
  }

  public register(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }

  public get(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }
}

export const promptLibrary = new PromptLibrary();

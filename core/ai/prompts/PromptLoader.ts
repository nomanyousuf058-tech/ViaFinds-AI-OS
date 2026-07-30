import { promptLibrary } from './PromptLibrary';
import { PromptTemplate } from '../types';

export class PromptLoader {
  /**
   * Loads templates from filesystem or database into the library.
   * In a complete implementation, this would read from `.md` files or Sanity.
   */
  public async loadFromDirectory(path: string): Promise<void> {
    // Mock implementation for Phase 4 structure
    const mockTemplate: PromptTemplate = {
      id: 'mock-template',
      version: 1,
      category: 'test',
      template: 'Hello {{name}}!',
      requiredVariables: ['name'],
    };
    promptLibrary.register(mockTemplate);
  }
}

export const promptLoader = new PromptLoader();

import { GenerationQueue, JobStatus } from '../../../core/generation/queue/GenerationQueue';
import { ContentType } from '../../../core/generation/types';

// Mock contentEngine
jest.mock('../../../core/generation/ContentGenerationEngine', () => ({
  contentEngine: {
    generate: jest.fn()
  }
}));

import { contentEngine } from '../../../core/generation/ContentGenerationEngine';

describe('GenerationQueue', () => {
  let queue: GenerationQueue;

  beforeEach(() => {
    queue = new GenerationQueue();
    jest.clearAllMocks();
  });

  it('should add a job to the queue', async () => {
    const id = await queue.addJob({
      id: 'test-1',
      contentType: ContentType.PRODUCT,
      sourceContext: 'test data',
      sourceId: '123'
    });

    const job = queue.getJob(id);
    expect(job).toBeDefined();
    expect(job?.status).toBe(JobStatus.QUEUED);
    expect(job?.request.contentType).toBe(ContentType.PRODUCT);
  });

  it('should process a job successfully', async () => {
    (contentEngine.generate as jest.Mock).mockResolvedValue({
      success: true,
      title: 'Generated',
      body: 'Content',
      provider: 'test-provider'
    });

    const id = await queue.addJob({
      id: 'test-2',
      contentType: ContentType.PRODUCT,
      sourceContext: 'test data',
      sourceId: '123'
    });

    // Wait for the async processJob to complete
    await new Promise(resolve => setTimeout(resolve, 50));

    const job = queue.getJob(id);
    expect(job?.status).toBe(JobStatus.COMPLETED);
    expect(job?.result?.success).toBe(true);
  });

  it('should retry a failed job', async () => {
    (contentEngine.generate as jest.Mock).mockRejectedValue(new Error('API Error'));

    const id = await queue.addJob({
      id: 'test-3',
      contentType: ContentType.PRODUCT,
      sourceContext: 'test data',
      sourceId: '123'
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    const job = queue.getJob(id);
    // After first failure, it should increment retries and set status to QUEUED for next attempt
    expect(job?.retries).toBe(1);
    expect(job?.status).toBe(JobStatus.QUEUED);
  });
});

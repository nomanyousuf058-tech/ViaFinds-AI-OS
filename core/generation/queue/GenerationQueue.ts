import { ContentType, ContentGenerationRequest, ContentGenerationResult } from '../types';
import { contentEngine } from '../ContentGenerationEngine';
import { logger } from '../../../lib/logger';

export enum JobStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface QueueJob {
  id: string;
  status: JobStatus;
  request: ContentGenerationRequest;
  result?: ContentGenerationResult;
  retries: number;
  maxRetries: number;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
}

export class GenerationQueue {
  private jobs: Map<string, QueueJob> = new Map();
  private maxRetries = 3;

  public async addJob(request: ContentGenerationRequest, maxRetries = this.maxRetries): Promise<string> {
    const id = request.id || crypto.randomUUID();
    
    if (this.jobs.has(id)) {
      throw new Error(`Job with ID ${id} already exists`);
    }

    const job: QueueJob = {
      id,
      status: JobStatus.QUEUED,
      request: { ...request, id },
      retries: 0,
      maxRetries,
      createdAt: new Date(),
    };

    this.jobs.set(id, job);
    logger.info(`Added job ${id} to GenerationQueue`);
    
    // Asynchronously process the job to decouple from the request thread
    setTimeout(() => this.processJob(id), 0);

    return id;
  }

  public getJob(id: string): QueueJob | undefined {
    return this.jobs.get(id);
  }

  public getAllJobs(): QueueJob[] {
    return Array.from(this.jobs.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private async processJob(id: string) {
    const job = this.jobs.get(id);
    if (!job) return;
    if (job.status === JobStatus.RUNNING || job.status === JobStatus.COMPLETED) return;

    job.status = JobStatus.RUNNING;
    job.startedAt = new Date();
    
    try {
      logger.info(`Processing job ${id} (Attempt ${job.retries + 1}/${job.maxRetries + 1})`);
      const result = await contentEngine.generate(job.request);
      
      job.completedAt = new Date();
      job.durationMs = job.completedAt.getTime() - job.startedAt.getTime();
      job.result = result;
      
      if (result.success) {
        job.status = JobStatus.COMPLETED;
        logger.info(`Job ${id} completed successfully in ${job.durationMs}ms`);
      } else {
        job.status = JobStatus.FAILED;
        job.error = result.error || 'Validation failed or provider error';
        logger.warn(`Job ${id} failed to generate valid content: ${job.error}`);
        await this.handleFailure(job);
      }
    } catch (error: any) {
      job.completedAt = new Date();
      job.durationMs = job.completedAt.getTime() - job.startedAt.getTime();
      job.status = JobStatus.FAILED;
      job.error = error.message;
      logger.error(`Job ${id} threw an error: ${error.message}`);
      await this.handleFailure(job);
    }
  }

  private async handleFailure(job: QueueJob) {
    if (job.retries < job.maxRetries) {
      job.retries++;
      job.status = JobStatus.QUEUED; // Reset to queued
      logger.info(`Retrying job ${job.id} (Retry ${job.retries}/${job.maxRetries})`);
      // Add a small backoff delay
      setTimeout(() => this.processJob(job.id), 2000 * job.retries);
    } else {
      logger.error(`Job ${job.id} failed permanently after ${job.retries} retries`);
    }
  }
}

export const generationQueue = new GenerationQueue();

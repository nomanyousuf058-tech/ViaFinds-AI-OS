'use server';

import { ContentType, ContentGenerationRequest } from '../../../core/generation/types';
import { generationQueue } from '../../../core/generation/queue/GenerationQueue';
import { revalidatePath } from 'next/cache';

export async function submitGenerationJob(formData: FormData) {
  const sourceContext = formData.get('sourceContext') as string;
  const contentTypeStr = formData.get('contentType') as string;
  const targetPlatform = formData.get('targetPlatform') as string;
  const additionalInstructions = formData.get('additionalInstructions') as string;
  const contentType = ContentType[contentTypeStr as keyof typeof ContentType];

  if (!sourceContext || !contentType) {
    throw new Error('Source context and Content Type are required');
  }

  const request: ContentGenerationRequest = {
    id: crypto.randomUUID(),
    contentType,
    sourceContext,
    sourceId: 'dashboard-manual',
    targetPlatform: targetPlatform || undefined,
    additionalInstructions: additionalInstructions || undefined,
  };

  await generationQueue.addJob(request);
  revalidatePath('/dashboard/generation');
}

// In a real application, we would probably pull jobs from the DB. 
// For this queue version, we pull from the in-memory queue.
export async function getJobs() {
  return generationQueue.getAllJobs();
}

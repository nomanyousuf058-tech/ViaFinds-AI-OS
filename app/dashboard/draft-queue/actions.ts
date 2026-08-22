'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@sanity/client';
import { adminOnly } from '@/lib/auth';

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'e44z7hta',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_TOKEN || process.env.SANITY_API_TOKEN,
  useCdn: false,
});

export async function publishDraft(draftId: string) {
  await adminOnly();
  if (!process.env.SANITY_TOKEN && !process.env.SANITY_API_TOKEN) {
    throw new Error('SANITY_TOKEN environment variable not set.');
  }

  // 1. Fetch the draft document
  const draft = await writeClient.fetch(`*[_id == $id][0]`, { id: draftId });
  if (!draft) {
    throw new Error('Draft not found.');
  }

  // 2. Prepare the published document
  const publishedId = draftId.replace('drafts.', '');
  const publishedDoc = {
    ...draft,
    _id: publishedId,
    status: 'published', // Depending on your schema, this field might be required
  };

  // Remove system fields that shouldn't be written directly
  delete publishedDoc._createdAt;
  delete publishedDoc._updatedAt;
  delete publishedDoc._rev;

  // 3. Mutate Sanity
  try {
    await writeClient
      .transaction()
      .createOrReplace(publishedDoc)
      .delete(draftId)
      .commit();
  } catch (error) {
    console.error('Failed to publish draft in Sanity:', error);
    throw new Error('Failed to publish draft.');
  }

  revalidatePath('/dashboard/draft-queue');
}

export async function rejectDraft(draftId: string) {
  await adminOnly();
  if (!process.env.SANITY_TOKEN && !process.env.SANITY_API_TOKEN) {
    throw new Error('SANITY_TOKEN environment variable not set.');
  }

  try {
    await writeClient.delete(draftId);
  } catch (error) {
    console.error('Failed to reject draft in Sanity:', error);
    throw new Error('Failed to reject draft.');
  }

  revalidatePath('/dashboard/draft-queue');
}

'use server';

import { revalidatePath } from 'next/cache';
import { client } from '../../../lib/sanity.client';
import { createClient } from '@sanity/client';

const writeClient = createClient({
  projectId: 'e44z7hta',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_TOKEN,
  useCdn: false,
});

export async function publishDraft(draftId: string) {
  if (!process.env.SANITY_TOKEN) {
    throw new Error('SANITY_TOKEN environment variable not set.');
  }

  // 1. Fetch the draft document
  const draft = await client.fetch(`*[_id == $id][0]`, { id: draftId });
  if (!draft) {
    throw new Error('Draft not found.');
  }

  // 2. Prepare the published document
  const publishedId = draftId.replace('drafts.', '');
  const publishedDoc = {
    ...draft,
    _id: publishedId,
    status: 'published',
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

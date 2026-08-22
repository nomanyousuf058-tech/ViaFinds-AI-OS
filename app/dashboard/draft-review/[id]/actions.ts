'use server';
import { adminOnly } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { clientDrafts as writeClient } from '@/lib/sanity.client';

export async function approveDraft(formData: FormData) {
  await adminOnly();
  const productId = formData.get('productId') as string;
  const articleId = formData.get('articleId') as string;

  try {
    const newProductId = productId.replace('drafts.', '');
    const product = await writeClient.getDocument(productId);
    if (product) {
      const publishedProduct = {
        ...product,
        _id: newProductId,
        status: 'published',
        publishedAt: new Date().toISOString(),
        metadata: {
          ...(product.metadata || {}),
          publishing: {
            ...(product.metadata?.publishing || {}),
            status: 'published',
            approvalStatus: 'approved',
            published: true,
            publishedAt: new Date().toISOString(),
          },
        },
      };
      await writeClient.createOrReplace(publishedProduct);
      await writeClient.delete(productId);
    }

    if (articleId) {
      const newArticleId = articleId.replace('drafts.', '');
      const article = await writeClient.getDocument(articleId);
      if (article) {
        const publishedArticle = {
          ...article,
          _id: newArticleId,
          publishedAt: new Date().toISOString(),
          metadata: {
            ...(article.metadata || {}),
            publishing: {
              ...(article.metadata?.publishing || {}),
              status: 'published',
              approvalStatus: 'approved',
              published: true,
              publishedAt: new Date().toISOString(),
            },
          },
        };
        await writeClient.createOrReplace(publishedArticle);
        await writeClient.delete(articleId);
      }
    }

    revalidatePath('/dashboard/draft-queue');
  } catch (err) {
    console.error('Failed to approve draft:', err);
    throw new Error('Approval failed');
  }

  redirect('/dashboard/draft-queue');
}

export async function rejectDraft(formData: FormData) {
  await adminOnly();
  const productId = formData.get('productId') as string;
  const articleId = formData.get('articleId') as string;

  try {
    await writeClient.delete(productId);
    if (articleId) {
      await writeClient.delete(articleId);
    }

    revalidatePath('/dashboard/draft-queue');
  } catch (err) {
    console.error('Failed to reject draft:', err);
    throw new Error('Rejection failed');
  }

  redirect('/dashboard/draft-queue');
}
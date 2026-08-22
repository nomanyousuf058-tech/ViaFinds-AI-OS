/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@sanity/client';
import { adminOnly } from '@/lib/auth';
import crypto from 'node:crypto';

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'e44z7hta',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

export async function POST(req: Request) {
  try {
    await adminOnly();

    const body = await req.json();
    const { type, url, affiliateUrl, sourceUrl, merchant, title, priority = 5, queueType = 'product' } = body;

    const finalAffiliateUrl = affiliateUrl || url;
    const finalSourceUrl = sourceUrl || url;
    const finalQueueType = type === 'MANUAL_PRODUCT' ? 'manual_product' : queueType;
    const finalTitle = title || `Manual Product - ${new URL(finalAffiliateUrl).hostname}`;

    if (!finalAffiliateUrl && !finalSourceUrl) {
      return NextResponse.json({ error: 'affiliateUrl or sourceUrl is required' }, { status: 400 });
    }

    const normalizedUrl = (finalAffiliateUrl || finalSourceUrl).replace(/#aff=[^/]*$/, '').replace(/\?viafinds.*$/, '');

    const existing = await client.fetch(
      `count(*[_type in ["product", "queueItem"] && (affiliateUrl match $url || sourceUrl match $url || metadata.source.url match $url)])`,
      { url: normalizedUrl }
    );

    if (existing > 0) {
      return NextResponse.json({ error: 'Item already exists in product or queue' }, { status: 409 });
    }

    const itemWithTag = finalAffiliateUrl
      ? (finalAffiliateUrl.includes('#aff=') ? finalAffiliateUrl : `${finalAffiliateUrl}#aff=Viafinds`)
      : finalSourceUrl;

    const uuid = crypto.randomUUID();
    const doc = {
      _type: 'queueItem',
      _id: `queue.${uuid}`,
      queueType: finalQueueType,
      title: finalTitle,
      merchant: merchant || new URL(itemWithTag).hostname.replace('www.', ''),
      affiliateUrl: itemWithTag,
      sourceUrl: finalSourceUrl || itemWithTag,
      priority,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const created = await client.create(doc);

    return NextResponse.json({ success: true, item: created }, { status: 201 });
  } catch (err) {
    console.error('Queue add error:', err);
    return NextResponse.json({ error: 'Failed to add to queue' }, { status: 500 });
  }
}

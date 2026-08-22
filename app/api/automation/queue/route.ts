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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status') || 'pending';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const query = status === 'all'
      ? `*[_type == "queueItem"] | order(priority desc, createdAt desc) [${offset}...${offset + limit}] { _id, title, merchant, affiliateUrl, sourceUrl, priority, status, queueType, discoverySource, createdAt, startedAt, completedAt, errors, workflowId }`
      : `*[_type == "queueItem" && status == $status] | order(priority desc, createdAt desc) [${offset}...${offset + limit}] { _id, title, merchant, affiliateUrl, sourceUrl, priority, status, queueType, discoverySource, createdAt, startedAt, completedAt, errors, workflowId }`;

    const items = status === 'all'
      ? await client.fetch(query)
      : await client.fetch(query, { status });

    const countQuery = status === 'all'
      ? `count(*[_type == "queueItem"])`
      : `count(*[_type == "queueItem" && status == $status])`;

    const total = status === 'all'
      ? await client.fetch(countQuery)
      : await client.fetch(countQuery, { status });

    const statsQuery = await client.fetch(`
      {
        "pending": count(*[_type == "queueItem" && status == "pending"]),
        "running": count(*[_type == "queueItem" && status == "running"]),
        "completed": count(*[_type == "queueItem" && status == "completed"]),
        "failed": count(*[_type == "queueItem" && status == "failed"]),
        "skipped": count(*[_type == "queueItem" && status == "skipped"]),
      }
    `);

    return NextResponse.json({ items, total, stats: statsQuery, limit, offset });
  } catch (err) {
    console.error('Queue GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await adminOnly();

    const body = await req.json();
    const { affiliateUrl, sourceUrl, merchant, title, priority = 5, queueType = 'product' } = body;

    if (!affiliateUrl && !sourceUrl) {
      return NextResponse.json({ error: 'affiliateUrl or sourceUrl is required' }, { status: 400 });
    }

    const url = affiliateUrl || sourceUrl;
    const normalizedUrl = url.replace(/#aff=[^/]*$/, '').replace(/\?viafinds.*$/, '');

    const existing = await client.fetch(
      `count(*[_type in ["product", "queueItem"] && (affiliateUrl match $url || sourceUrl match $url)])`,
      { url: normalizedUrl }
    );

    if (existing > 0) {
      return NextResponse.json({ error: 'Item already exists in product or queue' }, { status: 409 });
    }

    const itemWithTag = affiliateUrl
      ? (affiliateUrl.includes('#aff=') ? affiliateUrl : `${affiliateUrl}#aff=Viafinds`)
      : sourceUrl;

    const uuid = crypto.randomUUID();
    const doc = {
      _type: 'queueItem',
      _id: `queue.${uuid}`,
      queueType,
      title: title || `Product - ${new URL(itemWithTag).hostname}`,
      merchant: merchant || new URL(itemWithTag).hostname.replace('www.', ''),
      affiliateUrl: itemWithTag,
      sourceUrl: sourceUrl || itemWithTag,
      priority,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const created = await client.create(doc);

    return NextResponse.json({ success: true, item: created }, { status: 201 });
  } catch (err) {
    console.error('Queue POST error:', err);
    return NextResponse.json({ error: 'Failed to add to queue' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await adminOnly();

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Queue item ID is required' }, { status: 400 });
    }

    await client.delete(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Queue DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete from queue' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await adminOnly();

    const body = await req.json();
    const { id, status, priority } = body;

    if (!id) {
      return NextResponse.json({ error: 'Queue item ID is required' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (status) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    updates.updatedAt = new Date().toISOString();

    const updated = await client.patch(id).set(updates).commit();

    return NextResponse.json({ success: true, item: updated });
  } catch (err) {
    console.error('Queue PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update queue item' }, { status: 500 });
  }
}
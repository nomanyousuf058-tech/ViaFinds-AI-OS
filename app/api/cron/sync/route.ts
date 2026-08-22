import { NextResponse } from 'next/server';
import { Digistore24Provider } from '@/providers/affiliate/Digistore24Provider';
import { createClient } from '@sanity/client';
import { logger } from '@/lib/logger';

const SANITY_API_VERSION = '2024-01-01';

function getSanityWriteClient() {
  return createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'e44z7hta',
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
    apiVersion: SANITY_API_VERSION,
    token: process.env.SANITY_WRITE_TOKEN || process.env.SANITY_TOKEN || process.env.SANITY_API_TOKEN,
    useCdn: false,
    perspective: 'raw',
  });
}

function getDigiApiKey() {
  return process.env.DIGISTORE24_API_KEY || process.env.DIGISTORE24_APIKEY || '';
}

async function resolveParentCategory(client: ReturnType<typeof getSanityWriteClient>, name: string) {
  const doc = await client.fetch(
    `*[_type == "category" && slug.current == $slug && !defined(parentCategory)][0]{_id}`,
    { slug: name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') }
  );
  return doc?._id || null;
}

async function resolveOrCreateSubcategory(client: ReturnType<typeof getSanityWriteClient>, parentId: string | null, subName: string) {
  if (!parentId) return null;
  const slug = subName.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  const existing = await client.fetch(`*[_type == "category" && slug.current == $slug][0]{_id}`, { slug });
  if (existing?._id) return existing._id;

  const id = `category-${crypto.randomUUID()}`;
  await client.createIfNotExists({
    _id: id,
    _type: 'category',
    title: subName,
    name: subName,
    slug: { current: slug },
    level: 2,
    parentCategory: { _type: 'reference', _ref: parentId },
  });
  return id;
}

interface DigiProduct {
  name: string;
  description?: string;
  price: string;
  currency: string;
  affiliateUrl: string;
}

function matchParent(productName: string): { name: string; slug: string } | null {
  const lower = productName.toLowerCase();
  const luxuryBeautyKeywords = ['beauty', 'beauty', 'skincare', 'makeup', 'serum', 'cream', 'lipstick', 'perfume', 'fragrance', 'cosmetics', 'hair', 'grooming', 'supplement', 'biohacking', 'anti-aging', 'vitamin', 'collagen'];
  const digitalProductKeywords = ['software', 'ai', 'workflow', 'course', 'courses', 'saas', 'automation', 'template', 'training', 'education', 'e-learning', 'plugin', 'script', 'app'];

  const luxuryScore = luxuryBeautyKeywords.reduce((score, kw) => score + (lower.includes(kw) ? kw.length : 0), 0);
  const digitalScore = digitalProductKeywords.reduce((score, kw) => score + (lower.includes(kw) ? kw.length : 0), 0);

  if (luxuryScore >= digitalScore && luxuryScore > 0) {
    return { name: 'Luxury Beauty', slug: 'luxury-beauty' };
  }
  if (digitalScore > 0) {
    return { name: 'High-Ticket Digital Products', slug: 'high-ticket-digital-products' };
  }
}


export async function POST(request: Request) {
  try {
    const cronSecret = request.headers.get('x-vercel-cron-signature') || request.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET;

    // Fixed cron secret validation with Bearer prefix handling
if (expectedSecret) {
  const providedSecret = cronSecret?.replace(/Bearer\s+/i, '');
  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } catch (err) {
    // If secret check fails unexpectedly, block the request
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

    const apiKey = getDigiApiKey();
  if (!apiKey) {
            return NextResponse.json({ error: 'Digistore24 API key is not configured.' }, { status: 500 });
  }

  const client = getSanityWriteClient();
  const provider = new Digistore24Provider(apiKey);

  try {
  const products = await provider.discoverProducts('trending', 25);
  const results = { synced: 0, skipped: 0, errors: [] as string[] };

  for (const product of products as DigiProduct[]) {
      try {
        const slug = product.name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
        const existing = await client.fetch(`*[_type == "product" && slug.current == $slug][0]{_id}`, { slug });
        if (existing?._id) {
          results.skipped++;
          continue;
        }

        const parentMatch = matchParent(product.name);
        if (!parentMatch) {
          results.skipped++;
          continue;
        }

        const parentId = await resolveParentCategory(client, parentMatch.name);
        if (!parentId) {
          results.skipped++;
          continue;
        }

        let categoryId: string | null = null;
        if (parentMatch.slug === 'luxury-beauty') {
          categoryId = await resolveOrCreateSubcategory(client, parentId, 'Supplements');
          if (!categoryId) categoryId = await resolveOrCreateSubcategory(client, parentId, 'Beauty');
        } else if (parentMatch.slug === 'high-ticket-digital-products') {
          categoryId = await resolveOrCreateSubcategory(client, parentId, 'Software');
          if (!categoryId) categoryId = await resolveOrCreateSubcategory(client, parentId, 'Courses');
        }

        const productDoc = {
          _id: `product-${crypto.randomUUID()}`,
          _type: 'product',
          title: product.name,
          slug: { current: slug },
          shortDescription: product.description?.slice(0, 240) || '',
          description: product.description
            ? [{ _type: 'block', _key: crypto.randomUUID(), style: 'normal', children: [{ _key: crypto.randomUUID(), _type: 'span', text: product.description }] }]
            : [],
          status: 'published',
          publishedAt: new Date().toISOString(),
          featured: true,
          trending: true,
          editorChoice: false,
          bestSeller: false,
          newest: true,
          affiliateNetwork: 'digistore24',
          affiliateUrl: product.affiliateUrl,
          price: parseFloat(product.price) || 0,
          currency: product.currency || 'USD',
          availability: 'in_stock',
          rating: 0,
          discount: 0,
          brand: { _type: 'reference', _ref: `brand-${crypto.randomUUID()}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;

        if (categoryId) {
          productDoc.category = { _type: 'reference', _ref: categoryId };
        }

        await client.create(productDoc);
        results.synced++;
  } catch (err) {
        results.errors.push(`${product.name}: ${(err as Error).message}`);
  }
}

    logger.info('Cron sync completed', results);
                return NextResponse.json({ ok: true, synced: results.synced, skipped: results.skipped, errors: results.errors });
  } catch (err) {
    logger.error('Cron sync failed', err as Error);
            return NextResponse.json({ error: 'Sync failed', message: (err as Error).message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

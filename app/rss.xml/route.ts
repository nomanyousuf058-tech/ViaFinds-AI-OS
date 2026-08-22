import { NextResponse } from 'next/server';
import { client } from '@/lib/sanity.client';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://viafinds.com';
    
    const [products, articles] = await Promise.all([
      client.fetch(`
        *[_type == "product" && status == "published"] | order(publishedAt desc) [0...50] {
          _id,
          title,
          "slug": slug.current,
          shortDescription,
          "category": category->{name, "slug": slug.current},
          publishedAt,
          price,
          currency
        }
      `),
      client.fetch(`
        *[_type == "article" && publishedAt <= now()] | order(publishedAt desc) [0...25] {
          _id,
          title,
          "slug": slug.current,
          excerpt,
          publishedAt,
          "category": category->{name, "slug": slug.current}
        }
      `),
    ]);

    const productItems = (products || []).map((product: { title: string; slug: string; shortDescription?: string; publishedAt?: string; category?: { name?: string; slug?: string } }) => {
      const link = product.category?.slug ? `${baseUrl}/${product.category.slug}/${product.slug}` : `${baseUrl}/${product.slug}`;
      return {
        title: product.title,
        link,
        description: product.shortDescription || `Curated discovery: ${product.title}`,
        pubDate: product.publishedAt ? new Date(product.publishedAt).toUTCString() : undefined,
        category: product.category?.name,
        guid: link,
      };
    });

    const articleItems = (articles || []).map((article: { title: string; slug: string; excerpt?: string; publishedAt?: string; category?: { name?: string; slug?: string } }) => ({
      title: article.title,
      link: `${baseUrl}/articles/${article.slug}`,
      description: article.excerpt || `Editorial guide: ${article.title}`,
      pubDate: article.publishedAt ? new Date(article.publishedAt).toUTCString() : undefined,
      category: article.category?.name,
      guid: `${baseUrl}/articles/${article.slug}`,
    }));

    const items = [...productItems, ...articleItems];

    const rssItems = items
      .map((item) => {
        const lines = [
          '<item>',
          `  <title><![CDATA[${item.title}]]></title>`,
          `  <link>${item.link}</link>`,
          `  <description><![CDATA[${item.description}]]></description>`,
          `  <guid isPermaLink="true">${item.guid}</guid>`,
        ];
        if (item.pubDate) {
          lines.push(`  <pubDate>${item.pubDate}</pubDate>`);
        }
        if (item.category) {
          lines.push(`  <category>${item.category}</category>`);
        }
        lines.push('</item>');
        return lines.join('\n');
      })
      .join('\n');

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ViaFinds Curated Discoveries</title>
    <link>${baseUrl}</link>
    <description>Curated discoveries across Luxury Beauty and High-Ticket Digital Products.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
    ${rssItems}
  </channel>
</rss>`;

    return new NextResponse(rss, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=600, s-maxage=1800',
      },
    });
  } catch (err) {
    logger.error('Failed to build RSS feed', err as Error);
    return NextResponse.json({ error: 'Failed to build RSS feed' }, { status: 500 });
  }
}

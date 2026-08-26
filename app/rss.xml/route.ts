import { NextResponse } from 'next/server'
import { articleRepository } from '@/lib/db/repositories'
import type { ArticleRow } from '@/lib/db/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://viafinds.com'

    const articles = await articleRepository.findPublished(50, 0)

    const articleItems = articles.map((article: ArticleRow) => ({
      title: article.title,
      link: `${baseUrl}/articles/${article.slug}`,
      description: article.excerpt || `Editorial guide: ${article.title}`,
      pubDate: article.published_at ? new Date(article.published_at).toUTCString() : undefined,
      guid: `${baseUrl}/articles/${article.slug}`,
    }))

    const rssItems = articleItems
      .map((item) => {
        const lines = [
          '<item>',
          `  <title><![CDATA[${item.title}]]></title>`,
          `  <link>${item.link}</link>`,
          `  <description><![CDATA[${item.description}]]></description>`,
          `  <guid isPermaLink="true">${item.guid}</guid>`,
        ]
        if (item.pubDate) {
          lines.push(`  <pubDate>${item.pubDate}</pubDate>`)
        }
        lines.push('</item>')
        return lines.join('\n')
      })
      .join('\n')

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ViaFinds Editorial</title>
    <link>${baseUrl}</link>
    <description>Research-backed articles, guides, and insights from ViaFinds.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
    ${rssItems}
  </channel>
</rss>`

    return new NextResponse(rss, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=600, s-maxage=1800',
      },
    })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to build RSS feed' }, { status: 500 })
  }
}

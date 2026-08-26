import { MetadataRoute } from 'next'
import { articleRepository } from '@/lib/db/repositories'
import type { ArticleRow } from '@/lib/db/types'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://viafinds.com'

  const routes = [
    { url: baseUrl, lastModified: new Date() },
    { url: `${baseUrl}/search`, lastModified: new Date() },
    { url: `${baseUrl}/privacy-policy`, lastModified: new Date() },
    { url: `${baseUrl}/terms-of-service`, lastModified: new Date() },
    { url: `${baseUrl}/affiliate-disclosure`, lastModified: new Date() },
    { url: `${baseUrl}/cookie-policy`, lastModified: new Date() },
    { url: `${baseUrl}/about`, lastModified: new Date() },
    { url: `${baseUrl}/contact`, lastModified: new Date() },
  ]

  try {
    const articles = await articleRepository.findPublished(1000, 0)
    const articleEntries = articles.map((a: ArticleRow) => ({
      url: `${baseUrl}/articles/${a.slug}`,
      lastModified: new Date(a.updated_at || a.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    return [...routes, ...articleEntries]
  } catch (err) {
    console.error('Error compiling sitemap:', err)
    return routes
  }
}

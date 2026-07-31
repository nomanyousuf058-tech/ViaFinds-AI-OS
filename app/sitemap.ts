import { MetadataRoute } from 'next'
import { client } from '@/lib/sanity.client'
import {
  SITEMAP_PRODUCTS_QUERY,
  SITEMAP_ARTICLES_QUERY,
  SITEMAP_CATEGORIES_QUERY,
  SITEMAP_BRANDS_QUERY,
} from '@/lib/sanity.queries'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://viafinds.com'

  const routes = [
    { url: baseUrl, lastModified: new Date() },
    { url: `${baseUrl}/toolkit`, lastModified: new Date() },
    { url: `${baseUrl}/search`, lastModified: new Date() },
    { url: `${baseUrl}/privacy-policy`, lastModified: new Date() },
    { url: `${baseUrl}/terms-of-service`, lastModified: new Date() },
    { url: `${baseUrl}/affiliate-disclosure`, lastModified: new Date() },
    { url: `${baseUrl}/cookie-policy`, lastModified: new Date() },
    { url: `${baseUrl}/about`, lastModified: new Date() },
    { url: `${baseUrl}/contact`, lastModified: new Date() },
  ]

  try {
    const [products, articles, categories, brands] = await Promise.all([
      client.fetch<Array<{ slug: string; category?: { slug: string }; _updatedAt: string }>>(SITEMAP_PRODUCTS_QUERY),
      client.fetch<Array<{ slug: string; _updatedAt: string }>>(SITEMAP_ARTICLES_QUERY),
      client.fetch<Array<{ slug: string; _updatedAt: string }>>(SITEMAP_CATEGORIES_QUERY),
      client.fetch<Array<{ slug: string; _updatedAt: string }>>(SITEMAP_BRANDS_QUERY),
    ])

    // Products sitemap entries
    const productEntries = (products || []).map((p) => {
      let path = `/${p.slug}`
      if (p.category?.slug) {
        path = `/${p.category.slug}/${p.slug}`
      }
      return {
        url: `${baseUrl}${path}`,
        lastModified: new Date(p._updatedAt),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }
    })

    // Articles sitemap entries
    const articleEntries = (articles || []).map((a) => ({
      url: `${baseUrl}/articles/${a.slug}`,
      lastModified: new Date(a._updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    // Categories sitemap entries
    const categoryEntries = (categories || []).map((c) => ({
      url: `${baseUrl}/${c.slug}`,
      lastModified: new Date(c._updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }))

    // Brands sitemap entries
    const brandEntries = (brands || []).map((b) => ({
      url: `${baseUrl}/brands/${b.slug}`,
      lastModified: new Date(b._updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))

    return [...routes, ...categoryEntries, ...productEntries, ...articleEntries, ...brandEntries]
  } catch (err) {
    console.error('Error compiling dynamic sitemaps:', err)
    return routes
  }
}

import React from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { client, urlFor } from '@/lib/sanity.client'
import {
  CATEGORY_BY_SLUG_QUERY,
  PRODUCTS_BY_CATEGORY_QUERY,
  ARTICLES_BY_CATEGORY_QUERY,
} from '@/lib/sanity.queries'
import Breadcrumbs, { BreadcrumbItem } from '@/components/Breadcrumbs'
import ProductCard from '@/components/ProductCard'
import ArticleCard from '@/components/ArticleCard'
import SubcategoriesRow from '@/components/SubcategoriesRow'
import type { Category, Product, Article } from '@/lib/types'

interface CategoryPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params
  if (!slug) return { title: 'Category Not Found' }

  const category = await client.fetch<Category | null>(CATEGORY_BY_SLUG_QUERY, { slug })

  if (!category) return { title: 'Category Not Found' }

  const title = category.seo?.metaTitle || category.seoTitle || `${category.name} Vetted Collection`
  const desc = category.seo?.metaDescription || category.seoDescription || category.description || `Discover expert reviews, buying guides, and trending products in ${category.name}.`
  const ogImage = category.seo?.ogImage ? urlFor(category.seo.ogImage) : category.bannerImage ? urlFor(category.bannerImage) : category.coverImage ? urlFor(category.coverImage) : ''

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images: ogImage ? [{ url: ogImage }] : [],
    },
    robots: category.seo?.noIndex ? 'noindex, nofollow' : 'index, follow',
  }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params
  const resolvedSearchParams = await searchParams

  if (!slug) return notFound()

  const category = await client.fetch<Category | null>(CATEGORY_BY_SLUG_QUERY, { slug })

  if (!category) return notFound()

  const page = Number(resolvedSearchParams.page) || 1
  const limit = 24
  const from = (page - 1) * limit
  const to = from + limit

  const [products, articles] = await Promise.all([
    client.fetch<Product[]>(PRODUCTS_BY_CATEGORY_QUERY, { categoryId: category._id, from: 0, to: 500 }),
    client.fetch<Article[]>(ARTICLES_BY_CATEGORY_QUERY, { categoryId: category._id, from: 0, to: 50 }),
  ])

  const paginatedProducts = products.slice(from, to)
  const totalCount = products.length
  const totalPages = Math.ceil(totalCount / limit)

  const breadcrumbItems: BreadcrumbItem[] = []
  let currentCat = category.parentCategory

  while (currentCat) {
    breadcrumbItems.unshift({
      name: currentCat.name,
      slug: currentCat.slug,
    })
    currentCat = currentCat.parentCategory
  }

  breadcrumbItems.push({
    name: category.name,
    slug: slug,
  })

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: category.name,
    description: category.description || `Browse vetted items in ${category.name}`,
    url: `https://viafinds.com/category/${slug}`,
  }

  return (
    <div className="w-full flex flex-col bg-background text-on-background font-ui-body antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />

      {/* ── Category Hero ── */}
      <section className="border-b border-slate-border">
        <div className="max-w-max-content-width mx-auto px-margin-mobile md:px-margin-desktop pt-16 md:pt-20 pb-12">
          <Breadcrumbs items={breadcrumbItems.slice(0, -1)} />
          <div className="mt-4">
            <h1 className="font-headline-xl text-headline-xl text-on-background">
              {category.name}
            </h1>
            {category.description && (
              <p className="font-editorial-body text-editorial-body text-on-surface-variant max-w-2xl mt-4">
                {category.description}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Subcategories ── */}
      {category.subcategories && category.subcategories.length > 0 && (
        <section className="border-b border-slate-border">
          <div className="max-w-max-content-width mx-auto px-margin-mobile md:px-margin-desktop py-6">
            <SubcategoriesRow
              subcategories={category.subcategories}
              parentPath={`/category/${slug}`}
            />
          </div>
        </section>
      )}

      {/* ── Products Section ── */}
      <section className="py-section-gap max-w-max-content-width mx-auto px-margin-mobile md:px-margin-desktop w-full">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-border">
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
            {totalCount} Curated {totalCount === 1 ? 'Product' : 'Products'}
          </span>
        </div>

        {paginatedProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedProducts.map((product) => (
              <ProductCard key={product._id} product={product} categoryPath={`/category/${slug}`} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-4 border border-dashed border-slate-border rounded">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-4 font-light" aria-hidden="true">
              search_off
            </span>
            <h3 className="font-headline-lg text-headline-lg-mobile text-on-background font-bold mb-2">No Products Found</h3>
            <p className="font-ui-body text-ui-body text-on-surface-variant text-center max-w-sm leading-relaxed">
              This category is currently being curated. Check back shortly for new additions.
            </p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-12 pt-8 border-t border-slate-border">
            <Link
              href={page > 1 ? `?page=${page - 1}` : '#'}
              className={`px-5 py-2.5 border border-slate-border font-mono-data text-mono-data text-xs uppercase tracking-wider transition-colors ${
                page === 1
                  ? 'opacity-40 pointer-events-none'
                  : 'hover:bg-primary hover:text-deep-navy hover:border-primary'
              }`}
            >
              Previous
            </Link>
            <span className="font-mono-data text-mono-data text-on-surface-variant text-xs uppercase tracking-wider">
              Page {page} of {totalPages}
            </span>
            <Link
              href={page < totalPages ? `?page=${page + 1}` : '#'}
              className={`px-5 py-2.5 border border-slate-border font-mono-data text-mono-data text-xs uppercase tracking-wider transition-colors ${
                page >= totalPages
                  ? 'opacity-40 pointer-events-none'
                  : 'hover:bg-primary hover:text-deep-navy hover:border-primary'
              }`}
            >
              Next
            </Link>
          </div>
        )}
      </section>

      {/* ── Articles Section ── */}
      {articles.length > 0 && (
        <section className="pb-section-gap max-w-max-content-width mx-auto px-margin-mobile md:px-margin-desktop w-full">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-border">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
              Editorial Guides
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {articles.map((article) => (
              <ArticleCard key={article._id} article={article} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export async function generateStaticParams() {
  try {
    const categories = await client.fetch<Array<{ slug: string }>>('*[_type == "category" && defined(slug.current) && (active == true || status == "active" || !defined(status))] { "slug": slug.current }')
    return (categories || [])
      .filter((c) => typeof c.slug === 'string' && c.slug.length > 0)
      .map((c) => ({ slug: c.slug }))
      .slice(0, 100)
  } catch {
    return []
  }
}

export const dynamicParams = true
export const revalidate = 3600

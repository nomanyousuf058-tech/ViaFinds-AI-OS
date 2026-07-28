import React, { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { PortableText } from '@portabletext/react'
import { client, urlFor } from '@/lib/sanity.client'
import {
  PRODUCT_BY_SLUG_QUERY,
  CATEGORY_BY_SLUG_QUERY,
  PRODUCTS_BY_CATEGORY_QUERY,
  REVIEWS_BY_PRODUCT_QUERY,
  SITEMAP_PRODUCTS_QUERY,
  SITEMAP_CATEGORIES_QUERY,
} from '@/lib/sanity.queries'
import Breadcrumbs, { BreadcrumbItem } from '@/components/Breadcrumbs'
import ProductCard from '@/components/ProductCard'
import CategoryFilters from '@/components/CategoryFilters'
import SubcategoriesRow from '@/components/SubcategoriesRow'
import type { Product, Category, Review } from '@/lib/types'

interface CatchAllPageProps {
  params: Promise<{ slug: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

// ── Dynamic Metadata Generation ──
export async function generateMetadata({ params }: CatchAllPageProps): Promise<Metadata> {
  const { slug } = await params
  if (!slug || slug.length === 0) return { title: 'Not Found' }
  const leafSlug = slug[slug.length - 1]
  if (!leafSlug) return { title: 'Not Found' }

  // 1. Try Product
  const product = await client.fetch<Product | null>(PRODUCT_BY_SLUG_QUERY, { slug: leafSlug })
  if (product) {
    const title = product.seo?.metaTitle || product.seoTitle || `${product.title} Review & Prices`
    const desc = product.seo?.metaDescription || product.seoDescription || product.shortDescription || `Vetted review, pricing, specifications, and buying options for ${product.title}.`
    const ogImage = product.seo?.ogImage ? urlFor(product.seo.ogImage) : product.gallery?.[0] ? urlFor(product.gallery[0]) : ''
    
    return {
      title,
      description: desc,
      openGraph: {
        title,
        description: desc,
        images: ogImage ? [{ url: ogImage }] : [],
        type: 'website',
      },
      robots: product.seo?.noIndex ? 'noindex, nofollow' : 'index, follow',
    }
  }

  // 2. Try Category
  const category = await client.fetch<Category | null>(CATEGORY_BY_SLUG_QUERY, { slug: leafSlug })
  if (category) {
    const title = category.seo?.metaTitle || category.seoTitle || `${category.name} Vetted Collection`
    const desc = category.seo?.metaDescription || category.seoDescription || category.description || `Discover expert reviews, buying guides, and trending products in ${category.name}.`
    const ogImage = category.seo?.ogImage ? urlFor(category.seo.ogImage) : category.thumbnail ? urlFor(category.thumbnail) : ''

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

  return { title: 'Not Found' }
}

export default async function CatchAllPage({ params, searchParams }: CatchAllPageProps) {
  const { slug: slugArray } = await params
  const resolvedSearchParams = await searchParams

  // Guard: never query Sanity with an undefined or empty slug array
  if (!slugArray || slugArray.length === 0) return notFound()

  const leafSlug = slugArray[slugArray.length - 1]
  if (!leafSlug) return notFound()

  // ───────────────────────────────────────────────────────────────────────────
  // 1. IS IT A PRODUCT?
  // ───────────────────────────────────────────────────────────────────────────
  const product = await client.fetch<Product | null>(PRODUCT_BY_SLUG_QUERY, { slug: leafSlug })

  if (product) {
    const reviews = await client.fetch<Review[]>(REVIEWS_BY_PRODUCT_QUERY, { productId: product._id })

    // Build category breadcrumb hierarchy
    const breadcrumbItems: BreadcrumbItem[] = []
    let currentCat = product.category

    while (currentCat) {
      breadcrumbItems.unshift({
        name: currentCat.name,
        slug: currentCat.slug,
      })
      currentCat = currentCat.parentCategory
    }

    breadcrumbItems.push({
      name: product.title,
      slug: slugArray.join('/'),
    })

    const primaryImage = product.gallery?.[0] ? urlFor(product.gallery[0]) : ''
    const galleryImages = product.gallery?.slice(1) || []

    // ── Generate Product Schema JSON-LD ──
    const productSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      image: product.gallery?.map(img => urlFor(img)).filter(Boolean),
      description: product.shortDescription || product.title,
      sku: product._id,
    }

    if (product.brand) {
      productSchema.brand = {
        '@type': 'Brand',
        name: product.brand.name,
      }
    }

    if (product.rating) {
      productSchema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: Math.max(reviews.length, 1),
        bestRating: 5,
        worstRating: 1,
      }
    }

    // Offers
    const offers = []
    if (product.affiliateUrl) {
      offers.push({
        '@type': 'Offer',
        url: product.affiliateUrl,
        priceCurrency: product.currency || 'USD',
        price: product.salePrice || product.price || 0,
        availability: product.availability === 'in_stock' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      })
    }
    product.affiliateLinks?.forEach((link) => {
      offers.push({
        '@type': 'Offer',
        url: link.url,
        priceCurrency: product.currency || 'USD',
        price: link.price || product.price || 0,
        availability: 'https://schema.org/InStock',
      })
    })

    if (offers.length > 0) {
      productSchema.offers = offers.length === 1 ? offers[0] : offers
    }

    return (
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 w-full">
        {/* Schema Insertion */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
        />

        <Breadcrumbs items={breadcrumbItems} />

        {/* Product Details Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
          {/* Images */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="relative aspect-[4/3] bg-surface-container overflow-hidden w-full border border-outline-variant/10">
              {primaryImage ? (
                <Image src={primaryImage} alt={product.title} fill className="object-cover" priority />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-surface-container-high text-secondary/30">
                  <span className="material-symbols-outlined text-6xl">image</span>
                </div>
              )}
            </div>

            {galleryImages.length > 0 && (
              <div className="grid grid-cols-4 gap-4">
                {galleryImages.map((img, idx) => {
                  const url = urlFor(img)
                  return (
                    <div key={idx} className="relative aspect-[4/3] bg-surface-container overflow-hidden border border-outline-variant/10">
                      {url && <Image src={url} alt={`${product.title} gallery ${idx}`} fill className="object-cover" />}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="lg:col-span-5 flex flex-col justify-start">
            <div className="flex items-center gap-3 mb-4">
              {product.brand && (
                <Link
                  href={`/search?q=${encodeURIComponent(product.brand.name)}`}
                  className="text-xs font-bold text-gold-accent uppercase tracking-[0.25em] hover:underline"
                >
                  {product.brand.name}
                </Link>
              )}
            </div>

            <h1 className="font-display text-4xl md:text-5xl text-primary font-bold mb-6 leading-tight">
              {product.title}
            </h1>

            {product.rating && (
              <div className="flex items-center gap-2 mb-6">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className="material-symbols-outlined text-gold-accent text-lg"
                      style={{ fontVariationSettings: `'FILL' ${i < Math.round(product.rating || 0) ? 1 : 0}` }}
                    >
                      star
                    </span>
                  ))}
                </div>
                <span className="font-body text-xs font-bold text-primary">
                  {product.rating.toFixed(1)} / 5.0 Rating ({reviews.length} expert logs)
                </span>
              </div>
            )}

            {/* Spec Highlights */}
            {product.specifications && product.specifications.length > 0 && (
              <div className="flex flex-col gap-2.5 mb-8 p-4 bg-surface-container-low border border-outline-variant/10">
                {product.specifications.slice(0, 3).map((spec, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-secondary uppercase tracking-wider font-semibold">{spec.key}</span>
                    <span className="text-primary font-bold">{spec.value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-b border-surface-container py-6 mb-8 flex justify-between items-center">
              <div>
                <span className="font-body text-[10px] font-bold text-secondary uppercase tracking-widest block mb-1">
                  Verified Retail Pricing
                </span>
                {product.salePrice ? (
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-3xl font-bold text-primary">
                      ${product.salePrice.toLocaleString()}
                    </span>
                    {product.price && (
                      <span className="font-body text-sm text-secondary/50 line-through">
                        ${product.price.toLocaleString()}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="font-display text-3xl font-bold text-primary">
                    {product.price ? `$${product.price.toLocaleString()}` : 'Price on request'}
                  </span>
                )}
              </div>
              {product.availability && (
                <span className="px-3.5 py-1.5 bg-surface-container font-sans text-[10px] font-bold text-primary uppercase tracking-widest">
                  {product.availability.replace('_', ' ')}
                </span>
              )}
            </div>

            {/* Affiliate stores list */}
            <div className="flex flex-col gap-4">
              <span className="font-body text-[10px] font-bold text-secondary uppercase tracking-widest block">
                Vetted Purchasing Options
              </span>

              {/* Main Affiliate Url */}
              {product.affiliateUrl && (
                <a
                  href={product.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-primary text-on-primary font-body text-xs font-bold uppercase tracking-wider py-4 text-center hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  Buy on {product.affiliateNetwork || 'Partner'}
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                </a>
              )}

              {product.affiliateLinks && product.affiliateLinks.map((link) => (
                <a
                  key={link._id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-surface-container text-primary border border-outline-variant/30 font-body text-xs font-bold uppercase tracking-wider py-3.5 text-center hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2"
                >
                  Shop at {link.merchant} {link.price ? `($${link.price.toLocaleString()})` : ''}
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 border-t border-surface-container pt-16">
          <div className="lg:col-span-8 flex flex-col gap-12">
            {/* Description */}
            {product.description && (
              <div className="prose max-w-none">
                <h2 className="font-display text-2xl text-primary font-bold mb-6">Expert Review & Verdict</h2>
                <div className="font-body text-sm text-secondary leading-relaxed space-y-5">
                  <PortableText value={product.description} />
                </div>
              </div>
            )}

            {/* Specifications Table */}
            {product.specifications && product.specifications.length > 0 && (
              <div className="border-t border-surface-container pt-12">
                <h2 className="font-display text-2xl text-primary font-bold mb-6">Technical Specifications</h2>
                <div className="border border-outline-variant/20 overflow-hidden">
                  <table className="w-full text-left font-body text-xs">
                    <tbody>
                      {product.specifications.map((spec, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-surface-container-low' : 'bg-white'}>
                          <td className="px-6 py-4 font-bold text-primary border-r border-outline-variant/10 w-1/3">
                            {spec.key}
                          </td>
                          <td className="px-6 py-4 text-secondary">{spec.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-8 border-l border-surface-container pl-0 lg:pl-8">
            {reviews.length > 0 && (
              <div>
                <h3 className="font-display text-xl text-primary font-bold mb-6">Editorial Insights</h3>
                <div className="flex flex-col gap-4">
                  {reviews.map((rev) => (
                    <div key={rev._id} className="border border-outline-variant/20 p-6 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 bg-gold-accent/10 text-gold-accent font-sans text-[8px] font-bold uppercase tracking-wider">
                          {rev.reviewType || 'Expert Log'}
                        </span>
                        {rev.rating && (
                          <span className="font-body text-[10px] font-bold text-primary">
                            Rating: {rev.rating}/5
                          </span>
                        )}
                      </div>
                      <h4 className="font-display text-base font-bold text-primary mb-2">{rev.title}</h4>
                      {rev.verdict && (
                        <p className="font-body text-xs text-secondary/80 leading-relaxed mb-4 italic">
                          &ldquo;{rev.verdict}&rdquo;
                        </p>
                      )}
                      <Link
                        href={`/search?q=${encodeURIComponent(rev.title)}`}
                        className="text-[10px] font-bold text-gold-accent hover:underline uppercase tracking-wider flex items-center gap-1"
                      >
                        Read Full Log
                        <span className="material-symbols-outlined text-xs">arrow_forward</span>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {product.relatedProducts && product.relatedProducts.length > 0 && (
          <section className="border-t border-surface-container pt-16 mt-16">
            <h2 className="font-display text-2xl text-primary font-bold mb-10">Related Curated Finds</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {product.relatedProducts.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    )
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. IS IT A CATEGORY?
  // ───────────────────────────────────────────────────────────────────────────
  const category = await client.fetch<Category | null>(CATEGORY_BY_SLUG_QUERY, { slug: leafSlug })

  if (category) {
    // 1. Fetch raw list of products matching the category (to extract filters dynamically)
    // Querying with pagination offsets:
    const page = Number(resolvedSearchParams.page) || 1
    const limit = 24
    const from = (page - 1) * limit
    const to = from + limit

    const allProductsInCat = await client.fetch<Product[]>(PRODUCTS_BY_CATEGORY_QUERY, {
      categoryId: category._id,
      from: 0,
      to: 500, // get a larger sample to build filters accurately
    })

    // 2. Filter products based on URL Search Parameters
    let filteredProducts = allProductsInCat

    // Brand Filter
    const filterBrands = resolvedSearchParams.brand
      ? Array.isArray(resolvedSearchParams.brand)
        ? resolvedSearchParams.brand
        : [resolvedSearchParams.brand]
      : []
    if (filterBrands.length > 0) {
      filteredProducts = filteredProducts.filter(p => p.brand?.name && filterBrands.includes(p.brand.name))
    }

    // Scale Filter
    const filterScales = resolvedSearchParams.scale
      ? Array.isArray(resolvedSearchParams.scale)
        ? resolvedSearchParams.scale
        : [resolvedSearchParams.scale]
      : []
    if (filterScales.length > 0) {
      filteredProducts = filteredProducts.filter(p => p.specifications?.some(s => s.key.toLowerCase() === 'scale' && filterScales.includes(s.value)))
    }

    // Material Filter
    const filterMaterials = resolvedSearchParams.material
      ? Array.isArray(resolvedSearchParams.material)
        ? resolvedSearchParams.material
        : [resolvedSearchParams.material]
      : []
    if (filterMaterials.length > 0) {
      filteredProducts = filteredProducts.filter(p => p.specifications?.some(s => s.key.toLowerCase() === 'material' && filterMaterials.includes(s.value)))
    }

    // Availability Filter
    const filterAvail = resolvedSearchParams.availability
      ? Array.isArray(resolvedSearchParams.availability)
        ? resolvedSearchParams.availability
        : [resolvedSearchParams.availability]
      : []
    if (filterAvail.length > 0) {
      filteredProducts = filteredProducts.filter(p => p.availability && filterAvail.includes(p.availability))
    }

    // Rating Filter
    const filterRating = resolvedSearchParams.rating ? Number(resolvedSearchParams.rating) : 0
    if (filterRating > 0) {
      filteredProducts = filteredProducts.filter(p => p.rating && p.rating >= filterRating)
    }

    // Sorting
    const sort = resolvedSearchParams.sort || 'newest'
    if (sort === 'price-asc') {
      filteredProducts.sort((a, b) => (a.salePrice || a.price || 0) - (b.salePrice || b.price || 0))
    } else if (sort === 'price-desc') {
      filteredProducts.sort((a, b) => (b.salePrice || b.price || 0) - (a.salePrice || a.price || 0))
    } else if (sort === 'rating') {
      filteredProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    } else if (sort === 'title-asc') {
      filteredProducts.sort((a, b) => a.title.localeCompare(b.title))
    } else {
      // Default: newest first
      // Sort by publishedAt/createdAt if available
      filteredProducts.sort((a, b) => {
        const dateA = new Date(a.publishedAt || a._createdAt || 0).getTime()
        const dateB = new Date(b.publishedAt || b._createdAt || 0).getTime()
        return dateB - dateA
      })
    }

    // Pagination slice
    const totalCount = filteredProducts.length
    const paginatedProducts = filteredProducts.slice(from, to)

    // Breadcrumbs
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
      slug: slugArray.join('/'),
    })

    const bannerImage = category.bannerImage
      ? urlFor(category.bannerImage)
      : category.coverImage
      ? urlFor(category.coverImage)
      : category.banner
      ? urlFor(category.banner)
      : ''

    // Collection Schema
    const collectionSchema = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: category.name,
      description: category.description || `Browse vetted items in ${category.name}`,
      url: `https://viafinds.com/${slugArray.join('/')}`,
    }

    return (
      <div className="w-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
        />

        {/* Banner Hero */}
        <section className="relative min-h-[40vh] flex items-center py-16 bg-primary text-on-primary overflow-hidden border-b border-surface-container">
          {bannerImage && (
            <Image src={bannerImage} alt={category.name} fill className="object-cover opacity-20 pointer-events-none" priority />
          )}
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop relative z-10 w-full">
            <Breadcrumbs items={breadcrumbItems.slice(0, -1)} />
            <h1 className="font-display text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              {category.name}
            </h1>
            <p className="font-body text-xs md:text-sm text-white/80 max-w-xl leading-relaxed font-light">
              {category.description || 'Discover and filter curated products, collections, and brands handpicked in this category sphere.'}
            </p>
          </div>
        </section>

        {/* Content Body */}
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 w-full flex flex-col">
          {/* Subcategories chips */}
          {category.subcategories && category.subcategories.length > 0 && (
            <SubcategoriesRow
              subcategories={category.subcategories}
              parentPath={`/${slugArray.join('/')}`}
            />
          )}

          {/* Grid Layout with dynamic filters sidebar */}
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Dynamic filters based on category products */}
            <Suspense fallback={<div className="w-full lg:w-64 shrink-0 bg-surface-container-low border border-outline-variant/10 p-6 animate-pulse" />}>
              <CategoryFilters products={allProductsInCat} />
            </Suspense>

            {/* Product Grid Area */}
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-surface-container/50">
                <span className="font-body text-[10px] font-bold text-secondary uppercase tracking-widest">
                  Showing {paginatedProducts.length} of {totalCount} Curated Findings
                </span>
              </div>

              {paginatedProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {paginatedProducts.map((p) => (
                    <ProductCard key={p._id} product={p} categoryPath={`/${slugArray.join('/')}`} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 border border-dashed border-outline/30">
                  <span className="material-symbols-outlined text-4xl text-secondary/30 mb-4">search_off</span>
                  <p className="font-body text-xs text-secondary/60 uppercase tracking-widest">
                    No products found matching active filters.
                  </p>
                </div>
              )}

              {/* Simple Pagination */}
              {totalCount > limit && (
                <div className="flex justify-center items-center gap-4 mt-16 border-t border-surface-container pt-8">
                  <Link
                    href={page > 1 ? `?page=${page - 1}` : '#'}
                    className={`px-5 py-2.5 border border-outline-variant/30 font-body text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      page === 1 ? 'opacity-40 pointer-events-none' : 'hover:bg-primary hover:text-white'
                    }`}
                  >
                    Previous
                  </Link>
                  <span className="font-body text-[10px] font-bold text-secondary uppercase tracking-wider">
                    Page {page} of {Math.ceil(totalCount / limit)}
                  </span>
                  <Link
                    href={page < Math.ceil(totalCount / limit) ? `?page=${page + 1}` : '#'}
                    className={`px-5 py-2.5 border border-outline-variant/30 font-body text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      page >= Math.ceil(totalCount / limit) ? 'opacity-40 pointer-events-none' : 'hover:bg-primary hover:text-white'
                    }`}
                  >
                    Next
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 3. Fallback: 404
  return notFound()
}

// ── ISR Static Paths Pre-rendering ──
export async function generateStaticParams() {
  try {
    const [products, categories] = await Promise.all([
      client.fetch<Array<{ slug: string }>>(SITEMAP_PRODUCTS_QUERY),
      client.fetch<Array<{ slug: string }>>(SITEMAP_CATEGORIES_QUERY),
    ])

    const paths: Array<{ slug: string[] }> = []

    // Categories
    categories?.forEach((cat) => {
      if (cat.slug) {
        paths.push({ slug: [cat.slug] })
      }
    })

    // Products
    products?.forEach((prod) => {
      if (prod.slug) {
        paths.push({ slug: [prod.slug] })
      }
    })

    return paths.slice(0, 100) // Pre-render top 100 paths at build time, dynamic generation on-demand for others
  } catch {
    return []
  }
}

export const dynamicParams = true
export const revalidate = 3600 // Revalidate cache hourly

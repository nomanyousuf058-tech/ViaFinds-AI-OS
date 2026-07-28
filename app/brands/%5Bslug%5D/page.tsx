import React from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import type { Metadata } from 'next'
import { PortableText } from '@portabletext/react'
import { client, urlFor } from '@/lib/sanity.client'
import { BRAND_BY_SLUG_QUERY, SITEMAP_BRANDS_QUERY } from '@/lib/sanity.queries'
import Breadcrumbs from '@/components/Breadcrumbs'
import ProductCard from '@/components/ProductCard'
import type { Brand, Product } from '@/lib/types'

interface BrandPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { slug } = await params
  if (!slug) return { title: 'Brand Not Found' }

  const brand = await client.fetch<Brand | null>(BRAND_BY_SLUG_QUERY, { slug })
  if (!brand) return { title: 'Brand Not Found' }

  const title = brand.seo?.metaTitle || brand.seoTitle || `${brand.name} | ViaFinds Vetted Brand`
  const desc = brand.seo?.metaDescription || brand.seoDescription || `Discover vetted products and reviews for ${brand.name}.`
  const ogImage = brand.seo?.ogImage ? urlFor(brand.seo.ogImage) : brand.logo ? urlFor(brand.logo) : ''

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images: ogImage ? [{ url: ogImage }] : [],
    },
    robots: brand.seo?.noIndex ? 'noindex, nofollow' : 'index, follow',
  }
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { slug } = await params

  // Guard: never query Sanity with an undefined or empty slug
  if (!slug) return notFound()

  const brand = await client.fetch<Brand & { products?: Product[] }>(BRAND_BY_SLUG_QUERY, { slug })

  if (!brand) return notFound()

  const breadcrumbs = [
    { name: 'Brands', slug: 'search?type=brand' },
    { name: brand.name, slug: `brands/${brand.slug}` },
  ]

  const brandSchema = {
    '@context': 'https://schema.org',
    '@type': 'Brand',
    name: brand.name,
    logo: brand.logo ? urlFor(brand.logo) : undefined,
    url: brand.websiteUrl,
  }

  const products = brand.products || []

  return (
    <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 w-full">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(brandSchema) }}
      />

      <Breadcrumbs items={breadcrumbs} />

      {/* Brand Header */}
      <div className="bg-surface-container-low border border-outline-variant/10 p-8 md:p-12 mb-16 flex flex-col md:flex-row gap-8 items-start">
        {brand.logo && (
          <div className="relative h-28 w-28 bg-white border border-outline-variant/20 p-4 shrink-0 flex items-center justify-center">
            <Image
              src={urlFor(brand.logo)}
              alt={`${brand.name} logo`}
              width={100}
              height={100}
              className="object-contain max-h-full max-w-full"
            />
          </div>
        )}

        <div className="flex-1 flex flex-col justify-start">
          <div className="flex flex-wrap items-center gap-4 mb-3">
            <h1 className="font-display text-3xl md:text-4xl text-primary font-bold">
              {brand.name}
            </h1>
            {brand.country && (
              <span className="px-2.5 py-1 bg-surface-container font-sans text-[9px] font-bold text-secondary uppercase tracking-widest">
                Origin: {brand.country}
              </span>
            )}
          </div>

          {brand.websiteUrl && (
            <a
              href={brand.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-gold-accent hover:underline uppercase tracking-wider mb-6 flex items-center gap-1.5"
            >
              Visit Brand Website
              <span className="material-symbols-outlined text-xs">open_in_new</span>
            </a>
          )}

          {brand.description && (
            <div className="font-body text-xs leading-relaxed text-secondary space-y-4 max-w-2xl">
              <PortableText value={brand.description} />
            </div>
          )}
        </div>
      </div>

      {/* Vetted Products Grid */}
      <section>
        <h2 className="font-display text-2xl text-primary font-bold mb-8">
          Vetted Products from {brand.name}
        </h2>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {products.map((p: Product) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border border-dashed border-outline/30">
            <span className="material-symbols-outlined text-4xl text-secondary/30 mb-4">search_off</span>
            <p className="font-body text-xs text-secondary/60 uppercase tracking-widest">
              No vetted products found from this brand yet.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

export async function generateStaticParams() {
  try {
    const brands = await client.fetch<Array<{ slug: string }>>(SITEMAP_BRANDS_QUERY)
    return (brands || [])
      .filter((b) => typeof b.slug === 'string' && b.slug.length > 0)
      .map((b) => ({ slug: b.slug }))
      .slice(0, 100)
  } catch {
    return []
  }
}

export const dynamicParams = true
export const revalidate = 3600

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { client, urlFor } from '@/lib/sanity.client'
import { ALL_BRANDS_QUERY } from '@/lib/sanity.queries'
import type { Brand } from '@/lib/types'

export const metadata: Metadata = {
  title: 'All Brands | ViaFinds',
  description:
    'Browse every brand in the ViaFinds collection — premium, vetted, and curated for those who demand the best.',
  openGraph: {
    type: 'website',
    title: 'All Brands | ViaFinds',
    description: 'Browse every brand in the ViaFinds collection.',
  },
}

export default async function BrandsPage() {
  let brands: Brand[] = []
  let featuredBrands: Brand[] = []

  try {
    const all = await client.fetch<Brand[]>(ALL_BRANDS_QUERY)
    brands = all || []
    featuredBrands = brands.filter((b) => b.featured)
  } catch (err) {
    console.error('Failed to load brands:', err)
  }

  // Group brands alphabetically
  const brandsByLetter: Record<string, Brand[]> = {}
  brands.forEach((brand) => {
    const letter = brand.name[0]?.toUpperCase() || '#'
    if (!brandsByLetter[letter]) brandsByLetter[letter] = []
    brandsByLetter[letter].push(brand)
  })
  const letters = Object.keys(brandsByLetter).sort()

  return (
    <div className="w-full flex flex-col">
      {/* ── Hero ── */}
      <section className="bg-primary text-on-primary py-20 border-b border-white/5">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <span className="text-gold-accent text-[10px] font-bold tracking-[0.4em] uppercase mb-4 block">
            Brand Directory
          </span>
          <h1 className="font-display text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Every Brand, Vetted.
          </h1>
          <p className="font-body text-sm text-white/60 max-w-lg leading-relaxed">
            From legacy houses to emerging independents — every brand in our directory has been
            curated for quality, authenticity, and craftsmanship.
          </p>
          <p className="font-body text-[10px] text-white/30 uppercase tracking-widest mt-6">
            {brands.length} brands in the directory
          </p>
        </div>
      </section>

      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-16 w-full">
        {/* ── Featured Brands ── */}
        {featuredBrands.length > 0 && (
          <section className="mb-20">
            <div className="flex items-end justify-between mb-10">
              <div>
                <span className="text-gold-accent text-[10px] font-bold tracking-[0.4em] uppercase mb-2 block">
                  Curated Selection
                </span>
                <h2 className="font-display text-3xl font-bold text-primary">Featured Brands</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {featuredBrands.map((brand) => {
                const logoUrl = brand.logo ? urlFor(brand.logo) : ''
                return (
                  <Link
                    key={brand._id}
                    href={`/brands/${brand.slug}`}
                    className="group flex flex-col items-center gap-4 p-6 border border-outline-variant/10 bg-white hover:border-primary hover:luxury-shadow transition-all duration-300"
                  >
                    <div className="relative h-16 w-full flex items-center justify-center">
                      {logoUrl ? (
                        <Image
                          src={logoUrl}
                          alt={brand.name}
                          fill
                          className="object-contain group-hover:scale-105 transition-transform duration-500"
                          sizes="120px"
                        />
                      ) : (
                        <span className="font-display text-lg font-bold text-primary group-hover:text-gold-accent transition-colors text-center">
                          {brand.name}
                        </span>
                      )}
                    </div>
                    <span className="font-body text-[10px] font-bold text-secondary uppercase tracking-wider group-hover:text-primary transition-colors text-center">
                      {brand.name}
                    </span>
                    {brand.country && (
                      <span className="font-body text-[9px] text-secondary/40 uppercase tracking-widest">
                        {brand.country}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── A–Z Brand Directory ── */}
        {letters.length > 0 ? (
          <section>
            <div className="mb-10">
              <span className="text-gold-accent text-[10px] font-bold tracking-[0.4em] uppercase mb-2 block">
                Full Catalogue
              </span>
              <h2 className="font-display text-3xl font-bold text-primary">Brand A–Z</h2>
            </div>

            {/* Letter jump nav */}
            <div className="flex flex-wrap gap-2 mb-12 pb-8 border-b border-surface-container">
              {letters.map((letter) => (
                <a
                  key={letter}
                  href={`#letter-${letter}`}
                  className="w-8 h-8 flex items-center justify-center border border-outline-variant/30 font-body text-[10px] font-bold text-secondary uppercase hover:bg-primary hover:text-white hover:border-primary transition-all"
                >
                  {letter}
                </a>
              ))}
            </div>

            {/* Brands grouped by letter */}
            <div className="flex flex-col gap-16">
              {letters.map((letter) => (
                <div key={letter} id={`letter-${letter}`}>
                  <h3 className="font-display text-4xl font-bold text-primary/10 mb-6 border-b border-surface-container pb-3">
                    {letter}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {brandsByLetter[letter].map((brand) => {
                      const logoUrl = brand.logo ? urlFor(brand.logo) : ''
                      return (
                        <Link
                          key={brand._id}
                          href={`/brands/${brand.slug}`}
                          className="group flex items-center gap-5 p-5 border border-outline-variant/10 bg-white hover:border-primary hover-luxury-shadow transition-all duration-300"
                        >
                          {/* Logo or initials */}
                          <div className="relative h-12 w-16 shrink-0 bg-surface-container flex items-center justify-center overflow-hidden">
                            {logoUrl ? (
                              <Image
                                src={logoUrl}
                                alt={brand.name}
                                fill
                                className="object-contain p-1"
                                sizes="64px"
                              />
                            ) : (
                              <span className="font-display text-base font-bold text-secondary/40">
                                {brand.name.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-col gap-1 flex-1 min-w-0">
                            <span className="font-display text-base font-bold text-primary group-hover:text-gold-accent transition-colors truncate">
                              {brand.name}
                            </span>
                            {brand.country && (
                              <span className="font-body text-[10px] text-secondary/50 uppercase tracking-wider">
                                {brand.country}
                              </span>
                            )}
                          </div>

                          <span className="material-symbols-outlined text-secondary/30 group-hover:text-gold-accent group-hover:translate-x-1 transition-all text-lg">
                            arrow_forward
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="text-center py-24 border border-dashed border-outline/20">
            <span className="material-symbols-outlined text-4xl text-secondary/30 block mb-4">
              storefront
            </span>
            <p className="font-body text-xs text-secondary/60 uppercase tracking-widest">
              No brands have been added yet. Add brands in Sanity Studio.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export const revalidate = 3600

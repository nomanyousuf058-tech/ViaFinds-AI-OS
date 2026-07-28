'use client'

import React, { useState, useEffect, useMemo } from 'react'
import ProductCard from '@/components/ProductCard'
import ArticleCard from '@/components/ArticleCard'
import Image from 'next/image'
import Link from 'next/link'
import { urlFor } from '@/lib/sanity.client'
import type { Product, Brand, Article, Category } from '@/lib/types'

interface SearchClientProps {
  initialProducts: Product[]
  initialBrands: Brand[]
  initialArticles: Article[]
  initialCategories: Category[]
  query: string
  favoritesMode: boolean
  featuredMode: boolean
  brandMode: boolean
}

export default function SearchClient({
  initialProducts,
  initialBrands,
  initialArticles,
  initialCategories,
  query,
  favoritesMode,
  featuredMode,
  brandMode,
}: SearchClientProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'brands' | 'articles' | 'categories'>('products')
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [brands] = useState<Brand[]>(initialBrands)
  const [articles] = useState<Article[]>(initialArticles)
  const [categories] = useState<Category[]>(initialCategories)
  const [loading, setLoading] = useState(false)
  const [filterPrice, setFilterPrice] = useState<number | null>(null)

  // Load favorites from local storage if in favorites mode
  useEffect(() => {
    if (favoritesMode) {
      setLoading(true)
      const favs = localStorage.getItem('viafinds_favorites')
      let favSlugs: string[] = []
      if (favs) {
        try {
          favSlugs = JSON.parse(favs)
        } catch {
          // ignore parse error
        }
      }

      if (favSlugs.length === 0) {
        setProducts([])
        setLoading(false)
        return
      }

      import('@/lib/sanity.client').then(({ client }) => {
        client
          .fetch<Product[]>(
            `*[_type == "product" && slug.current in $slugs && status == "published"] {
              _id, title, "slug": slug.current, price, salePrice, discount, currency, rating, availability,
              brand->{name, "slug": slug.current},
              category->{name, "slug": slug.current},
              "image": images[0]
            }`,
            { slugs: favSlugs }
          )
          .then((data) => {
            setProducts(data || [])
            setLoading(false)
          })
          .catch((err) => {
            console.error('Failed to load favorites details:', err)
            setLoading(false)
          })
      })
    }
  }, [favoritesMode])

  // Filter products by price dynamically
  const filteredProducts = useMemo(() => {
    if (!filterPrice) return products
    return products.filter((p) => {
      const price = p.salePrice || p.price || 0
      return price > 0 && price <= filterPrice
    })
  }, [products, filterPrice])

  return (
    <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-20 w-full">
      {/* Search Header */}
      <div className="mb-12 border-b border-surface-container pb-8 animate-fade-up">
        <span className="text-gold-accent text-[10px] font-bold tracking-[0.4em] uppercase mb-4 block">
          {favoritesMode ? 'Personal Vault' : featuredMode ? 'Curated Deals' : brandMode ? 'Brands' : 'Discovery Directory'}
        </span>
        <h1 className="font-display text-4xl md:text-5xl text-primary font-bold">
          {favoritesMode
            ? 'Your Saved Finds'
            : featuredMode
            ? 'Featured & Trending Deals'
            : brandMode
            ? 'Brands Directory'
            : query
            ? `Search Results for "${query}"`
            : 'All Curated Discoveries'}
        </h1>
        {favoritesMode && (
          <p className="font-body text-xs text-secondary mt-2">
            A selection of luxury essentials, software, and collectibles you have bookmarked.
          </p>
        )}
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 border-b border-surface-container pb-4">
        <div className="flex flex-wrap gap-6 w-full md:w-auto">
          {!favoritesMode && !brandMode && (
            <>
              <button
                onClick={() => setActiveTab('products')}
                className={`pb-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === 'products'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-secondary hover:text-primary'
                }`}
              >
                Products ({filteredProducts.length})
              </button>
              <button
                onClick={() => setActiveTab('brands')}
                className={`pb-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === 'brands'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-secondary hover:text-primary'
                }`}
              >
                Brands ({brands.length})
              </button>
              <button
                onClick={() => setActiveTab('articles')}
                className={`pb-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === 'articles'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-secondary hover:text-primary'
                }`}
              >
                Articles ({articles.length})
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                className={`pb-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === 'categories'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-secondary hover:text-primary'
                }`}
              >
                Categories ({categories.length})
              </button>
            </>
          )}
        </div>

        {/* Quick price filter */}
        {activeTab === 'products' && products.length > 0 && (
          <div className="flex gap-2.5 items-center flex-wrap shrink-0">
            <span className="text-[10px] font-bold text-secondary uppercase tracking-widest mr-2">Filter Price:</span>
            <button
              onClick={() => setFilterPrice(null)}
              className={`px-3.5 py-1.5 text-[9px] font-bold border transition-all ${
                !filterPrice ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant hover:border-primary text-secondary'
              }`}
            >
              ALL PRICE
            </button>
            <button
              onClick={() => setFilterPrice(100)}
              className={`px-3.5 py-1.5 text-[9px] font-bold border transition-all ${
                filterPrice === 100 ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant hover:border-primary text-secondary'
              }`}
            >
              UNDER $100
            </button>
            <button
              onClick={() => setFilterPrice(500)}
              className={`px-3.5 py-1.5 text-[9px] font-bold border transition-all ${
                filterPrice === 500 ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant hover:border-primary text-secondary'
              }`}
            >
              UNDER $500
            </button>
            <button
              onClick={() => setFilterPrice(1000)}
              className={`px-3.5 py-1.5 text-[9px] font-bold border transition-all ${
                filterPrice === 1000 ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant hover:border-primary text-secondary'
              }`}
            >
              UNDER $1,000
            </button>
          </div>
        )}
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <span className="material-symbols-outlined text-4xl text-primary animate-spin">sync</span>
        </div>
      ) : (
        <div className="w-full">
          {/* Products Tab */}
          {(activeTab === 'products' || favoritesMode || featuredMode) && (
            filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {filteredProducts.map((p) => (
                  <ProductCard key={p._id} product={p} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 border border-dashed border-outline/20">
                <span className="material-symbols-outlined text-4xl text-secondary/30 mb-4">search_off</span>
                <p className="font-body text-xs text-secondary/60 uppercase tracking-widest">
                  No matching products found. Try adjusting your filters.
                </p>
              </div>
            )
          )}

          {/* Brands Tab */}
          {activeTab === 'brands' && brandMode && (
            brands.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {brands.map((brand) => {
                  const logoUrl = brand.logo ? urlFor(brand.logo) : ''
                  return (
                    <div key={brand._id} className="border border-outline-variant/20 p-8 flex flex-col items-center text-center bg-white hover-luxury-shadow">
                      <div className="relative h-16 w-16 mb-6 bg-surface-container flex items-center justify-center overflow-hidden border border-outline-variant/10">
                        {logoUrl ? (
                          <Image src={logoUrl} alt={brand.name} fill className="object-contain p-2" />
                        ) : (
                          <span className="material-symbols-outlined text-3xl text-secondary/30">domain</span>
                        )}
                      </div>
                      <h3 className="font-display text-xl font-bold text-primary mb-2">{brand.name}</h3>
                      {brand.country && (
                        <span className="text-[9px] text-secondary/50 font-bold uppercase tracking-wider mb-4">
                          Origin: {brand.country}
                        </span>
                      )}
                      {brand.websiteUrl && (
                        <a
                          href={brand.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-body text-[10px] font-bold text-gold-accent hover:underline uppercase tracking-wider flex items-center gap-1 mt-4"
                        >
                          Visit Website
                          <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-20 border border-dashed border-outline/20">
                <span className="material-symbols-outlined text-4xl text-secondary/30 mb-4">search_off</span>
                <p className="font-body text-xs text-secondary/60 uppercase tracking-widest">
                  No matching brands found.
                </p>
              </div>
            )
          )}

          {/* Articles Tab */}
          {activeTab === 'articles' && !favoritesMode && !brandMode && (
            articles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {articles.map((article) => (
                  <ArticleCard key={article._id} article={article} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 border border-dashed border-outline/20">
                <span className="material-symbols-outlined text-4xl text-secondary/30 mb-4">search_off</span>
                <p className="font-body text-xs text-secondary/60 uppercase tracking-widest">
                  No matching articles found.
                </p>
              </div>
            )
          )}

          {/* Categories Tab */}
          {activeTab === 'categories' && !favoritesMode && !brandMode && (
            categories.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((cat) => {
                  const thumb = cat.thumbnail ? urlFor(cat.thumbnail) : ''
                  return (
                    <Link
                      key={cat._id}
                      href={`/${cat.slug}`}
                      className="border border-outline-variant/20 p-5 flex items-center gap-4 bg-white hover:border-primary/30 hover-luxury-shadow"
                    >
                      <div className="relative h-12 w-12 bg-surface-container shrink-0 flex items-center justify-center border border-outline-variant/10 overflow-hidden">
                        {thumb ? (
                          <Image src={thumb} alt={cat.name} fill className="object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-secondary/40 text-xl">
                            {cat.icon || 'folder'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-display text-sm font-bold text-primary truncate">
                          {cat.name}
                        </span>
                        <span className="font-body text-[9px] font-semibold text-secondary/50 uppercase tracking-wider mt-0.5">
                          View Directory
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-20 border border-dashed border-outline/20">
                <span className="material-symbols-outlined text-4xl text-secondary/30 mb-4">search_off</span>
                <p className="font-body text-xs text-secondary/60 uppercase tracking-widest">
                  No matching categories found.
                </p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}

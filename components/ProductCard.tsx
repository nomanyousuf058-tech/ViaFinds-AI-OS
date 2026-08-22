'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { urlFor } from '@/lib/sanity.client'
import type { Product } from '@/lib/types'

interface ProductCardProps {
  product: Product
  categoryPath?: string
}

export default function ProductCard({ product, categoryPath }: ProductCardProps) {
  const [isFavorite, setIsFavorite] = useState(false)
  const imageUrl = product.image
    ? urlFor(product.image)
    : product.gallery?.[0]
    ? urlFor(product.gallery[0])
    : ''

  let productHref = `/${product.slug}`
  if (categoryPath) {
    productHref = `${categoryPath}/${product.slug}`
  } else if (product.category?.slug) {
    productHref = `/${product.category.slug}/${product.slug}`
  }

  useEffect(() => {
    const favs = localStorage.getItem('viafinds_favorites')
    if (favs) {
      try {
        const parsed = JSON.parse(favs) as string[]
        setIsFavorite(parsed.includes(product.slug))
      } catch {
        setIsFavorite(false)
      }
    }
  }, [product.slug])

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const favs = localStorage.getItem('viafinds_favorites')
    let parsed: string[] = []
    if (favs) {
      try {
        parsed = JSON.parse(favs)
      } catch {
        // ignore
      }
    }

    if (isFavorite) {
      parsed = parsed.filter(slug => slug !== product.slug)
    } else {
      parsed.push(product.slug)
    }

    localStorage.setItem('viafinds_favorites', JSON.stringify(parsed))
    setIsFavorite(!isFavorite)
    window.dispatchEvent(new Event('favorites-updated'))
  }

  return (
    <div className="group relative bg-white flex flex-col hover-luxury-shadow border border-outline-variant/10 transition-all duration-300 overflow-hidden cursor-pointer select-none">
      <Link href={productHref} className="relative aspect-[4/3] block bg-surface-container overflow-hidden w-full">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            priority={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface-container-high text-secondary/30">
            <span className="material-symbols-outlined text-4xl">image</span>
          </div>
        )}

        <button
          onClick={toggleFavorite}
          className="absolute top-4 right-4 bg-white/95 hover:bg-white text-secondary hover:text-primary transition-colors p-2 shadow-sm z-10 opacity-0 group-hover:opacity-100"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <span
            className="material-symbols-outlined text-lg"
            style={{ fontVariationSettings: isFavorite ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400" }}
          >
            favorite
          </span>
        </button>
      </Link>

      <div className="p-6 flex flex-col flex-1 bg-white">
        {product.brand && (
          <Link
            href={`/search?q=${encodeURIComponent(product.brand.name)}`}
            className="text-[10px] font-bold text-secondary hover:text-gold-accent uppercase tracking-[0.2em] transition-colors mb-3"
            onClick={(e) => e.stopPropagation()}
          >
            {product.brand.name}
          </Link>
        )}

        <Link href={productHref} className="block group-hover:text-gold-accent transition-colors flex-1 mb-4">
          <h3 className="font-display text-lg font-bold text-primary leading-snug line-clamp-2">
            {product.title}
          </h3>
        </Link>

        {product.shortDescription && (
          <p className="font-body text-sm text-secondary/70 leading-relaxed mb-6 line-clamp-2">
            {product.shortDescription}
          </p>
        )}

        <div className="flex justify-between items-center pt-4 border-t border-outline-variant/10 mt-auto">
          <div className="flex flex-col">
            {product.salePrice ? (
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-bold text-primary">
                  ${product.salePrice.toLocaleString()}
                </span>
                {product.price && (
                  <span className="font-body text-xs text-secondary/50 line-through">
                    ${product.price.toLocaleString()}
                  </span>
                )}
              </div>
            ) : product.price ? (
              <span className="font-display text-lg font-bold text-primary">
                ${product.price.toLocaleString()}
              </span>
            ) : (
              <span className="font-body text-xs font-semibold text-gold-accent uppercase tracking-wider">
                Price on Retailer
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

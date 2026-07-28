'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { urlFor } from '@/lib/sanity.client'
import type { Article } from '@/lib/types'

interface ArticleCardProps {
  article: Article
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const imageUrl = article.coverImage ? urlFor(article.coverImage) : ''
  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''

  const articleHref = `/articles/${article.slug}`

  return (
    <div className="group flex flex-col gap-6 hover-luxury-shadow p-4 bg-white border border-outline-variant/10 transition-all duration-300">
      <Link href={articleHref} className="relative aspect-[16/9] bg-surface-container overflow-hidden block w-full">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={article.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-103"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface-container-high text-secondary/30">
            <span className="material-symbols-outlined text-4xl">feed</span>
          </div>
        )}

        {article.featured && (
          <span className="absolute top-4 left-4 bg-primary text-white text-[9px] font-bold uppercase tracking-wider px-2 py-1 shadow-sm font-sans z-10">
            Featured
          </span>
        )}
      </Link>

      <div className="flex flex-col gap-3 flex-1">
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-secondary/60">
          {article.category && (
            <Link href={`/${article.category.slug}`} className="text-gold-accent hover:underline">
              {article.category.name}
            </Link>
          )}
          {article.category && publishedDate && <span>•</span>}
          {publishedDate && <span>{publishedDate}</span>}
          {article.readingTime && (
            <>
              <span>•</span>
              <span>{article.readingTime} Min Read</span>
            </>
          )}
        </div>

        <Link href={articleHref} className="hover:text-gold-accent transition-colors block">
          <h3 className="font-display text-xl font-bold text-primary leading-snug line-clamp-2">
            {article.title}
          </h3>
        </Link>

        {article.excerpt && (
          <p className="font-body text-xs text-secondary leading-relaxed line-clamp-3">
            {article.excerpt}
          </p>
        )}

        {article.author && (
          <div className="flex items-center gap-3 mt-auto pt-4 border-t border-surface-container">
            {article.author.avatar ? (
              <div className="relative h-6 w-6 rounded-full overflow-hidden">
                <Image
                  src={urlFor(article.author.avatar)}
                  alt={article.author.name}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <span className="material-symbols-outlined text-secondary text-lg">account_circle</span>
            )}
            <div className="flex flex-col">
              <span className="font-body text-[10px] font-bold text-primary uppercase tracking-wider">
                By {article.author.name}
              </span>
              {article.author.role && (
                <span className="font-body text-[8px] text-secondary uppercase tracking-widest">
                  {article.author.role}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

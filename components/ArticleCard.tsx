'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { ArticleRow } from '@/lib/db/types'

interface ArticleCardProps {
  article: ArticleRow
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const imageUrl = article.cover_image_url || ''
  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : ''

  const articleHref = `/articles/${article.slug}`

  return (
    <article className="group bg-obsidian-deep border border-slate-border rounded flex flex-col hover:border-outline-variant transition-colors">
      <div className="aspect-video relative overflow-hidden border-b border-slate-border">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={article.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface-container-high text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl">feed</span>
          </div>
        )}
        {article.featured && (
          <div className="absolute top-4 left-4 bg-background/90 backdrop-blur border border-slate-border px-2 py-1 rounded font-mono-data text-[11px] text-tertiary flex items-center gap-1">
            <span className="material-symbols-outlined icon-fill text-[12px]">star</span> Featured
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-headline-lg-mobile text-[22px] leading-tight text-on-background group-hover:text-primary transition-colors">
            {article.title}
          </h3>
        </div>

        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-4">
          {publishedDate && <span>{publishedDate}</span>}
        </div>

        {article.excerpt && (
          <p className="font-ui-body text-ui-body text-on-surface-variant mb-6 line-clamp-3">
            {article.excerpt}
          </p>
        )}

        <div className="mt-auto pt-4 border-t border-slate-border flex justify-between items-center font-mono-data text-[12px] text-on-surface-variant">
          {publishedDate && <span>Published: {publishedDate}</span>}
          <Link href={articleHref} className="text-primary group-hover:underline">
            Read Analysis
          </Link>
        </div>
      </div>
    </article>
  )
}

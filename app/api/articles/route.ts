import { NextResponse } from 'next/server'
import { adminOnly } from '@/lib/auth'
import { articleRepository } from '@/lib/db/repositories'
import type { ArticleRow } from '@/lib/db/types'

export async function GET(request: Request) {
  try {
    await adminOnly()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const q = searchParams.get('q') || ''

    let articles = await articleRepository.findAll(100, 0, status || undefined)
    if (q) {
      const lower = q.toLowerCase()
      articles = articles.filter(
        (a: ArticleRow) =>
          a.title.toLowerCase().includes(lower) ||
          (a.excerpt || '').toLowerCase().includes(lower) ||
          a.slug.toLowerCase().includes(lower)
      )
    }

    return NextResponse.json({ articles })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await adminOnly()
    const body = await request.json()

    const article = await articleRepository.create({
      title: body.title,
      slug: body.slug,
      excerpt: body.excerpt || null,
      content: body.content || [],
      status: body.status || 'draft',
      cover_image_url: body.cover_image_url || null,
      author_id: null,
      category_id: null,
      seo: body.seo || {},
      geo: body.geo || {},
      aeo: body.aeo || {},
      published_at: body.status === 'published' ? new Date().toISOString() : null,
      featured: body.featured || false,
      trending: body.trending || false,
      reading_time: body.reading_time || null,
    })

    if (!article) {
      return NextResponse.json({ error: 'Failed to create article' }, { status: 500 })
    }

    return NextResponse.json({ id: article.id, slug: article.slug })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

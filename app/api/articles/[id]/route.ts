import { NextResponse } from 'next/server'
import { adminOnly } from '@/lib/auth'
import { articleRepository } from '@/lib/db/repositories'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await adminOnly()
    const { id } = await params
    const article = await articleRepository.findById(id)
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }
    return NextResponse.json({ article })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await adminOnly()
    const { id } = await params
    const body = await request.json()

    const updates: Record<string, unknown> = {}
    if (body.title !== undefined) updates.title = body.title
    if (body.slug !== undefined) updates.slug = body.slug
    if (body.excerpt !== undefined) updates.excerpt = body.excerpt
    if (body.content !== undefined) updates.content = body.content
    if (body.status !== undefined) updates.status = body.status
    if (body.cover_image_url !== undefined) updates.cover_image_url = body.cover_image_url
    if (body.reading_time !== undefined) updates.reading_time = body.reading_time
    if (body.seo !== undefined) updates.seo = body.seo
    if (body.geo !== undefined) updates.geo = body.geo
    if (body.aeo !== undefined) updates.aeo = body.aeo
    if (body.featured !== undefined) updates.featured = body.featured
    if (body.trending !== undefined) updates.trending = body.trending
    if (body.published_at !== undefined) updates.published_at = body.published_at

    const article = await articleRepository.update(id, updates)
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    return NextResponse.json({ article })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await adminOnly()
    const { id } = await params
    const deleted = await articleRepository.delete(id)
    if (!deleted) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

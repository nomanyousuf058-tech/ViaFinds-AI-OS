import { NextResponse } from 'next/server'
import { adminOnly } from '@/lib/auth'
import { articleRepository } from '@/lib/db/repositories'
import { affiliateLinkResolver } from '@/lib/services/affiliate-link-resolver'

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

    const existingArticle = await articleRepository.findById(id)
    if (!existingArticle) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}
    if (body.title !== undefined) updates.title = body.title
    if (body.slug !== undefined) updates.slug = body.slug
    if (body.article_type !== undefined) updates.article_type = body.article_type
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

    if (Array.isArray(updates.content) && updates.content.length > 0) {
      const productId = body.product_id || existingArticle.product_id
      const { processed, content: processedContent } = await affiliateLinkResolver.processArticleContent(
        updates.content,
        id,
        productId || undefined
      )
      updates.content = processedContent

      if (processed) {
        const goUrl = (processedContent as Array<Record<string, unknown>>).find(
          (b) => b.type === 'cta' && typeof b.url === 'string' && b.url.startsWith('/go/')
        )?.url as string | undefined

        if (goUrl) {
          updates.affiliate_url = goUrl.replace('/go/', '')
        }
      }
    }

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
    
    // Soft delete to prevent breaking any potential foreign key relationships
    const article = await articleRepository.update(id, { status: 'archived' })
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, archived: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

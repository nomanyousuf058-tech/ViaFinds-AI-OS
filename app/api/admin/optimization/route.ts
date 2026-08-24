import { NextResponse } from 'next/server'
import { contentRepository } from '@/lib/content'
import { optimizationEngine } from '@/lib/optimization/engine'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { contentId, contentType = 'article' } = body as {
      contentId: string
      contentType?: 'article' | 'review' | 'guide' | 'comparison'
    }

    if (!contentId) {
      return NextResponse.json({ error: 'contentId is required' }, { status: 400 })
    }

    let content = await contentRepository.getArticle(contentId)
    let actualType: 'article' | 'review' = 'article'

    if (!content) {
      content = await contentRepository.getReview(contentId)
      actualType = 'review'
    }

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    const analysis = await optimizationEngine.runAll(content)

    return NextResponse.json({
      contentId,
      contentType: actualType,
      slug: content.slug,
      title: content.title,
      ...analysis,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

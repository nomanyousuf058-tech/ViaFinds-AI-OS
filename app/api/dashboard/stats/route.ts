import { NextResponse } from 'next/server'
import { adminOnly } from '@/lib/auth'
import { articleRepository } from '@/lib/db/repositories'

export async function GET() {
  try {
    await adminOnly()
    const [totalArticles, publishedArticles] = await Promise.all([
      articleRepository.countAll(),
      articleRepository.countPublished(),
    ])

    const stats = {
      totalArticles,
      publishedArticles,
      dailyTarget: 10,
      lastRun: null,
      lastPublish: null,
    }
    return NextResponse.json(stats, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}

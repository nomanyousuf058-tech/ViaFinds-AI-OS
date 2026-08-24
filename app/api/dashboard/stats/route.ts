import { NextResponse } from 'next/server'
import { adminOnly } from '@/lib/auth'
import { articleRepository } from '@/lib/db/repositories'

export async function GET() {
  try {
    await adminOnly()
    const [todayArticles, totalArticles] = await Promise.all([
      articleRepository.countPublished(),
      articleRepository.countPublished(),
    ])

    const stats = {
      todayArticles,
      dailyTarget: 10,
      lastRun: null,
      lastPublish: null,
      totalArticles,
    }
    return NextResponse.json(stats, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}

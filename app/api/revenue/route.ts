import { NextRequest, NextResponse } from 'next/server'
import { adminOnly } from '@/lib/auth'
import { revenueIntelligenceService } from '@/lib/services/revenue-intelligence'

export async function GET(request: NextRequest) {
  try {
    await adminOnly();
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'last_30_days'
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const report = await revenueIntelligenceService.generateRevenueReport(period, limit)

    return NextResponse.json({
      success: true,
      report,
    })
  } catch (error) {
    console.error('Revenue API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate revenue report' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await adminOnly();
    const body = await request.json()
    const articleId = body?.articleId

    if (articleId) {
      const performance = await revenueIntelligenceService.getArticlePerformance(articleId)
      return NextResponse.json({
        success: true,
        performance,
      })
    }

    const report = await revenueIntelligenceService.generateRevenueReport()
    return NextResponse.json({
      success: true,
      report,
    })
  } catch (error) {
    console.error('Revenue API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process revenue request' },
      { status: 500 }
    )
  }
}

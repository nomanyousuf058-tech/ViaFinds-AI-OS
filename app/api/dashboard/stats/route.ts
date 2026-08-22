import { NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import { createClient } from '@sanity/client';

export async function GET() {
  try {
    await adminOnly();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sanity = createClient({
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'e44z7hta',
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
      apiVersion: '2024-01-01',
      token: process.env.SANITY_TOKEN || process.env.SANITY_API_TOKEN,
      useCdn: false,
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      todayArticles,
      totalArticles,
      todayProducts,
      totalProducts,
      last7Days,
    ] = await Promise.all([
      sanity.fetch<number>(
        `count(*[_type == "article" && publishedAt >= $start && publishedAt <= $end])`,
        { start: todayStart.toISOString(), end: todayEnd.toISOString() }
      ),
      sanity.fetch<number>(
        `count(*[_type == "article" && status == "published"])`
      ),
      sanity.fetch<number>(
        `count(*[_type == "product" && publishedAt >= $start && publishedAt <= $end])`,
        { start: todayStart.toISOString(), end: todayEnd.toISOString() }
      ),
      sanity.fetch<number>(
        `count(*[_type == "product" && status == "published"])`
      ),
      sanity.fetch<Array<{ day: string; count: number }>>(
        `*[_type == "article" && publishedAt >= $start] | order(publishedAt desc) {
          _id,
          publishedAt
        }`,
        { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() }
      ),
    ]);

    const dailyTarget = 10;
    const weeklyData: { day: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);
      const count = await sanity.fetch<number>(
        `count(*[_type == "article" && publishedAt >= $start && publishedAt <= $end])`,
        { start: dayStart.toISOString(), end: dayEnd.toISOString() }
      ).catch(() => 0);
      weeklyData.push({
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        count: count || 0,
      });
    }

    return NextResponse.json({
      todayArticles: todayArticles || 0,
      dailyTarget,
      totalArticles: totalArticles || 0,
      todayProducts: todayProducts || 0,
      totalProducts: totalProducts || 0,
      weeklyData,
      progressPercentage: Math.round(((todayArticles || 0) / dailyTarget) * 100),
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats', details: (err as Error).message },
      { status: 500 }
    );
  }
}

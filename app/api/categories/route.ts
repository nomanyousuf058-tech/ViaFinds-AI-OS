import { NextResponse } from 'next/server';
import { sanityClient } from '@/lib/sanity.client';

export async function GET() {
  const query = `*[_type == 'category'] { 'slug': slug.current, title }`;
  const categories = await sanityClient.fetch(query);
  // Enforce 2-niche rule: filter to only top-level categories with no parents
  const topLevelCategories = categories.filter(cat => !cat.parent);
  return NextResponse.json(topLevelCategories, { status: 200 });
}

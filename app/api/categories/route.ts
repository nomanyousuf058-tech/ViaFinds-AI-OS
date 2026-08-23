import { NextResponse } from 'next/server';
import { sanityClient } from '@/lib/sanity.client';

export async function GET() {
  try {
    const categories = await sanityClient.fetch(
      `*[_type == "category" && !defined(parentCategory)] {
        'slug': slug.current,
        'name': title
      }`
    );
    return NextResponse.json(categories, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

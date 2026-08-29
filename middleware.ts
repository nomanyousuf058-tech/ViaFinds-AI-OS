import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminTokenEdge } from '@/lib/auth-edge'

export const config = {
  matcher: ['/dashboard/:path*', '/api/admin/:path*', '/api/articles/:path*'],
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('admin_session')?.value

  if (!token) {
    const url = new URL('/login', request.url)
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  try {
    const payload = await verifyAdminTokenEdge(token)
    if (!payload) {
      const url = new URL('/login', request.url)
      url.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
  } catch {
    const url = new URL('/login', request.url)
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

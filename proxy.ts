import { NextRequest, NextResponse } from 'next/server'
import { NOVEL_GATE_COOKIE, verifyNovelGateToken } from '@/lib/read/novel-gate'

function isNovelReadingPath(pathname: string) {
  return pathname === '/read/toril' || pathname.startsWith('/read/toril/')
}

export async function proxy(request: NextRequest) {
  if (!isNovelReadingPath(request.nextUrl.pathname)) return NextResponse.next()

  const confirmed = await verifyNovelGateToken(request.cookies.get(NOVEL_GATE_COOKIE)?.value)
  if (confirmed) return NextResponse.next()

  const destination = request.nextUrl.clone()
  destination.pathname = '/read/age'
  destination.search = ''
  destination.searchParams.set('return_to', `${request.nextUrl.pathname}${request.nextUrl.search}`)
  return NextResponse.redirect(destination)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)'],
}

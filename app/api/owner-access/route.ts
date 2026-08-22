import { NextResponse } from 'next/server'
import { isRateLimited } from '@/lib/site/rate-limit'
import {
  ownerAccessCodeMatches,
  createOwnerAccessSession,
  hasOwnerAccessSession,
  OWNER_ACCESS_COOKIE,
} from '@/lib/site/server-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' }

export async function GET(request: Request) {
  return NextResponse.json({ active: hasOwnerAccessSession(request) }, { headers: NO_STORE_HEADERS })
}

export async function POST(request: Request) {
  if (isRateLimited(request, 'owner-access', 20, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many attempts. Wait a few minutes and try again.' }, { status: 429, headers: NO_STORE_HEADERS })
  }

  if (!process.env.TROTW_OWNER_CODE?.trim()) {
    return NextResponse.json({ error: 'Owner access is not configured.' }, { status: 503, headers: NO_STORE_HEADERS })
  }

  let body: { code?: unknown }
  try {
    body = (await request.json()) as { code?: unknown }
  } catch {
    return NextResponse.json({ error: 'The owner-access entry could not be read.' }, { status: 400, headers: NO_STORE_HEADERS })
  }

  const supplied = typeof body.code === 'string' ? body.code.trim() : ''
  if (!ownerAccessCodeMatches(supplied)) {
    return NextResponse.json({ error: 'That owner-access code was not accepted.' }, { status: 401, headers: NO_STORE_HEADERS })
  }

  const session = createOwnerAccessSession()
  if (!session) {
    return NextResponse.json({ error: 'Owner access is not configured.' }, { status: 503, headers: NO_STORE_HEADERS })
  }

  const response = NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS })
  response.cookies.set({
    name: OWNER_ACCESS_COOKIE,
    value: session.value,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: session.maxAge,
  })
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS })
  response.cookies.set({
    name: OWNER_ACCESS_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  })
  return response
}

import { NextResponse } from 'next/server'
import {
  NOVEL_GATE_COOKIE,
  NOVEL_GATE_MAX_AGE_SECONDS,
  createNovelGateToken,
  novelGateConfigured,
} from '@/lib/read/novel-gate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function safeReturnPath(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value.startsWith('/read/toril') || value.startsWith('//')) {
    return '/read/toril'
  }
  return value.slice(0, 500)
}

export async function POST(request: Request) {
  if (!novelGateConfigured()) {
    return NextResponse.json(
      { error: 'The novel age notice is not configured on the server.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'The age confirmation could not be read.' }, { status: 400 })
  }

  if (formData.get('answer') !== 'yes') {
    return NextResponse.redirect(new URL('/read/age?declined=1', request.url), 303)
  }

  const response = NextResponse.redirect(new URL(safeReturnPath(formData.get('return_to')), request.url), 303)
  response.cookies.set({
    name: NOVEL_GATE_COOKIE,
    value: await createNovelGateToken(),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/read',
    maxAge: NOVEL_GATE_MAX_AGE_SECONDS,
  })
  response.headers.set('Cache-Control', 'no-store')
  return response
}

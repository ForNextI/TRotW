import { NextResponse } from 'next/server'
import { isRateLimited } from '@/lib/site/rate-limit'
import { readRodneyLedger } from '@/lib/rodney/ledger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (isRateLimited(request, 'rodney-ledger', 180, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Rodney’s ledger has been opened too often from this connection. Try again shortly.' }, { status: 429 })
  }

  const pageValue = new URL(request.url).searchParams.get('page') || '0'
  const page = Number.isFinite(Number(pageValue)) ? Math.max(0, Math.floor(Number(pageValue))) : 0
  try {
    return NextResponse.json(await readRodneyLedger(page, 240), {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Rodney’s shared ledger could not be read.',
    }, { status: 502 })
  }
}

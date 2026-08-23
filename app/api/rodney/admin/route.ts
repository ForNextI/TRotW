import { NextResponse } from 'next/server'
import { isRateLimited } from '@/lib/site/rate-limit'
import { deleteRodneyWinner, readRodneyLedger } from '@/lib/rodney/ledger'
import { hasOwnerAccessSession } from '@/lib/site/server-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' }

function ownerAccessRequired() {
  return NextResponse.json({ error: 'Owner Access is required before Rodney ledger repair can be opened.' }, { status: 403, headers: NO_STORE_HEADERS })
}

export async function GET(request: Request) {
  if (!hasOwnerAccessSession(request)) return ownerAccessRequired()
  if (isRateLimited(request, 'rodney-admin-read', 120, 60 * 60 * 1000)) return NextResponse.json({ error: 'The ledger administration page has been refreshed too often. Try again shortly.' }, { status: 429, headers: NO_STORE_HEADERS })
  const pageValue = new URL(request.url).searchParams.get('page') || '0'
  const page = Number.isFinite(Number(pageValue)) ? Math.max(0, Math.floor(Number(pageValue))) : 0
  try {
    return NextResponse.json(await readRodneyLedger(page, 100), { headers: NO_STORE_HEADERS })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'The Rodney ledger could not be read.' }, { status: 502, headers: NO_STORE_HEADERS })
  }
}

export async function DELETE(request: Request) {
  if (!hasOwnerAccessSession(request)) return ownerAccessRequired()
  if (isRateLimited(request, 'rodney-admin-delete', 60, 60 * 60 * 1000)) return NextResponse.json({ error: 'Too many ledger changes were requested from this connection. Try again shortly.' }, { status: 429, headers: NO_STORE_HEADERS })
  let id = ''
  try {
    const body = (await request.json()) as { id?: unknown }
    id = typeof body.id === 'string' ? body.id : ''
  } catch {
    return NextResponse.json({ error: 'The deletion request could not be read.' }, { status: 400, headers: NO_STORE_HEADERS })
  }
  if (!id.trim()) return NextResponse.json({ error: 'Choose a winner entry to delete.' }, { status: 400, headers: NO_STORE_HEADERS })
  try {
    const result = await deleteRodneyWinner(id)
    if (!result.configured) return NextResponse.json({ error: 'The shared Rodney ledger is not connected.' }, { status: 503, headers: NO_STORE_HEADERS })
    if (!result.deleted) return NextResponse.json({ error: 'That winner entry was not found.' }, { status: 404, headers: NO_STORE_HEADERS })
    return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'The winner entry could not be deleted.' }, { status: 502, headers: NO_STORE_HEADERS })
  }
}

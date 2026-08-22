import { NextResponse } from 'next/server'
import { isRateLimited } from '@/lib/site/rate-limit'
import { readReaderPollResults, readerPollConfigured } from '@/lib/read/reader-poll'
import { hasOwnerAccessSession } from '@/lib/site/server-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, max-age=0' }

export async function GET(request: Request) {
  if (!hasOwnerAccessSession(request)) {
    return NextResponse.json({ error: 'Owner Access is required to read the private poll results.' }, { status: 403, headers: NO_STORE_HEADERS })
  }
  if (!readerPollConfigured()) {
    return NextResponse.json({ error: 'The reader poll is not connected to Upstash Redis.' }, { status: 503, headers: NO_STORE_HEADERS })
  }
  if (isRateLimited(request, 'reader-poll-results', 120, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'The poll results have been refreshed too often. Try again shortly.' }, { status: 429, headers: NO_STORE_HEADERS })
  }

  try {
    return NextResponse.json(await readReaderPollResults(), { headers: NO_STORE_HEADERS })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'The private poll results could not be read.' },
      { status: 502, headers: NO_STORE_HEADERS },
    )
  }
}

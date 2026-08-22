import { NextResponse } from 'next/server'
import { isRateLimited } from '@/lib/site/rate-limit'
import {
  READER_FEELING_OPTIONS,
  READER_POLL_COOKIE,
  READER_SCHEDULE_OPTIONS,
  readerPollConfigured,
  recordReaderPollVote,
  type ReaderFeeling,
  type ReaderSchedule,
} from '@/lib/read/reader-poll'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, max-age=0' }
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60
const MAX_REQUEST_BYTES = 1_024

function cookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get('cookie') || ''
  for (const pair of cookieHeader.split(';')) {
    const [key, ...rest] = pair.trim().split('=')
    if (key === name) {
      try {
        return decodeURIComponent(rest.join('='))
      } catch {
        return ''
      }
    }
  }
  return ''
}

function alreadyVoted(request: Request) {
  return cookieValue(request, READER_POLL_COOKIE) === 'yes'
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true
  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

export async function GET(request: Request) {
  return NextResponse.json(
    { voted: alreadyVoted(request), configured: readerPollConfigured() },
    { headers: NO_STORE_HEADERS },
  )
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-site poll submissions are not allowed.' }, { status: 403, headers: NO_STORE_HEADERS })
  }

  const contentLength = Number(request.headers.get('content-length') || '0')
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: 'That poll submission is too large.' }, { status: 413, headers: NO_STORE_HEADERS })
  }

  if (alreadyVoted(request)) {
    return NextResponse.json({ already_voted: true }, { status: 409, headers: NO_STORE_HEADERS })
  }

  if (isRateLimited(request, 'reader-poll', 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many poll submissions came from this connection. Please try again later.' }, { status: 429, headers: NO_STORE_HEADERS })
  }

  let body: { feeling?: unknown; schedule?: unknown }
  try {
    body = (await request.json()) as { feeling?: unknown; schedule?: unknown }
  } catch {
    return NextResponse.json({ error: 'I could not read those poll answers.' }, { status: 400, headers: NO_STORE_HEADERS })
  }

  const feeling = typeof body.feeling === 'string' && READER_FEELING_OPTIONS.includes(body.feeling as ReaderFeeling)
    ? body.feeling as ReaderFeeling
    : null
  const schedule = typeof body.schedule === 'string' && READER_SCHEDULE_OPTIONS.includes(body.schedule as ReaderSchedule)
    ? body.schedule as ReaderSchedule
    : null

  if (!feeling) {
    return NextResponse.json({ error: 'Choose how you feel about the story so far.' }, { status: 400, headers: NO_STORE_HEADERS })
  }
  if (feeling !== 'not_for_me' && !schedule) {
    return NextResponse.json({ error: 'Choose how often you would like new installments.' }, { status: 400, headers: NO_STORE_HEADERS })
  }

  try {
    const result = await recordReaderPollVote(feeling, feeling === 'not_for_me' ? null : schedule)
    if (!result.configured) {
      return NextResponse.json({ error: 'The poll is not connected right now. Please try again later.' }, { status: 503, headers: NO_STORE_HEADERS })
    }
    if (!result.recorded) {
      return NextResponse.json({ error: 'Your answers could not be recorded.' }, { status: 502, headers: NO_STORE_HEADERS })
    }

    const response = NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS })
    response.cookies.set({
      name: READER_POLL_COOKIE,
      value: 'yes',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: ONE_YEAR_SECONDS,
    })
    return response
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Your answers could not be recorded.' },
      { status: 502, headers: NO_STORE_HEADERS },
    )
  }
}

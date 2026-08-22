import { NextResponse } from 'next/server'
import { findCachedNarration, narrationCachePath, storeNarration } from '@/lib/read/narration-cache'
import { isRateLimited } from '@/lib/site/rate-limit'
import { readingPronunciationInstructions, readingSpeechText } from '@/lib/read/pronunciation-guide'
import { narrationLibraryServiceConfig, readAloudServiceConfig } from '@/lib/site/service-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_TEXT_LENGTH = 950
const MAX_REQUESTS_PER_TEN_MINUTES = 180
const WINDOW_MS = 10 * 60 * 1000
type NarrationVoice = 'fable' | 'marin'

function speakingInstructions(voice: NarrationVoice, text: string) {
  const shared = 'Read the supplied fantasy prose as an audiobook narrator. Use natural pacing, clear diction, restrained expression, and small pauses that follow the prose. Distinguish dialogue gently without turning characters into caricatures. Do not add introductions, commentary, stage directions, or words that are not present in the text.'
  const voiceDirection = voice === 'marin'
    ? `${shared} Use a natural, educated British English accent. Keep it consistent and understated.`
    : `${shared} Preserve the voice’s natural British character.`
  const guide = readingPronunciationInstructions(text, voice)
  return guide ? `${voiceDirection}\n\n${guide}` : voiceDirection
}

function audioResponse(audio: ArrayBuffer, cacheStatus: 'MISS' | 'BYPASS') {
  return new Response(audio, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-TROTW-Narration-Cache': cacheStatus,
    },
  })
}

function cachedAudioRedirect(url: string) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: url,
      'Cache-Control': 'no-store',
      'X-TROTW-Narration-Cache': 'HIT',
    },
  })
}

export async function POST(request: Request) {
  const service = readAloudServiceConfig()
  if (!service.configured) return NextResponse.json({ error: 'Read Aloud is not configured yet.' }, { status: 503 })
  const apiKey = service.apiKey

  if (isRateLimited(request, 'read-aloud', MAX_REQUESTS_PER_TEN_MINUTES, WINDOW_MS)) {
    return NextResponse.json({ error: 'Read Aloud is receiving too many requests from this connection. Please wait a moment and try again.' }, { status: 429 })
  }

  let body: { text?: unknown; voice?: unknown }
  try {
    body = await request.json() as { text?: unknown; voice?: unknown }
  } catch {
    return NextResponse.json({ error: 'The Read Aloud request was not valid.' }, { status: 400 })
  }

  const text = typeof body.text === 'string' ? body.text.replace(/\s+/g, ' ').trim() : ''
  const voice: NarrationVoice = body.voice === 'marin' ? 'marin' : 'fable'
  if (!text) return NextResponse.json({ error: 'There is no text to read.' }, { status: 400 })
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: 'This passage is too long for one Read Aloud request.' }, { status: 413 })
  }

  const speechInputText = readingSpeechText(text, voice)
  const instructions = speakingInstructions(voice, text)
  const model = service.model
  const cachePath = narrationCachePath({ model, voice, input: speechInputText, instructions })
  const narrationLibrary = narrationLibraryServiceConfig()

  if (narrationLibrary.configured) {
    try {
      const cached = await findCachedNarration(cachePath)
      if (cached) return cachedAudioRedirect(cached.url)
    } catch (error) {
      console.error('TROTW narration-library lookup failed; generating directly.', error)
    }
  }

  let upstream: Response
  try {
    upstream = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        voice,
        input: speechInputText,
        instructions,
        response_format: 'mp3',
        stream_format: 'audio',
      }),
      signal: AbortSignal.timeout(55_000),
    })
  } catch {
    return NextResponse.json({ error: 'Read Aloud could not reach the narration service. Please try again.' }, { status: 502 })
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '')
    console.error('OpenAI Read Aloud failed.', upstream.status, detail.slice(0, 1000))
    return NextResponse.json({ error: 'Read Aloud could not generate this passage. Please try again.' }, { status: 502 })
  }

  let audio: ArrayBuffer
  try {
    audio = await upstream.arrayBuffer()
  } catch {
    return NextResponse.json({ error: 'Read Aloud received an incomplete narration. Please try again.' }, { status: 502 })
  }

  if (narrationLibrary.configured) {
    try {
      await storeNarration(cachePath, audio)
      return audioResponse(audio, 'MISS')
    } catch (error) {
      // A second server instance may have won the first-write race. If so,
      // the library is healthy and the saved recording can be reused now.
      try {
        const cached = await findCachedNarration(cachePath)
        if (cached) return cachedAudioRedirect(cached.url)
      } catch (lookupError) {
        console.error('TROTW narration-library recovery lookup failed.', lookupError)
      }
      console.error('TROTW narration-library write failed; serving generated audio without caching it.', error)
    }
  }

  return audioResponse(audio, 'BYPASS')
}

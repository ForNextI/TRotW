import 'server-only'

import { createHash } from 'node:crypto'
import { head, put } from '@vercel/blob'

export const NARRATION_CACHE_NAMESPACE = 'read-aloud/v1'
const NARRATION_CACHE_SECONDS = 365 * 24 * 60 * 60

type NarrationCacheIdentity = {
  model: string
  voice: 'fable' | 'marin'
  input: string
  instructions: string
}

export type CachedNarration = {
  pathname: string
  url: string
}

export function narrationCachePath(identity: NarrationCacheIdentity) {
  const fingerprint = createHash('sha256')
    .update(JSON.stringify({
      schema: NARRATION_CACHE_NAMESPACE,
      model: identity.model,
      voice: identity.voice,
      input: identity.input,
      instructions: identity.instructions,
      responseFormat: 'mp3',
      streamFormat: 'audio',
    }))
    .digest('hex')

  return `${NARRATION_CACHE_NAMESPACE}/${identity.voice}/${fingerprint}.mp3`
}

function isBlobNotFound(error: unknown) {
  return error instanceof Error && error.name === 'BlobNotFoundError'
}

export async function findCachedNarration(pathname: string): Promise<CachedNarration | null> {
  try {
    const blob = await head(pathname)
    return { pathname: blob.pathname, url: blob.url }
  } catch (error) {
    if (isBlobNotFound(error)) return null
    throw error
  }
}

export async function storeNarration(pathname: string, audio: ArrayBuffer): Promise<CachedNarration> {
  const blob = await put(pathname, audio, {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'audio/mpeg',
    cacheControlMaxAge: NARRATION_CACHE_SECONDS,
  })
  return { pathname: blob.pathname, url: blob.url }
}

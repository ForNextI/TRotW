export type ReadAloudVoice = 'male' | 'female'

export interface ReadBookmarkFile {
  trotwBookmark?: 1
  wardenspcBookmark?: 1
  releaseId: string
  voice: ReadAloudVoice
  readAloudEnabled: boolean
}

export const READ_BOOKMARK_KEY = 'trotw:read-bookmark:v1'
export const READ_ALOUD_ENABLED_KEY = 'trotw:read-aloud-enabled:v1'
export const READ_ALOUD_VOICE_KEY = 'trotw:read-aloud-voice:v1'

export function normalizeReadAloudVoice(value: unknown): ReadAloudVoice {
  return value === 'male' ? 'male' : 'female'
}

export function parseReadBookmark(value: unknown, validReleaseIds?: ReadonlySet<string>): ReadBookmarkFile | null {
  let parsed: unknown = value
  if (typeof value === 'string') {
    try { parsed = JSON.parse(value) } catch { return null }
  }
  if (!parsed || typeof parsed !== 'object') return null
  const record = parsed as Partial<ReadBookmarkFile>
  const releaseId = typeof record.releaseId === 'string' ? record.releaseId.trim() : ''
  if (!releaseId || (validReleaseIds && !validReleaseIds.has(releaseId))) return null
  return {
    trotwBookmark: 1,
    releaseId,
    voice: normalizeReadAloudVoice(record.voice),
    readAloudEnabled: record.readAloudEnabled === true,
  }
}

export function makeReadBookmark(releaseId: string, voice: ReadAloudVoice, readAloudEnabled: boolean): ReadBookmarkFile {
  return {
    trotwBookmark: 1,
    releaseId: releaseId.trim(),
    voice: normalizeReadAloudVoice(voice),
    readAloudEnabled: Boolean(readAloudEnabled),
  }
}

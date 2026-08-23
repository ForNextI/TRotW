import 'server-only'

export const DEFAULT_TROTW_TTS_MODEL = 'gpt-4o-mini-tts'

function firstConfigured(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }
  return ''
}

export function readAloudServiceConfig() {
  const apiKey = firstConfigured('TROTW_OPENAI_API_KEY', 'OPENAI_API_KEY')
  const model = firstConfigured('TROTW_OPENAI_TTS_MODEL', 'OPENAI_TTS_MODEL') || DEFAULT_TROTW_TTS_MODEL
  return {
    apiKey,
    model,
    configured: Boolean(apiKey),
    usingLegacyVariable: Boolean(!process.env.TROTW_OPENAI_API_KEY?.trim() && process.env.OPENAI_API_KEY?.trim()),
  }
}


export function narrationLibraryServiceConfig() {
  const storeId = firstConfigured('trotw_STORE_ID', 'BLOB_STORE_ID')
  const legacyToken = firstConfigured('BLOB_READ_WRITE_TOKEN')

  return {
    storeId,
    configured: Boolean(storeId || legacyToken),
    usingLegacyToken: Boolean(!storeId && legacyToken),
  }
}

export function pollStoreServiceConfig() {
  const url = firstConfigured(
    'KV_REST_API_URL',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_API_URL',
    'UPSTASH_REDIS_REST_REST_API_URL',
  ) || Object.entries(process.env).find(
    ([name, value]) =>
      name.startsWith('UPSTASH_REDIS_') &&
      (name.endsWith('_REST_API_URL') || name.endsWith('_API_URL')) &&
      Boolean(value),
  )?.[1]?.trim() || ''

  const token = firstConfigured(
    'KV_REST_API_TOKEN',
    'UPSTASH_REDIS_REST_TOKEN',
    'UPSTASH_REDIS_REST_API_TOKEN',
    'UPSTASH_REDIS_REST_REST_API_TOKEN',
  ) || Object.entries(process.env).find(
    ([name, value]) =>
      name.startsWith('UPSTASH_REDIS_') &&
      (name.endsWith('_REST_API_TOKEN') || name.endsWith('_API_TOKEN')) &&
      Boolean(value),
  )?.[1]?.trim() || ''

  const normalizedUrl = url.replace(/\/$/, '')
  const normalizedToken = token.trim()
  return {
    url: normalizedUrl,
    token: normalizedToken,
    configured: Boolean(normalizedUrl && normalizedToken),
    usingLegacyVariables: Boolean(
      (!process.env.KV_REST_API_URL?.trim() || !process.env.KV_REST_API_TOKEN?.trim()) &&
      normalizedUrl &&
      normalizedToken,
    ),
  }
}

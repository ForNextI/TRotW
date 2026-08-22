import 'server-only'

function redisConfig() {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.UPSTASH_REDIS_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_REST_API_URL ||
    Object.entries(process.env).find(
      ([name, value]) =>
        name.startsWith('UPSTASH_REDIS_') &&
        (name.endsWith('_REST_API_URL') || name.endsWith('_API_URL')) &&
        Boolean(value),
    )?.[1] ||
    ''

  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.UPSTASH_REDIS_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_REST_API_TOKEN ||
    Object.entries(process.env).find(
      ([name, value]) =>
        name.startsWith('UPSTASH_REDIS_') &&
        (name.endsWith('_REST_API_TOKEN') || name.endsWith('_API_TOKEN')) &&
        Boolean(value),
    )?.[1] ||
    ''

  const normalizedUrl = url.trim().replace(/\/$/, '')
  const normalizedToken = token.trim()

  return {
    url: normalizedUrl,
    token: normalizedToken,
    configured: Boolean(normalizedUrl && normalizedToken),
  }
}

export function pollStoreConfigured() {
  return redisConfig().configured
}

export async function pollRedisCommand(
  command: Array<string | number>,
  messages: { unconfigured: string; unavailable: string },
) {
  const config = redisConfig()
  if (!config.configured) throw new Error(messages.unconfigured)

  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
  })
  const payload = (await response.json().catch(() => ({}))) as { result?: unknown; error?: string }
  if (!response.ok || payload.error) throw new Error(payload.error || messages.unavailable)
  return payload.result
}

import 'server-only'

import { pollStoreServiceConfig } from '@/lib/site/service-config'

export function pollStoreConfigured() {
  return pollStoreServiceConfig().configured
}

export async function pollRedisCommand(
  command: Array<string | number>,
  messages: { unconfigured: string; unavailable: string },
) {
  const config = pollStoreServiceConfig()
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

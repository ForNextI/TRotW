export const NOVEL_GATE_COOKIE = 'trotw_novel_adult_confirmed'
export const NOVEL_GATE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180

function novelGateSecret() {
  return process.env.TROTW_NOVEL_GATE_SECRET?.trim() || ''
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function hmacKey() {
  const secret = novelGateSecret()
  if (!secret) return null
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

export function novelGateConfigured() { return Boolean(novelGateSecret()) }

export async function createNovelGateToken() {
  const key = await hmacKey()
  if (!key) throw new Error('The novel-gate signing secret is not configured.')
  const payload = `adult-novel:${Date.now()}`
  const payloadBytes = new TextEncoder().encode(payload)
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, payloadBytes))
  return `${base64UrlEncode(payloadBytes)}.${base64UrlEncode(signature)}`
}

export async function verifyNovelGateToken(token: string | undefined | null) {
  if (!token || !token.includes('.')) return false
  const key = await hmacKey()
  if (!key) return false
  try {
    const [payloadPart, signaturePart] = token.split('.', 2)
    if (!payloadPart || !signaturePart) return false
    const payloadBytes = base64UrlDecode(payloadPart)
    const signatureBytes = base64UrlDecode(signaturePart)
    const payload = new TextDecoder().decode(payloadBytes)
    const match = /^adult-novel:(\d{10,})$/.exec(payload)
    if (!match) return false
    const issuedAt = Number(match[1])
    const maximumAge = NOVEL_GATE_MAX_AGE_SECONDS * 1000
    if (!Number.isFinite(issuedAt) || issuedAt > Date.now() + 60_000 || Date.now() - issuedAt > maximumAge) return false
    return crypto.subtle.verify('HMAC', key, signatureBytes, payloadBytes)
  } catch { return false }
}

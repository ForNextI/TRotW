import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

export const OWNER_ACCESS_COOKIE = 'trotw-owner-access'
const OWNER_ACCESS_SESSION_SECONDS = 2 * 60 * 60

function codesMatch(supplied: string, required: string) {
  const suppliedBytes = Buffer.from(supplied)
  const requiredBytes = Buffer.from(required)
  return suppliedBytes.length === requiredBytes.length && timingSafeEqual(suppliedBytes, requiredBytes)
}

function ownerAccessSecret() {
  return process.env.TROTW_OWNER_CODE?.trim() || ''
}

function cookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get('cookie') || ''
  for (const pair of cookieHeader.split(';')) {
    const [key, ...rest] = pair.trim().split('=')
    if (key === name) {
      try { return decodeURIComponent(rest.join('=')) } catch { return '' }
    }
  }
  return ''
}

function ownerSessionSignature(expiresAt: number, secret: string) {
  return createHmac('sha256', secret).update(`trotw_owner_access:${expiresAt}`).digest('hex')
}

export function createOwnerAccessSession() {
  const secret = ownerAccessSecret()
  if (!secret) return null
  const expiresAt = Math.floor(Date.now() / 1000) + OWNER_ACCESS_SESSION_SECONDS
  return {
    value: `${expiresAt}.${ownerSessionSignature(expiresAt, secret)}`,
    maxAge: OWNER_ACCESS_SESSION_SECONDS,
  }
}

export function hasOwnerAccessCookieValue(value: string | null | undefined) {
  const secret = ownerAccessSecret()
  if (!secret) return false
  const [expiresText, suppliedSignature] = (value || '').split('.', 2)
  const expiresAt = Number(expiresText)
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) || !suppliedSignature) return false
  return codesMatch(suppliedSignature, ownerSessionSignature(expiresAt, secret))
}

export function hasOwnerAccessSession(request: Request) {
  return hasOwnerAccessCookieValue(cookieValue(request, OWNER_ACCESS_COOKIE))
}

export function ownerAccessCodeMatches(suppliedValue: string | null | undefined) {
  const supplied = suppliedValue?.trim() || ''
  const required = ownerAccessSecret()
  return Boolean(supplied && required && codesMatch(supplied, required))
}

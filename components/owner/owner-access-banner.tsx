'use client'

import { KeyRound, LogOut } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

const OWNER_ACCESS_EVENT = 'trotw-owner-access-changed'
const INACTIVITY_LIMIT_MS = 30 * 60 * 1000
const STATUS_REFRESH_MS = 5 * 60 * 1000

export function OwnerAccessBanner() {
  const [active, setActive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inactivityTimerRef = useRef<number | null>(null)

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current !== null) window.clearTimeout(inactivityTimerRef.current)
    inactivityTimerRef.current = null
  }, [])

  const turnOff = useCallback(async () => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/owner-access', { method: 'DELETE', cache: 'no-store' })
      if (!response.ok) throw new Error('Owner access could not be turned off.')
      clearInactivityTimer()
      setActive(false)
      window.dispatchEvent(new CustomEvent(OWNER_ACCESS_EVENT, { detail: { active: false } }))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Owner access could not be turned off.')
    } finally {
      setBusy(false)
    }
  }, [busy, clearInactivityTimer])

  const armInactivityTimer = useCallback(() => {
    if (!active) return
    clearInactivityTimer()
    inactivityTimerRef.current = window.setTimeout(() => void turnOff(), INACTIVITY_LIMIT_MS)
  }, [active, clearInactivityTimer, turnOff])

  useEffect(() => {
    let cancelled = false
    async function checkStatus() {
      try {
        const response = await fetch('/api/owner-access', { cache: 'no-store' })
        const payload = (await response.json().catch(() => ({}))) as { active?: boolean }
        if (!cancelled) {
          const nextActive = Boolean(response.ok && payload.active)
          setActive(nextActive)
          if (!nextActive) clearInactivityTimer()
        }
      } catch {
        if (!cancelled) setActive(false)
      }
    }

    void checkStatus()
    const interval = window.setInterval(checkStatus, STATUS_REFRESH_MS)
    const handleChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ active?: boolean }>).detail
      setActive(Boolean(detail?.active))
    }
    window.addEventListener(OWNER_ACCESS_EVENT, handleChanged)
    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener(OWNER_ACCESS_EVENT, handleChanged)
      clearInactivityTimer()
    }
  }, [clearInactivityTimer])

  useEffect(() => {
    if (!active) {
      clearInactivityTimer()
      return
    }
    const reset = () => armInactivityTimer()
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart']
    events.forEach((eventName) => window.addEventListener(eventName, reset, { passive: true }))
    document.addEventListener('visibilitychange', reset)
    armInactivityTimer()
    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, reset))
      document.removeEventListener('visibilitychange', reset)
      clearInactivityTimer()
    }
  }, [active, armInactivityTimer, clearInactivityTimer])

  if (!active) return null

  return (
    <aside className="fixed inset-x-3 top-12 z-[100] mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/60 bg-[#2d210d]/95 px-4 py-3 text-amber-50 shadow-2xl backdrop-blur" role="status" aria-live="polite">
      <div className="flex min-w-0 items-center gap-3">
        <KeyRound className="size-5 shrink-0 text-amber-300" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-bold">OWNER ACCESS ACTIVE</p>
          <p className="text-xs text-amber-100/75">Private publishing tools are available in this browser session.</p>
        </div>
      </div>
      {error && <p className="w-full text-xs font-semibold text-red-200" role="alert">{error}</p>}
      <div className="flex items-center gap-2">
        <Link href="/owner" className="rounded-lg border border-amber-200/30 px-3 py-2 text-xs font-bold hover:bg-amber-100/10">Owner page</Link>
        <button type="button" onClick={() => void turnOff()} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-amber-200 px-3 py-2 text-xs font-bold text-[#2d210d] disabled:opacity-50">
          <LogOut className="size-4" aria-hidden="true" />
          End owner access
        </button>
      </div>
    </aside>
  )
}

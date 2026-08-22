'use client'

import { KeyRound, LoaderCircle, LogOut, ShieldCheck } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'

const OWNER_ACCESS_EVENT = 'trotw-owner-access-changed'

export function OwnerAccess() {
  const [code, setCode] = useState('')
  const [active, setActive] = useState(false)
  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function checkSession() {
      try {
        const response = await fetch('/api/owner-access', { cache: 'no-store' })
        const payload = (await response.json().catch(() => ({}))) as { active?: boolean }
        if (!cancelled) setActive(Boolean(response.ok && payload.active))
      } finally {
        if (!cancelled) setChecking(false)
      }
    }
    void checkSession()
    return () => { cancelled = true }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const clean = code.trim()
    if (!clean || busy) return
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/owner-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: clean }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(payload.error || 'Owner access could not be activated.')
      setCode('')
      setActive(true)
      window.dispatchEvent(new CustomEvent(OWNER_ACCESS_EVENT, { detail: { active: true } }))
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Owner access could not be activated.')
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/owner-access', { method: 'DELETE' })
      if (!response.ok) throw new Error('Owner access could not be cleared.')
      setActive(false)
      setCode('')
      window.dispatchEvent(new CustomEvent(OWNER_ACCESS_EVENT, { detail: { active: false } }))
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Owner access could not be cleared.')
    } finally {
      setBusy(false)
    }
  }

  if (checking) {
    return (
      <section className="rounded-3xl border border-border bg-card p-6 sm:p-8" aria-live="polite">
        <LoaderCircle className="size-8 animate-spin text-primary" aria-hidden="true" />
        <p className="mt-4 text-sm text-muted-foreground">Checking owner access…</p>
      </section>
    )
  }

  if (active) {
    return (
      <section className="rounded-3xl border border-primary/40 bg-primary/10 p-6 sm:p-8">
        <ShieldCheck className="size-9 text-primary" aria-hidden="true" />
        <h1 className="mt-4 font-display text-3xl font-bold">Owner access is active</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          This browser has a secure server-authenticated owner session for private publishing and reader-poll tools.
        </p>
        <button type="button" onClick={() => void signOut()} disabled={busy} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold disabled:opacity-45">
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <LogOut className="size-4" aria-hidden="true" />}
          End owner access
        </button>
        {error && <p className="mt-4 rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{error}</p>}
      </section>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-border bg-card p-6 sm:p-8">
      <KeyRound className="size-9 text-primary" aria-hidden="true" />
      <h1 className="mt-4 font-display text-3xl font-bold">Owner access</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Enter the private owner code. This page is intentionally absent from site navigation. The code is checked on the server, discarded, and replaced with a short-lived secure browser session.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="owner-access-code" className="sr-only">Owner access code</label>
        <input id="owner-access-code" type="password" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="off" className="min-h-12 flex-1 rounded-xl border border-input bg-background px-4 outline-none focus:ring-2 focus:ring-ring" placeholder="Owner access code" />
        <button type="submit" disabled={busy || !code.trim()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-bold text-primary-foreground disabled:opacity-45">
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="size-4" aria-hidden="true" />}
          Authenticate
        </button>
      </div>
      {error && <p className="mt-4 rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{error}</p>}
    </form>
  )
}

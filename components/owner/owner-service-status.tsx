'use client'

import { CheckCircle2, CircleAlert, LoaderCircle, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

type StatusPayload = {
  version?: string
  services?: {
    novelGate?: { configured?: boolean }
    readAloud?: { configured?: boolean; model?: string; usingLegacyVariable?: boolean }
    readerPoll?: { configured?: boolean; usingLegacyVariables?: boolean }
    publisher?: {
      ownerCodeConfigured?: boolean
      publisherCodeConfigured?: boolean
      githubConfigured?: boolean
      githubRepository?: string
      githubBranch?: string
      githubTokenConfigured?: boolean
    }
    rightsContact?: { configured?: boolean }
  }
}

function StatusRow({ label, configured, detail }: { label: string; configured: boolean; detail?: string }) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-border bg-background/60 px-4 py-3">
      {configured
        ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden="true" />
        : <CircleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />}
      <div className="min-w-0">
        <p className="text-sm font-bold">{label}: {configured ? 'Configured' : 'Needs configuration'}</p>
        {detail && <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">{detail}</p>}
      </div>
    </li>
  )
}

export function OwnerServiceStatus() {
  const [payload, setPayload] = useState<StatusPayload | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/owner/service-status', { cache: 'no-store' })
      const next = (await response.json().catch(() => ({}))) as StatusPayload & { error?: string }
      if (!response.ok) throw new Error(next.error || 'Service status could not be checked.')
      setPayload(next)
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Service status could not be checked.')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const services = payload?.services
  const publisher = services?.publisher
  const publisherConfigured = Boolean(
    publisher?.ownerCodeConfigured &&
    publisher?.publisherCodeConfigured &&
    publisher?.githubConfigured,
  )

  return (
    <section className="mt-6 rounded-3xl border border-border bg-card p-6 sm:p-8" aria-labelledby="service-status-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="service-status-heading" className="font-display text-2xl font-bold">Standalone service status</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            This owner-only check reports whether TROTW can see the required server configuration. It never returns secret values.
          </p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-bold disabled:opacity-45">
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
          Refresh
        </button>
      </div>

      {error && <p className="mt-5 rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{error}</p>}
      {!error && busy && !payload && <p className="mt-5 text-sm text-muted-foreground" aria-live="polite">Checking TROTW services…</p>}
      {!error && payload && (
        <>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            <StatusRow label="Novel age gate" configured={Boolean(services?.novelGate?.configured)} />
            <StatusRow
              label="Read Aloud"
              configured={Boolean(services?.readAloud?.configured)}
              detail={`${services?.readAloud?.model || 'No model selected'}${services?.readAloud?.usingLegacyVariable ? ' · using legacy OPENAI_API_KEY fallback' : ''}`}
            />
            <StatusRow
              label="Reader Poll"
              configured={Boolean(services?.readerPoll?.configured)}
              detail={services?.readerPoll?.usingLegacyVariables ? 'Using legacy UPSTASH_* fallback variables.' : undefined}
            />
            <StatusRow
              label="Publisher"
              configured={publisherConfigured}
              detail={publisher?.githubRepository ? `${publisher.githubRepository} · ${publisher.githubBranch || 'main'}` : 'GitHub repository or token is not fully configured.'}
            />
            <StatusRow label="Rights-holder contact" configured={Boolean(services?.rightsContact?.configured)} detail="Optional. The Legal page works without it." />
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">Reported by TROTW {payload.version || ''}.</p>
        </>
      )}
    </section>
  )
}

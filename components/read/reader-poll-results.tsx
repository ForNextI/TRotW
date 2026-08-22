'use client'

import { BarChart3, LoaderCircle, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReaderPollResults as ReaderPollResultsData } from '@/lib/read/reader-poll'

type ResultItem = { label: string; count: number }

function percentage(count: number, total: number) {
  if (total <= 0) return 0
  return Math.round((count / total) * 100)
}

function ResultsGroup({ title, total, items }: { title: string; total: number; items: ResultItem[] }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{total.toLocaleString()} response{total === 1 ? '' : 's'}</p>
      </div>
      <div className="mt-6 space-y-4">
        {items.map((item) => {
          const share = percentage(item.count, total)
          return (
            <div key={item.label} className="rounded-2xl border border-border bg-background/55 p-4">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-semibold leading-6">{item.label}</p>
                <p className="shrink-0 font-mono text-sm font-bold">{item.count.toLocaleString()} · {share}%</p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function ReaderPollResults() {
  const [results, setResults] = useState<ReaderPollResultsData | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')

  async function loadResults() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/read/poll/results', { cache: 'no-store' })
      const payload = (await response.json().catch(() => ({}))) as ReaderPollResultsData & { error?: string }
      if (!response.ok) throw new Error(payload.error || 'The reader poll results could not be loaded.')
      setResults(payload)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'The reader poll results could not be loaded.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void loadResults() }, [])

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-3 text-primary">
            <BarChart3 className="size-7" aria-hidden="true" />
            <p className="font-mono text-xs font-bold uppercase tracking-[0.22em]">Private reader analytics</p>
          </div>
          <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">Reader poll results</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">These numbers are visible only during an active Owner Access session. Readers never see the totals.</p>
        </div>
        <button type="button" onClick={() => void loadResults()} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold disabled:opacity-45">
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
          Refresh
        </button>
      </div>

      {error && <p className="mt-6 rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{error}</p>}

      {results && (
        <>
          <div className="mt-8 grid gap-6">
            <ResultsGroup
              title="How readers feel"
              total={results.feeling_total}
              items={[
                { label: 'It isn’t for me.', count: results.feeling.not_for_me },
                { label: 'I’m still deciding.', count: results.feeling.still_deciding },
                { label: 'I’m enjoying it.', count: results.feeling.enjoying },
                { label: 'I’m loving it.', count: results.feeling.loving },
              ]}
            />
            <ResultsGroup
              title="How often readers want installments"
              total={results.schedule_total}
              items={[
                { label: 'Once a week', count: results.schedule.once_weekly },
                { label: 'Twice a week', count: results.schedule.twice_weekly },
                { label: 'Three times a week', count: results.schedule.three_times_weekly },
              ]}
            />
          </div>
          <p className="mt-5 text-xs text-muted-foreground">Last vote: {results.last_vote_at ? new Date(results.last_vote_at).toLocaleString() : 'No votes yet.'}</p>
        </>
      )}

      {busy && !results && (
        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground" aria-live="polite">
          <LoaderCircle className="size-5 animate-spin text-primary" aria-hidden="true" />
          Loading the private results…
        </div>
      )}
    </div>
  )
}

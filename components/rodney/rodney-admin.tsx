'use client'

import { ChevronLeft, ChevronRight, LoaderCircle, Search, Trash2, Wrench } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

const PAGE_SIZE = 100
interface RodneyWinner { id: string; name: string; amount_silver: number; won_at: string }
interface LedgerResponse { configured?: boolean; entries?: RodneyWinner[]; champion?: RodneyWinner | null; total?: number; page?: number; page_size?: number; error?: string }

function formatCoins(totalSilver: number) {
  const safe = Math.max(0, Math.floor(totalSilver))
  const gold = Math.floor(safe / 10)
  const silver = safe % 10
  return [gold > 0 ? `${gold} gp` : '', silver > 0 || gold === 0 ? `${silver} sp` : ''].filter(Boolean).join(', ')
}

export function RodneyAdmin() {
  const [entries, setEntries] = useState<RodneyWinner[]>([])
  const [champion, setChampion] = useState<RodneyWinner | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const filteredEntries = useMemo(() => { const q=filter.trim().toLocaleLowerCase('en-US'); return q ? entries.filter((entry) => entry.name.toLocaleLowerCase('en-US').includes(q)) : entries }, [entries, filter])
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const loadLedger = useCallback(async (nextPage = 0) => {
    setBusy(true); setError(null)
    try {
      const response = await fetch(`/api/rodney/admin?page=${nextPage}`, { cache: 'no-store' })
      const payload = (await response.json().catch(() => ({}))) as LedgerResponse
      if (!response.ok) throw new Error(payload.error || 'The ledger could not be opened.')
      setEntries(payload.entries || []); setChampion(payload.champion || null); setTotal(payload.total || 0); setPage(payload.page || 0)
    } catch (e) { setError(e instanceof Error ? e.message : 'The ledger could not be opened.') }
    finally { setBusy(false) }
  }, [])

  useEffect(() => { void loadLedger(0) }, [loadLedger])

  async function removeWinner(entry: RodneyWinner) {
    if (!window.confirm(`Delete “${entry.name}” (${formatCoins(entry.amount_silver)}) from the public Roll of Fortune?`)) return
    setBusy(true); setError(null)
    try {
      const response = await fetch('/api/rodney/admin', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: entry.id }) })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(payload.error || 'The winner entry could not be deleted.')
      await loadLedger(page)
    } catch (e) { setError(e instanceof Error ? e.message : 'The winner entry could not be deleted.'); setBusy(false) }
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-6 sm:p-8" aria-labelledby="rodney-ledger-admin-heading">
      <Wrench className="size-8 text-primary" aria-hidden="true" />
      <h1 id="rodney-ledger-admin-heading" className="mt-4 font-display text-3xl font-bold">Rodney ledger repair</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Owner-only view of the public Roll of Fortune. Delete an entry only when a public name needs repair.</p>
      {champion && <p className="mt-4 text-sm"><strong>Biggest recorded win:</strong> {champion.name} · {formatCoins(champion.amount_silver)}</p>}
      <label className="mt-6 flex items-center gap-2 rounded-xl border border-input bg-background px-4"><Search className="size-4 text-muted-foreground" aria-hidden="true" /><span className="sr-only">Filter names</span><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter current page" className="min-h-11 flex-1 bg-transparent outline-none" /></label>
      {error && <p className="mt-4 rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{error}</p>}
      {busy && entries.length === 0 ? <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Opening ledger…</p> : (
        <div className="mt-6 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-border"><th className="px-2 py-3">Name</th><th className="px-2 py-3">Winnings</th><th className="px-2 py-3">Recorded</th><th className="px-2 py-3 text-right">Repair</th></tr></thead><tbody>{filteredEntries.map((entry) => <tr key={entry.id} className="border-b border-border/60"><td className="px-2 py-3 font-bold">{entry.name}</td><td className="px-2 py-3">{formatCoins(entry.amount_silver)}</td><td className="px-2 py-3 text-muted-foreground">{new Date(entry.won_at).toLocaleString()}</td><td className="px-2 py-3 text-right"><button type="button" onClick={() => void removeWinner(entry)} disabled={busy} className="inline-flex size-9 items-center justify-center rounded-lg border border-destructive/35 text-destructive disabled:opacity-40" aria-label={`Delete ${entry.name}`}><Trash2 className="size-4" aria-hidden="true" /></button></td></tr>)}</tbody></table></div>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{total.toLocaleString()} entries</p><div className="flex items-center gap-3"><button type="button" onClick={() => void loadLedger(Math.max(0,page-1))} disabled={page===0||busy} className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-sm font-bold disabled:opacity-40"><ChevronLeft className="size-4" />Previous</button><span className="text-xs">Page {page+1} of {pageCount}</span><button type="button" onClick={() => void loadLedger(Math.min(pageCount-1,page+1))} disabled={page>=pageCount-1||busy} className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-sm font-bold disabled:opacity-40">Next<ChevronRight className="size-4" /></button></div></div>
    </section>
  )
}

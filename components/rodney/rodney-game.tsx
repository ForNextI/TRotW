'use client'

import { ChevronLeft, ChevronRight, Coins, Dices, LoaderCircle, Trophy } from 'lucide-react'
import Image from 'next/image'
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { FullscreenToggle } from '@/components/accessibility/fullscreen-toggle'

const TOKEN_STORAGE_KEY = 'trotw-rodney:v1'
const LEGACY_STORAGE_KEY = 'trotw-rodney:legacy'
const MAX_WINNER_NAME = 12
const PAGE_SIZE = 240
const COLUMN_SIZE = 10
const COLUMN_COUNT = 6
const BAND_SIZE = COLUMN_SIZE * COLUMN_COUNT
const BAND_COUNT = 4
const MIN_PIP_BUZZ_MS = 220
const WINNER_CELEBRATION_MS = 7_000

const RODNEY_QUOTES = [
  'Tymora says every roll has character. Rodney suspects some have more character than others.',
  'I have checked the figures twice. This has not improved them.',
  'Fortune favors the bold, the patient, and occasionally the person standing behind you.',
  'The dice are impartial. Rodney, regrettably, has opinions.',
  'If this round goes badly, I recommend blaming gravity. It has a long record of interference.',
  'I am, in fact, in Waterdeep. Waterdhavians call gold pieces dragons and silver pieces shards. I use gp and sp because visitors become alarmed when the ledger says I am sitting on twenty-one dragons.',
]

type Phase = 'ready' | 'round_ready' | 'extra_silver' | 'name_champion'

interface RodneyPublicState {
  score_silver: number
  phase: Phase
  dice: [number, number] | null
  message: string
  pending_score: number
  qualifying_doubles: number
  current_champion: string
}

interface RodneyWinner {
  id: string
  name: string
  amount_silver: number
  won_at: string
}

interface PlayResponse {
  token?: string
  state?: RodneyPublicState
  champion?: RodneyWinner
  ledger_recorded?: boolean
  ledger_configured?: boolean
  error?: string
}

interface LedgerResponse {
  configured: boolean
  entries: RodneyWinner[]
  champion: RodneyWinner | null
  total: number
  page: number
  page_size: number
  error?: string
}

function formatCoins(totalSilver: number) {
  const safe = Math.max(0, Math.floor(totalSilver))
  const gold = Math.floor(safe / 10)
  const silver = safe % 10
  const parts = [
    gold > 0 ? `${gold.toLocaleString()} gp` : '',
    silver > 0 || gold === 0 ? `${silver.toLocaleString()} sp` : '',
  ].filter(Boolean)
  return parts.join(', ')
}

function legacyChampion() {
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return ''
    const parsed = JSON.parse(raw) as { latest_winner?: { name?: unknown } }
    return typeof parsed.latest_winner?.name === 'string' ? parsed.latest_winner.name : ''
  } catch {
    return ''
  }
}

const PIP_POSITIONS: Record<number, string[]> = {
  1: ['center'],
  2: ['top-left', 'bottom-right'],
  3: ['top-left', 'center', 'bottom-right'],
  4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
  6: ['top-left', 'middle-left', 'bottom-left', 'top-right', 'middle-right', 'bottom-right'],
}

function HistoricPipFace({ value, className = '' }: { value: number; className?: string }) {
  return (
    <span className={`rodney-pip-face ${className}`} aria-hidden="true">
      {PIP_POSITIONS[value].map((position) => <span key={position} className={`rodney-historic-pip pip-${position}`} />)}
    </span>
  )
}

function PipBuzz({ reel }: { reel: 'one' | 'two' }) {
  const sequence = reel === 'one' ? [6, 2, 5, 1, 4, 3] : [3, 6, 1, 5, 2, 4]
  return (
    <span className={`rodney-pip-buzz rodney-pip-buzz-${reel}`} aria-hidden="true">
      {sequence.map((value, index) => <HistoricPipFace key={`${value}-${index}`} value={value} className="rodney-pip-buzz-face" />)}
    </span>
  )
}

function RodneyBones({ dice, rolling }: { dice: [number, number] | null; rolling: boolean }) {
  return (
    <div className="rodney-bones" aria-hidden="true">
      <Image src="/images/rodney-bones.png" alt="" width={1502} height={474} priority className="h-auto w-full select-none" draggable={false} />
      {(['one', 'two'] as const).map((reel, index) => (
        <span key={reel} className={`rodney-bone-window rodney-bone-window-${reel}`}>
          {rolling ? <PipBuzz reel={reel} /> : dice?.[index] ? <HistoricPipFace value={dice[index]} /> : null}
        </span>
      ))}
    </div>
  )
}

export function RodneyGame() {
  const [state, setState] = useState<RodneyPublicState | null>(null)
  const [token, setToken] = useState('')
  const [winnerName, setWinnerName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ledger, setLedger] = useState<LedgerResponse>({ configured: false, entries: [], champion: null, total: 0, page: 0, page_size: PAGE_SIZE })
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [winnerCelebrating, setWinnerCelebrating] = useState(false)
  const [winnerTextVisible, setWinnerTextVisible] = useState(false)
  const [championCelebrating, setChampionCelebrating] = useState(false)
  const [diceRolling, setDiceRolling] = useState(false)
  const [rodneyQuoteIndex, setRodneyQuoteIndex] = useState(0)
  const winnerFocusTimerRef = useRef<number | null>(null)
  const championTimerRef = useRef<number | null>(null)
  const portraitRef = useRef<HTMLElement | null>(null)
  const doubleBetRef = useRef<HTMLDivElement | null>(null)
  const winnerInputRef = useRef<HTMLInputElement | null>(null)

  function clearWinnerTimers() {
    if (winnerFocusTimerRef.current) window.clearTimeout(winnerFocusTimerRef.current)
    winnerFocusTimerRef.current = null
  }

  const loadLedger = useCallback(async (page = 0) => {
    setLedgerLoading(true)
    try {
      const response = await fetch(`/api/rodney/ledger?page=${page}`, { cache: 'no-store' })
      const payload = (await response.json().catch(() => ({}))) as LedgerResponse
      if (!response.ok) throw new Error(payload.error || 'Rodney’s Roll of Fortune could not be opened.')
      setLedger(payload)
    } catch (ledgerError) {
      setError(ledgerError instanceof Error ? ledgerError.message : 'Rodney’s Roll of Fortune could not be opened.')
    } finally {
      setLedgerLoading(false)
    }
  }, [])

  const playAction = useCallback(async (action: 'load' | 'play' | 'roll' | 'extra' | 'claim', name = '') => {
    if (action === 'claim') {
      clearWinnerTimers()
      setWinnerTextVisible(false)
      setWinnerCelebrating(false)
    }

    const rollStartedAt = action === 'roll' ? performance.now() : 0
    if (action === 'roll') setDiceRolling(true)
    setBusy(true)
    setError(null)

    try {
      const storedToken = token || window.localStorage.getItem(TOKEN_STORAGE_KEY) || ''
      const response = await fetch('/api/rodney/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          token: storedToken,
          champion_name: name,
          legacy_champion: action === 'load' ? legacyChampion() : undefined,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as PlayResponse
      if (!response.ok || !payload.state || !payload.token) {
        if (payload.state && payload.token) {
          setState(payload.state)
          setToken(payload.token)
          window.localStorage.setItem(TOKEN_STORAGE_KEY, payload.token)
        }
        throw new Error(payload.error || 'Rodney could not complete that move.')
      }

      if (action === 'roll') {
        const remainingBuzz = Math.max(0, MIN_PIP_BUZZ_MS - (performance.now() - rollStartedAt))
        if (remainingBuzz > 0) await new Promise((resolve) => window.setTimeout(resolve, remainingBuzz))
      }

      setState(payload.state)
      if (action === 'roll') setDiceRolling(false)

      if (action === 'roll' && payload.state.phase === 'name_champion') {
        clearWinnerTimers()
        window.requestAnimationFrame(() => {
          setWinnerCelebrating(true)
          setWinnerTextVisible(true)
          portraitRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        })
        winnerFocusTimerRef.current = window.setTimeout(() => {
          setWinnerTextVisible(false)
          setWinnerCelebrating(false)
          winnerInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          window.setTimeout(() => winnerInputRef.current?.focus({ preventScroll: true }), 350)
        }, WINNER_CELEBRATION_MS)
      }

      if (action === 'roll' && payload.state.phase === 'extra_silver') {
        window.setTimeout(() => doubleBetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 90)
      }

      if (action === 'claim') {
        setChampionCelebrating(false)
        window.requestAnimationFrame(() => setChampionCelebrating(true))
        if (championTimerRef.current) window.clearTimeout(championTimerRef.current)
        championTimerRef.current = window.setTimeout(() => setChampionCelebrating(false), 1_700)
        setRodneyQuoteIndex((current) => (current + 1 + Math.floor(Math.random() * (RODNEY_QUOTES.length - 1))) % RODNEY_QUOTES.length)
      }

      setToken(payload.token)
      window.localStorage.setItem(TOKEN_STORAGE_KEY, payload.token)
      if (action === 'load') window.localStorage.removeItem(LEGACY_STORAGE_KEY)
      if (action === 'claim') {
        setWinnerName('')
        await loadLedger(0)
      }
    } catch (playError) {
      setError(playError instanceof Error ? playError.message : 'Rodney could not complete that move.')
    } finally {
      if (action === 'roll') setDiceRolling(false)
      setBusy(false)
    }
  }, [loadLedger, token])

  useEffect(() => {
    setRodneyQuoteIndex(Math.floor(Math.random() * RODNEY_QUOTES.length))
    void playAction('load')
    void loadLedger(0)
    return () => {
      clearWinnerTimers()
      if (championTimerRef.current) window.clearTimeout(championTimerRef.current)
    }
    // The initial load deliberately runs once for this browser tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pageSize = ledger.page_size || PAGE_SIZE
  const pageCount = Math.max(1, Math.ceil(ledger.total / pageSize))
  const bands = Array.from({ length: BAND_COUNT }, (_, bandIndex) => {
    const bandEntries = ledger.entries.slice(bandIndex * BAND_SIZE, (bandIndex + 1) * BAND_SIZE)
    return Array.from({ length: COLUMN_COUNT }, (_, columnIndex) => bandEntries.slice(columnIndex * COLUMN_SIZE, (columnIndex + 1) * COLUMN_SIZE))
  })
  const allTimeChampion = ledger.champion

  function recordFortune(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanName = winnerName.replace(/\s+/g, ' ').trim().slice(0, MAX_WINNER_NAME)
    if (!cleanName || busy) return
    void playAction('claim', cleanName)
  }

  if (!state) {
    return (
      <div className="flex min-h-80 items-center justify-center gap-3 rounded-3xl border border-border bg-card text-muted-foreground">
        <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
        Rodney is opening the betting ledger…
      </div>
    )
  }

  const currentScoreTotalSilver = Math.max(0, Math.floor(state.score_silver))

  return (
    <div className="space-y-8">
      <div className="grid gap-7 lg:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.05fr)] lg:items-stretch">
        <div>
          <section ref={portraitRef} className="scroll-mt-6 overflow-hidden rounded-3xl border border-accent/40 bg-card shadow-2xl shadow-black/25">
            <div className="relative overflow-hidden">
              <Image src="/images/rodney-shrine.webp" alt="Rodney, the elaborate Shrine to Tymora dice game" width={1024} height={1024} className="aspect-square h-auto w-full object-cover" />
              <span className="rodney-lamp-off rodney-lamp-left" aria-hidden="true" />
              <span className="rodney-lamp-off rodney-lamp-right" aria-hidden="true" />
              <span className={`rodney-lamp-flash rodney-lamp-left ${winnerCelebrating ? 'is-flashing' : ''}`} aria-hidden="true" />
              <span className={`rodney-lamp-flash rodney-lamp-right ${winnerCelebrating ? 'is-flashing' : ''}`} aria-hidden="true" />
              {winnerTextVisible && <span className="rodney-winner-word font-blackletter" data-text="Fortune!" role="status">Fortune!</span>}
            </div>
          </section>
          <p className="mx-auto mt-4 max-w-2xl px-2 text-center font-display text-base leading-relaxed text-foreground sm:text-lg">
            “Greetings. I am Rodney the Pegacorn, your local emissary of Tymora. {RODNEY_QUOTES[rodneyQuoteIndex]}”
          </p>
          <div className="mt-4 rounded-xl border border-border bg-background/75 p-4">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-mono font-bold uppercase tracking-[0.16em] text-primary">Tymora’s Favor</span>
              <span className="font-bold text-foreground">{state.qualifying_doubles} of 6 doubles</span>
            </div>
            <div className="mt-3 grid grid-cols-6 gap-2" aria-label={`${state.qualifying_doubles} of 6 qualifying doubles`}>
              {Array.from({ length: 6 }, (_, index) => (
                <span key={index} className={`h-3 rounded-full border transition-all ${index < state.qualifying_doubles ? 'border-accent bg-accent shadow-[0_0_12px_rgba(227,173,64,0.55)]' : 'border-border bg-secondary'}`} aria-hidden="true" />
              ))}
            </div>
          </div>
        </div>

        <section className="h-full rounded-3xl border border-border bg-card p-5 sm:p-7" aria-labelledby="rodney-game-heading">
          <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.8fr)_auto] sm:items-start">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-primary">Rodney’s pot</p>
              <h2 id="rodney-game-heading" className="mt-2 flex min-h-20 flex-col items-start gap-y-1 font-display font-bold text-accent sm:min-h-24">
                <span className="whitespace-nowrap">{formatCoins(currentScoreTotalSilver)}</span>
              </h2>
            </div>
            <div className={`${championCelebrating ? 'rodney-champion-celebration' : ''} self-start sm:text-center`}>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Current champion</p>
              <p className="mt-1 truncate font-display text-2xl font-black leading-tight text-foreground sm:text-3xl">{state.current_champion}</p>
            </div>
            <FullscreenToggle className="inline-flex size-11 shrink-0 items-center justify-center self-start justify-self-end rounded-xl border border-border bg-background text-muted-foreground transition hover:border-primary/55 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>

          <div className="mt-6 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-5 text-center sm:px-5">
            <div className="rodney-dice-stage relative flex min-h-28 items-center justify-center overflow-hidden" aria-label={diceRolling ? 'Rodney is rolling the bones' : state.dice ? `Dice show ${state.dice[0]} and ${state.dice[1]}` : 'No dice have been rolled'}>
              <RodneyBones dice={state.dice} rolling={diceRolling} />
            </div>
            <p className="mt-3 min-h-6 font-semibold text-foreground" aria-live="polite">{diceRolling ? 'Rolling the bones…' : state.message}</p>

          </div>

          {state.phase === 'name_champion' ? (
            <form onSubmit={recordFortune} className="mt-6 scroll-mt-6 rounded-2xl border border-primary/35 bg-primary/5 p-5">
              <Trophy className="size-7 text-primary" aria-hidden="true" />
              <h3 className="mt-3 font-display text-2xl font-bold">Record your winnings</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Enter a name of no more than 12 characters for the public Roll of Fortune.</p>
              <div className="mt-4 flex gap-2">
                <label htmlFor="rodney-winner-name" className="sr-only">Winner name</label><input id="rodney-winner-name" ref={winnerInputRef} value={winnerName} onChange={(event) => setWinnerName(event.target.value.slice(0, MAX_WINNER_NAME))} maxLength={MAX_WINNER_NAME} className="min-w-0 flex-1 rounded-xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" placeholder="Enter winner name here" />
                <button type="submit" disabled={!winnerName.trim() || busy} className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-45">{busy ? 'Recording…' : 'Record'}</button>
              </div>
              <p className="mt-2 text-right font-mono text-xs text-muted-foreground">{winnerName.length}/{MAX_WINNER_NAME}</p>
            </form>
          ) : state.phase === 'extra_silver' ? (
            <div ref={doubleBetRef} className="scroll-mt-6 mt-6 rounded-2xl border border-accent/45 bg-accent/10 p-5 text-center" role="status">
              <Coins className="mx-auto size-7 text-accent" aria-hidden="true" />
              <h3 className="mt-3 font-display text-2xl font-bold">Double sixes!</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">The wager loses. Tymora’s Favor resets, and Rodney asks for one extra fictional silver piece before the next round.</p>
              <button type="button" onClick={() => void playAction('extra')} disabled={busy} className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-bold text-accent-foreground disabled:opacity-45">
                <Coins className="size-5" aria-hidden="true" />
                {busy ? 'Adding wager…' : 'Add the extra 1 sp wager'}
              </button>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-3">
              <button type="button" onClick={() => void playAction('play')} disabled={state.phase !== 'ready' || busy} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-lg font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">
                <Coins className="size-5" aria-hidden="true" />Wager 1 sp
              </button>
              <button type="button" onClick={() => void playAction('roll')} disabled={state.phase !== 'round_ready' || busy} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-accent px-5 text-lg font-bold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40">
                <Dices className="size-5" aria-hidden="true" />Roll the bones
              </button>
            </div>
          )}

          {error && <p className="mt-5 rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{error}</p>}
        </section>
      </div>

      <section className="rounded-3xl border border-border bg-card p-5 sm:p-7" aria-labelledby="rodney-ledger-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-primary">Fortune winners</p>
            <h2 id="rodney-ledger-heading" className="mt-2 font-display text-3xl font-bold">The Roll of Fortune</h2>
            <p className="mt-2 text-sm text-muted-foreground">{ledger.configured ? `${ledger.total.toLocaleString()} win${ledger.total === 1 ? '' : 's'} recorded across every browser.` : 'The local game is ready. Connect the shared ledger to begin recording site-wide champions.'}</p>
          </div>
          <div className="rounded-2xl border border-accent/35 bg-accent/10 px-4 py-3 text-sm">
            <span className="font-semibold text-muted-foreground">Biggest recorded win: </span>
            <span className="font-bold text-accent">{allTimeChampion ? `${allTimeChampion.name} · ${formatCoins(allTimeChampion.amount_silver)}` : 'No winner recorded yet'}</span>
          </div>
        </div>

        {ledgerLoading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground"><LoaderCircle className="size-5 animate-spin" aria-hidden="true" />Opening the ledger…</div>
        ) : ledger.entries.length === 0 ? (
          <p className="py-14 text-center text-sm text-muted-foreground">The Roll of Fortune is empty. The first recorded win will begin it.</p>
        ) : (
          <div className="mt-7 space-y-7">
            {bands.map((columns, bandIndex) => columns.some((column) => column.length > 0) && (
              <div key={bandIndex} className={bandIndex > 0 ? 'border-t border-accent/35 pt-7' : ''}>
                <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3 xl:grid-cols-6">
                  {columns.map((column, columnIndex) => column.length > 0 && (
                    <ol key={columnIndex} start={ledger.page * pageSize + bandIndex * BAND_SIZE + columnIndex * COLUMN_SIZE + 1} className="divide-y divide-border/65 border-y border-border/65">
                      {column.map((entry, rowIndex) => {
                        const rank = ledger.page * pageSize + bandIndex * BAND_SIZE + columnIndex * COLUMN_SIZE + rowIndex + 1
                        return (
                          <li key={entry.id} className="grid grid-cols-[1.9rem_minmax(0,1fr)] gap-2 px-1 py-1.5 text-sm">
                            <span className="font-mono font-bold text-primary">{rank}.</span>
                            <span className="min-w-0">
                              <span className="block truncate font-semibold leading-tight">{entry.name}</span>
                              <span className="block font-mono text-[10px] font-bold leading-tight text-accent">{formatCoins(entry.amount_silver)}</span>
                            </span>
                          </li>
                        )
                      })}
                    </ol>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {ledger.configured && pageCount > 1 && (
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={() => void loadLedger(Math.max(0, ledger.page - 1))} disabled={ledger.page === 0 || ledgerLoading} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold disabled:opacity-40"><ChevronLeft className="size-4" aria-hidden="true" />Previous</button>
            <span className="font-mono text-xs text-muted-foreground">Page {ledger.page + 1} of {pageCount}</span>
            <button type="button" onClick={() => void loadLedger(Math.min(pageCount - 1, ledger.page + 1))} disabled={ledger.page >= pageCount - 1 || ledgerLoading} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold disabled:opacity-40">Next<ChevronRight className="size-4" aria-hidden="true" /></button>
          </div>
        )}
      </section>
    </div>
  )
}

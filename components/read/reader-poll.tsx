'use client'

import { CheckCircle2, LoaderCircle, Send } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import type { ReaderFeeling, ReaderSchedule } from '@/lib/read/reader-poll'

const feelingOptions: Array<{ value: ReaderFeeling; label: string }> = [
  {
    value: 'not_for_me',
    label: 'It isn’t for me. I’ve read enough to know I’m not going to continue.',
  },
  {
    value: 'still_deciding',
    label: 'I’m still deciding. I’ve read some, and I plan to read more before I make up my mind.',
  },
  {
    value: 'enjoying',
    label: 'I’m enjoying it. I definitely plan to keep reading.',
  },
  {
    value: 'loving',
    label: 'I’m loving it. I’m ready for the next installment.',
  },
]

const scheduleOptions: Array<{ value: ReaderSchedule; label: string }> = [
  { value: 'once_weekly', label: 'Once a week' },
  { value: 'twice_weekly', label: 'Twice a week' },
  { value: 'three_times_weekly', label: 'Three times a week' },
]

export function ReaderPoll() {
  const [feeling, setFeeling] = useState<ReaderFeeling | null>(null)
  const [schedule, setSchedule] = useState<ReaderSchedule | null>(null)
  const [checking, setChecking] = useState(true)
  const [voted, setVoted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function checkVote() {
      try {
        const response = await fetch('/api/read/poll', { cache: 'no-store' })
        const payload = (await response.json().catch(() => ({}))) as { voted?: boolean }
        if (!cancelled && response.ok) setVoted(Boolean(payload.voted))
      } finally {
        if (!cancelled) setChecking(false)
      }
    }
    void checkVote()
    return () => { cancelled = true }
  }, [])

  function chooseFeeling(value: ReaderFeeling) {
    setFeeling(value)
    setError('')
    if (value === 'not_for_me') setSchedule(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!feeling || busy) return
    if (feeling !== 'not_for_me' && !schedule) {
      setError('Choose how often you would like me to post new installments.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/read/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeling, schedule }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string; already_voted?: boolean }
      if (response.status === 409 && payload.already_voted) {
        setVoted(true)
        return
      }
      if (!response.ok) throw new Error(payload.error || 'Your answers could not be recorded.')
      setVoted(true)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Your answers could not be recorded.')
    } finally {
      setBusy(false)
    }
  }

  if (checking) {
    return (
      <section className="mx-auto mt-10 max-w-6xl rounded-3xl border border-border bg-card p-7 text-center sm:p-10" aria-live="polite">
        <LoaderCircle className="mx-auto size-7 animate-spin text-primary" aria-hidden="true" />
        <p className="mt-3 text-sm text-muted-foreground">Checking the reader poll…</p>
      </section>
    )
  }

  if (voted) {
    return (
      <section className="mx-auto mt-10 max-w-6xl rounded-3xl border border-primary/35 bg-primary/5 p-7 text-center sm:p-10" aria-live="polite">
        <CheckCircle2 className="mx-auto size-9 text-primary" aria-hidden="true" />
        <h2 className="mt-4 font-display text-3xl font-bold">Thanks.</h2>
        <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-muted-foreground">I appreciate you taking the time to tell me.</p>
      </section>
    )
  }

  const needsSchedule = feeling !== null && feeling !== 'not_for_me'
  const readyToSubmit = Boolean(feeling && (!needsSchedule || schedule))

  return (
    <section className="mx-auto mt-10 max-w-6xl rounded-3xl border border-primary/35 bg-card p-6 sm:p-9" aria-labelledby="reader-poll-heading">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-primary">A quick question for readers</p>
      <h2 id="reader-poll-heading" className="mt-3 font-display text-3xl font-bold">What do you think so far?</h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">I’m curious. How are you feeling about <em>The Wardens of Waterdeep</em> so far?</p>

      <form onSubmit={submit} className="mt-7">
        <fieldset>
          <legend className="sr-only">How are you feeling about The Wardens of Waterdeep so far?</legend>
          <div className="grid gap-3">
            {feelingOptions.map((option) => (
              <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${feeling === option.value ? 'border-primary bg-primary/10' : 'border-border bg-background/50 hover:border-primary/45'}`}>
                <input
                  type="radio"
                  name="reader-feeling"
                  value={option.value}
                  checked={feeling === option.value}
                  onChange={() => chooseFeeling(option.value)}
                  className="mt-1 size-4 shrink-0 accent-current"
                />
                <span className="text-sm leading-7 text-foreground">{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {needsSchedule && (
          <fieldset className="mt-8 rounded-2xl border border-accent/35 bg-accent/5 p-5">
            <legend className="px-1 font-display text-xl font-bold">How often would you like me to post new installments?</legend>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {scheduleOptions.map((option) => (
                <label key={option.value} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 font-bold transition ${schedule === option.value ? 'border-accent bg-accent/15' : 'border-border bg-background/65 hover:border-accent/45'}`}>
                  <input
                    type="radio"
                    name="reader-schedule"
                    value={option.value}
                    checked={schedule === option.value}
                    onChange={() => { setSchedule(option.value); setError('') }}
                    className="size-4 shrink-0 accent-current"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <button type="submit" disabled={!readyToSubmit || busy} className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45">
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
          Send Brett my answers
        </button>

        {error && <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive" role="alert">{error}</p>}
      </form>
    </section>
  )
}

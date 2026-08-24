'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MotionSettingsControl, useMotionPreference } from '@/components/accessibility/motion-preference'

const FIRST_VISIT_DELAY_MS = 300_000
const MIN_REPEAT_DELAY_MS = 90_000
const MAX_REPEAT_DELAY_MS = 300_000
const VISIT_MS = 10_500
const LEGACY_CHANCE = 0.08

type FlightPath = 'left-right' | 'right-left' | 'top-bottom' | 'bottom-top'

function randomBetween(minimum: number, maximum: number) {
  return Math.round(minimum + Math.random() * (maximum - minimum))
}

function randomPath(): FlightPath {
  const paths: FlightPath[] = ['left-right', 'right-left', 'top-bottom', 'bottom-top']
  return paths[Math.floor(Math.random() * paths.length)]
}

function DragonVisit({ path, legacy, reducedMotion }: { path: FlightPath; legacy: boolean; reducedMotion: boolean }) {
  if (legacy) {
    return (
      <div className={`mistinarperadnacles-dragon mistinarperadnacles-path-${path} mistinarperadnacles-legacy ${reducedMotion ? 'mistinarperadnacles-reduced' : ''}`} aria-hidden="true">
        <img className="mistinarperadnacles-legacy-pose" src="/images/mistinarperadnacles-legacy.png" alt="" draggable={false} />
      </div>
    )
  }

  return (
    <div className={`mistinarperadnacles-dragon mistinarperadnacles-path-${path} ${reducedMotion ? 'mistinarperadnacles-reduced' : ''}`} aria-hidden="true">
      <img className="mistinarperadnacles-flight-pose" src="/images/mistinarperadnacles-flight-v2.png" alt="" draggable={false} />
      <img className="mistinarperadnacles-hover-pose" src="/images/mistinarperadnacles-hover-v2.png" alt="" draggable={false} />
    </div>
  )
}

export function Mistinarperadnacles({
  placement = 'page',
}: {
  placement?: 'page' | 'header'
} = {}) {
  const { reducedMotion } = useMotionPreference()
  const [visible, setVisible] = useState(false)
  const [path, setPath] = useState<FlightPath>('left-right')
  const [legacy, setLegacy] = useState(false)
  const [visitId, setVisitId] = useState(0)
  const [summonNotice, setSummonNotice] = useState('')
  const timerRef = useRef<number | null>(null)
  const leaveTimerRef = useRef<number | null>(null)
  const firstAutomaticVisitCompletedRef = useRef(false)

  function clearTimers() {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    if (leaveTimerRef.current !== null) window.clearTimeout(leaveTimerRef.current)
    timerRef.current = null
    leaveTimerRef.current = null
  }

  function scheduleVisit() {
    clearTimers()
    if (document.hidden) return
    const delay = firstAutomaticVisitCompletedRef.current
      ? randomBetween(MIN_REPEAT_DELAY_MS, MAX_REPEAT_DELAY_MS)
      : FIRST_VISIT_DELAY_MS
    timerRef.current = window.setTimeout(() => beginVisit(false), delay)
  }

  function beginVisit(manual: boolean) {
    clearTimers()
    setPath(manual ? (Math.random() < 0.5 ? 'left-right' : 'right-left') : randomPath())
    setLegacy(Math.random() < LEGACY_CHANCE)
    setVisitId((current) => current + 1)
    setVisible(true)
    setSummonNotice(manual ? (reducedMotion ? 'Mistinarperadnacles IV has been summoned without movement because motion is reduced.' : 'Mistinarperadnacles IV has been summoned.') : '')

    leaveTimerRef.current = window.setTimeout(() => {
      setVisible(false)
      setSummonNotice('')
      if (!manual) firstAutomaticVisitCompletedRef.current = true
      scheduleVisit()
    }, reducedMotion ? 4_000 : VISIT_MS)
  }

  useEffect(() => {
    scheduleVisit()
    const handleVisibility = () => {
      if (document.hidden) {
        clearTimers()
        setVisible(false)
      } else {
        scheduleVisit()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      clearTimers()
    }
    // scheduleVisit is intentionally tied to the current motion state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion])

  return (
    <>
      {placement === 'header' ? (
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-2 sm:flex-nowrap">
          <span className="size-2 shrink-0 rotate-45 border border-accent/65" aria-hidden="true" />

          <button
            type="button"
            onClick={() => beginVisit(true)}
            disabled={visible}
            className="inline-flex min-h-9 items-center whitespace-nowrap px-1 text-xs font-bold text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45 sm:text-sm"
          >
            Call Mistinarperadnacles IV
          </button>

          <span className="size-2 shrink-0 rotate-45 border border-accent/65" aria-hidden="true" />

          <MotionSettingsControl header />
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <MotionSettingsControl compact />
          <button
            type="button"
            onClick={() => beginVisit(true)}
            disabled={visible}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-200/45 bg-amber-100 px-5 py-2.5 text-sm font-bold text-[#38240f] shadow-lg transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Call Mistinarperadnacles IV
          </button>
        </div>
      )}
      <p className="sr-only" aria-live="polite">{summonNotice}</p>
      {visible && typeof document !== 'undefined' && createPortal(
        <div key={visitId} className="mistinarperadnacles-flight" role="status" aria-label="Mistinarperadnacles IV is visiting">
          <DragonVisit path={path} legacy={legacy} reducedMotion={reducedMotion} />
        </div>,
        document.body,
      )}
    </>
  )
}

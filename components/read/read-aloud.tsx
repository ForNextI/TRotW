'use client'

import { BookOpenText, Download, LoaderCircle, Pause, Play, Settings2, Upload, Volume2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  createContext,
  type ChangeEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useAccessibleDialog } from '@/components/accessibility/use-accessible-dialog'
import { takeSpeechChunks } from '@/lib/read/voice-streaming'
import {
  makeReadBookmark,
  normalizeReadAloudVoice,
  parseReadBookmark,
  READ_ALOUD_ENABLED_KEY,
  READ_ALOUD_VOICE_KEY,
  READ_BOOKMARK_KEY,
  type ReadAloudVoice,
} from '@/lib/read/reader-preferences'

interface RegisteredRelease {
  id: string
  title: string
  html: string
  nextReleaseId: string | null
}

type ReadAloudStatus = 'idle' | 'loading' | 'playing' | 'paused'

interface ReadAloudContextValue {
  enabled: boolean
  voice: ReadAloudVoice
  status: ReadAloudStatus
  currentReleaseId: string | null
  openOptions: () => void
  beginSetup: () => void
  togglePlayback: () => void
  registerRelease: (release: RegisteredRelease) => void
}

const ReadAloudContext = createContext<ReadAloudContextValue | null>(null)

function proseFromHtml(html: string) {
  if (typeof DOMParser === 'undefined') return ''
  const document = new DOMParser().parseFromString(html, 'text/html')
  const blocks = Array.from(document.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, li'))
    .map((element) => element.textContent?.replace(/\s+/g, ' ').trim() || '')
    .filter(Boolean)
  const text = blocks.length > 0 ? blocks.join('\n\n') : document.body.textContent || ''
  return text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

function typingKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest('textarea, [contenteditable="true"], [role="textbox"], input:not([type]), input[type="text"], input[type="search"], input[type="email"], input[type="url"], input[type="tel"], input[type="password"], input[type="number"]'))
}

function revokeObjectUrl(value: string | null) {
  if (value) URL.revokeObjectURL(value)
}

export function ReadAloudProvider({ catalogIds, children }: { catalogIds: string[]; children: ReactNode }) {
  const router = useRouter()
  const validReleaseIds = useMemo(() => new Set(catalogIds), [catalogIds])
  const [enabled, setEnabled] = useState(false)
  const [voice, setVoice] = useState<ReadAloudVoice>('male')
  const [status, setStatus] = useState<ReadAloudStatus>('idle')
  const [currentReleaseId, setCurrentReleaseId] = useState<string | null>(null)
  const [bookmarkReleaseId, setBookmarkReleaseId] = useState<string | null>(null)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [bookmarkNotice, setBookmarkNotice] = useState<string | null>(null)
  const releaseRef = useRef<RegisteredRelease | null>(null)
  const bookmarkReleaseIdRef = useRef<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const chunksRef = useRef<string[]>([])
  const chunkIndexRef = useRef(0)
  const generationRef = useRef(0)
  const desiredPlayingRef = useRef(false)
  const autoContinueRef = useRef(false)
  const abortControllersRef = useRef(new Set<AbortController>())
  const prefetchedRef = useRef(new Map<number, Promise<Blob>>())
  const enabledRef = useRef(false)
  const voiceRef = useRef<ReadAloudVoice>('male')
  const statusRef = useRef<ReadAloudStatus>('idle')
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const restoreInputRef = useRef<HTMLInputElement | null>(null)
  const closeOptions = useCallback(() => setOptionsOpen(false), [])
  const dialogRef = useAccessibleDialog<HTMLElement>({ open: optionsOpen, onClose: closeOptions, initialFocusRef: headingRef })

  useEffect(() => { enabledRef.current = enabled }, [enabled])
  useEffect(() => { voiceRef.current = voice }, [voice])
  useEffect(() => { statusRef.current = status }, [status])

  useEffect(() => {
    const storedVoice = normalizeReadAloudVoice(window.localStorage.getItem(READ_ALOUD_VOICE_KEY))
    const storedEnabled = window.localStorage.getItem(READ_ALOUD_ENABLED_KEY) === 'true'
    const storedBookmark = parseReadBookmark(window.localStorage.getItem(READ_BOOKMARK_KEY), validReleaseIds)
    voiceRef.current = storedVoice
    enabledRef.current = storedEnabled
    bookmarkReleaseIdRef.current = storedBookmark?.releaseId ?? null
    setVoice(storedVoice)
    setEnabled(storedEnabled)
    setBookmarkReleaseId(storedBookmark?.releaseId ?? null)

    const audio = new Audio()
    audio.preload = 'auto'
    audioRef.current = audio

    return () => {
      generationRef.current += 1
      desiredPlayingRef.current = false
      for (const controller of abortControllersRef.current) controller.abort()
      abortControllersRef.current.clear()
      audio.pause()
      audio.removeAttribute('src')
      revokeObjectUrl(objectUrlRef.current)
      objectUrlRef.current = null
      audioRef.current = null
    }
  }, [validReleaseIds])

  const storeBookmark = useCallback((releaseId: string, nextVoice = voiceRef.current, nextEnabled = enabledRef.current) => {
    if (!validReleaseIds.has(releaseId)) return
    const bookmark = makeReadBookmark(releaseId, nextVoice, nextEnabled)
    bookmarkReleaseIdRef.current = releaseId
    setBookmarkReleaseId(releaseId)
    window.localStorage.setItem(READ_BOOKMARK_KEY, JSON.stringify(bookmark))
  }, [validReleaseIds])

  const updateBookmarkPreferences = useCallback((nextVoice = voiceRef.current, nextEnabled = enabledRef.current) => {
    const releaseId = bookmarkReleaseIdRef.current
    if (!releaseId) return
    storeBookmark(releaseId, nextVoice, nextEnabled)
  }, [storeBookmark])

  const stopAudioWork = useCallback((resetPosition = true) => {
    generationRef.current += 1
    desiredPlayingRef.current = false
    autoContinueRef.current = false
    for (const controller of abortControllersRef.current) controller.abort()
    abortControllersRef.current.clear()
    prefetchedRef.current.clear()
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    revokeObjectUrl(objectUrlRef.current)
    objectUrlRef.current = null
    if (resetPosition) chunkIndexRef.current = 0
    setStatus('idle')
  }, [])

  const requestSpeech = useCallback(async (text: string, generation: number) => {
    if (generation !== generationRef.current) throw new DOMException('Reading stopped.', 'AbortError')
    const controller = new AbortController()
    abortControllersRef.current.add(controller)
    try {
      const response = await fetch('/api/read/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: voiceRef.current === 'female' ? 'marin' : 'fable', profile: 'reading' }),
        signal: controller.signal,
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string }
        throw new Error(payload.error || 'The Reading of the Wardens could not read this passage aloud.')
      }
      return response.blob()
    } finally {
      abortControllersRef.current.delete(controller)
    }
  }, [])

  const prefetchChunk = useCallback((index: number, generation: number) => {
    if (index < 0 || index >= chunksRef.current.length) return null
    const existing = prefetchedRef.current.get(index)
    if (existing) return existing
    const promise = requestSpeech(chunksRef.current[index], generation)
    prefetchedRef.current.set(index, promise)
    void promise.catch(() => undefined)
    return promise
  }, [requestSpeech])

  const finishRelease = useCallback(() => {
    const release = releaseRef.current
    if (!release || !desiredPlayingRef.current) {
      setStatus('idle')
      return
    }
    if (!release.nextReleaseId) {
      desiredPlayingRef.current = false
      setStatus('idle')
      setAnnouncement('You have reached the latest published release.')
      return
    }

    generationRef.current += 1
    for (const controller of abortControllersRef.current) controller.abort()
    abortControllersRef.current.clear()
    prefetchedRef.current.clear()
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
    }
    revokeObjectUrl(objectUrlRef.current)
    objectUrlRef.current = null
    chunkIndexRef.current = 0
    autoContinueRef.current = true
    setStatus('loading')
    setAnnouncement(`Continuing to release ${release.nextReleaseId}.`)
    router.push(`/read/toril/${release.nextReleaseId}`)
  }, [router])

  const playCurrentChunk = useCallback(async function playCurrentChunkInner(generation: number): Promise<void> {
    if (generation !== generationRef.current) return
    if (chunkIndexRef.current >= chunksRef.current.length) {
      finishRelease()
      return
    }

    const index = chunkIndexRef.current
    setStatus(desiredPlayingRef.current ? 'loading' : 'paused')
    try {
      const blob = await (prefetchChunk(index, generation) ?? Promise.reject(new Error('There is nothing to read.')))
      if (generation !== generationRef.current) return
      prefetchedRef.current.delete(index)
      prefetchChunk(index + 1, generation)
      if (!desiredPlayingRef.current) {
        setStatus('paused')
        return
      }

      const audio = audioRef.current
      if (!audio) return
      revokeObjectUrl(objectUrlRef.current)
      const objectUrl = URL.createObjectURL(blob)
      objectUrlRef.current = objectUrl
      audio.src = objectUrl
      audio.onended = () => {
        if (generation !== generationRef.current) return
        revokeObjectUrl(objectUrlRef.current)
        objectUrlRef.current = null
        chunkIndexRef.current += 1
        if (desiredPlayingRef.current) void playCurrentChunkInner(generation)
        else setStatus('paused')
      }
      audio.onerror = () => {
        if (generation !== generationRef.current) return
        desiredPlayingRef.current = false
        setStatus('idle')
        setError('The Reading of the Wardens could not play this part of the story. Reading stopped without skipping ahead.')
        setAnnouncement('Read Aloud stopped because the audio could not be played.')
      }
      await audio.play()
      if (generation === generationRef.current) {
        if (index === 0 && releaseRef.current) storeBookmark(releaseRef.current.id)
        setStatus('playing')
        setAnnouncement('Reading aloud.')
      }
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return
      if (generation !== generationRef.current) return
      desiredPlayingRef.current = false
      setStatus('idle')
      setError(caught instanceof Error ? caught.message : 'The Reading of the Wardens could not read the story aloud.')
      setAnnouncement('Read Aloud stopped because narration could not be generated.')
    }
  }, [finishRelease, prefetchChunk, storeBookmark])

  const startFromBeginning = useCallback(() => {
    const release = releaseRef.current
    if (!release) return
    const prose = proseFromHtml(release.html)
    const chunks = takeSpeechChunks(prose, true, { minimum: 300, maximum: 850 }).chunks
    if (chunks.length === 0) {
      setError('There is no readable story text in this release.')
      setAnnouncement('There is no readable story text in this release.')
      return
    }
    generationRef.current += 1
    const generation = generationRef.current
    for (const controller of abortControllersRef.current) controller.abort()
    abortControllersRef.current.clear()
    prefetchedRef.current.clear()
    revokeObjectUrl(objectUrlRef.current)
    objectUrlRef.current = null
    chunksRef.current = chunks
    chunkIndexRef.current = 0
    desiredPlayingRef.current = true
    setError(null)
    prefetchChunk(0, generation)
    prefetchChunk(1, generation)
    void playCurrentChunk(generation)
  }, [playCurrentChunk, prefetchChunk])

  const togglePlayback = useCallback(() => {
    if (!enabledRef.current) {
      setOptionsOpen(true)
      return
    }
    const audio = audioRef.current
    const currentStatus = statusRef.current
    if (currentStatus === 'idle') {
      const release = releaseRef.current
      const bookmarkId = bookmarkReleaseIdRef.current
      if (release && bookmarkId && bookmarkId !== release.id) {
        desiredPlayingRef.current = true
        autoContinueRef.current = true
        setStatus('loading')
        setAnnouncement(`Returning to your bookmark at release ${bookmarkId}.`)
        router.push(`/read/toril/${bookmarkId}`)
        return
      }
      startFromBeginning()
      return
    }
    if (currentStatus === 'playing' || currentStatus === 'loading') {
      desiredPlayingRef.current = false
      audio?.pause()
      setStatus('paused')
      setAnnouncement('Reading paused.')
      return
    }

    desiredPlayingRef.current = true
    if (audio?.src && audio.currentTime > 0 && !audio.ended) {
      void audio.play().then(() => {
        setStatus('playing')
        setAnnouncement('Reading resumed.')
      }).catch(() => {
        setStatus('paused')
        setError('Your browser would not resume the audio. Use Start reading to try again.')
      })
      return
    }
    const generation = generationRef.current
    void playCurrentChunk(generation)
  }, [playCurrentChunk, router, startFromBeginning])

  const registerRelease = useCallback((release: RegisteredRelease) => {
    const previousId = releaseRef.current?.id ?? null
    releaseRef.current = release
    setCurrentReleaseId(release.id)

    if (previousId && previousId !== release.id && !autoContinueRef.current) {
      stopAudioWork(true)
    }

    if (autoContinueRef.current) {
      autoContinueRef.current = false
      desiredPlayingRef.current = true
      window.requestAnimationFrame(() => startFromBeginning())
    }
  }, [startFromBeginning, stopAudioWork])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!enabledRef.current || event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return

      if (event.key === ' ' || event.code === 'Space') {
        if (typingKeyboardTarget(event.target)) return
        event.preventDefault()
        event.stopPropagation()
        togglePlayback()
        return
      }

      if (event.key === 'Enter' && statusRef.current !== 'idle') {
        if (typingKeyboardTarget(event.target)) return
        event.preventDefault()
        event.stopPropagation()
        stopAudioWork(true)
        setAnnouncement('Reading stopped. Press Space when you want to start again.')
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [stopAudioWork, togglePlayback])

  function chooseVoice(nextVoice: ReadAloudVoice) {
    const normalized = normalizeReadAloudVoice(nextVoice)
    if (normalized === voiceRef.current) return
    stopAudioWork(true)
    voiceRef.current = normalized
    setVoice(normalized)
    window.localStorage.setItem(READ_ALOUD_VOICE_KEY, normalized)
    updateBookmarkPreferences(normalized, enabledRef.current)
    setBookmarkNotice(null)
  }

  const beginReadAloudSetup = useCallback(() => {
    enabledRef.current = true
    setEnabled(true)
    window.localStorage.setItem(READ_ALOUD_ENABLED_KEY, 'true')
    window.localStorage.setItem(READ_ALOUD_VOICE_KEY, voiceRef.current)
    updateBookmarkPreferences(voiceRef.current, true)
    setBookmarkNotice(null)
    setAnnouncement('Read Aloud is ready. Press Space to start reading.')
    setOptionsOpen(true)
    const release = releaseRef.current
    const bookmarkId = bookmarkReleaseIdRef.current
    if (release && bookmarkId && bookmarkId !== release.id) {
      router.push(`/read/toril/${bookmarkId}`)
    }
  }, [router, updateBookmarkPreferences])

  function disableReadAloud() {
    stopAudioWork(true)
    enabledRef.current = false
    setEnabled(false)
    window.localStorage.setItem(READ_ALOUD_ENABLED_KEY, 'false')
    updateBookmarkPreferences(voiceRef.current, false)
    setAnnouncement('Read Aloud turned off.')
    setOptionsOpen(false)
  }

  function downloadBookmark() {
    const releaseId = bookmarkReleaseIdRef.current
    if (!releaseId) return
    const bookmark = makeReadBookmark(releaseId, voiceRef.current, enabledRef.current)
    const blob = new Blob([`${JSON.stringify(bookmark, null, 2)}\n`], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `TROTW-Bookmark-${releaseId}.json`
    link.click()
    URL.revokeObjectURL(url)
    setBookmarkNotice(`Bookmark ${releaseId} exported.`)
  }

  async function restoreBookmark(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const parsed = parseReadBookmark(await file.text(), validReleaseIds)
      if (!parsed) throw new Error('That file is not a valid reading bookmark for a published release.')
      stopAudioWork(true)
      voiceRef.current = parsed.voice
      enabledRef.current = parsed.readAloudEnabled
      setVoice(parsed.voice)
      setEnabled(parsed.readAloudEnabled)
      bookmarkReleaseIdRef.current = parsed.releaseId
      setBookmarkReleaseId(parsed.releaseId)
      window.localStorage.setItem(READ_ALOUD_VOICE_KEY, parsed.voice)
      window.localStorage.setItem(READ_ALOUD_ENABLED_KEY, String(parsed.readAloudEnabled))
      window.localStorage.setItem(READ_BOOKMARK_KEY, JSON.stringify(parsed))
      setBookmarkNotice(`Bookmark imported at release ${parsed.releaseId}. Opening it now.`)
      setAnnouncement(`Bookmark imported at release ${parsed.releaseId}.`)
      setOptionsOpen(false)
      router.push(`/read/toril/${parsed.releaseId}`)
    } catch (caught) {
      setBookmarkNotice(caught instanceof Error ? caught.message : 'That bookmark could not be imported.')
    }
  }

  function setBookmarkToCurrentRelease() {
    const releaseId = releaseRef.current?.id
    if (!releaseId) return
    storeBookmark(releaseId)
    setBookmarkNotice(`Bookmark set to release ${releaseId}.`)
    setAnnouncement(`Reading bookmark set to release ${releaseId}.`)
  }

  const value = useMemo<ReadAloudContextValue>(() => ({
    enabled,
    voice,
    status,
    currentReleaseId,
    openOptions: () => { setBookmarkNotice(null); setOptionsOpen(true) },
    beginSetup: beginReadAloudSetup,
    togglePlayback,
    registerRelease,
  }), [beginReadAloudSetup, currentReleaseId, enabled, registerRelease, status, togglePlayback, voice])

  return (
    <ReadAloudContext.Provider value={value}>
      {children}
      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
      {optionsOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOptionsOpen(false) }}>
          <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="read-aloud-heading" aria-describedby="read-aloud-description" className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-amber-900/45 bg-[#ead8ad] p-5 text-[#2a2115] shadow-2xl outline-none sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#7b5b2f]/12 text-[#6c4c24]"><Volume2 className="size-5" aria-hidden="true" /></span>
                <div>
                  <p className="font-mono text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#765b37]">Read Aloud</p>
                  <h2 ref={headingRef} tabIndex={-1} id="read-aloud-heading" className="mt-1 font-display text-3xl font-bold outline-none">Would you like me to read the novel to you?</h2>
                </div>
              </div>
              <button type="button" onClick={() => setOptionsOpen(false)} className="rounded-xl p-2 text-[#604a2c] transition hover:bg-[#d7bd86]/55" aria-label="Close Read Aloud options"><X className="size-5" aria-hidden="true" /></button>
            </div>

            <div id="read-aloud-description" className="mt-5 space-y-3 text-sm leading-7 text-[#604a2c] sm:text-base">
              <p>Choose a voice if you like. While Read Aloud is on, <strong className="text-[#2a2115]">Space</strong> plays or pauses the story. While narration is playing or paused, <strong className="text-[#2a2115]">Enter</strong> stops it.</p>
              <p>Those two keys keep the same jobs no matter which Read control you clicked last. Text-entry fields, if one is present, keep normal typing.</p>
              <p>If a release finishes while it is playing, Read Aloud continues to the next published release until you stop it or reach the newest one.</p>
            </div>

            <details className="group mt-5 rounded-2xl border border-[#7b5b2f]/35 bg-white/20">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 font-bold text-[#49351f]">
                A note about the quality of the reader
                <span className="text-lg text-[#765b37] transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
              </summary>
              <div className="space-y-3 border-t border-[#7b5b2f]/25 px-4 py-4 text-sm leading-6 text-[#604a2c]">
                <p>The current reader is useful, but it is not an audiobook-quality narrator. Its pace, pitch, and tone can shift while it reads, and fantasy names or unusual words may still be pronounced incorrectly.</p>
                <p>I have started teaching it recurring story names that consistently cause trouble, and I will keep adding pronunciations as I find them. That should improve those names, but this is still a generative reader, so a pronunciation may occasionally wander.</p>
                <p>If the site grows enough to support better options, I would love to improve the consistency further and perhaps someday offer higher-quality or professionally produced narration.</p>
              </div>
            </details>

            <fieldset className="mt-6 rounded-2xl border border-[#7b5b2f]/35 bg-white/25 p-4">
              <legend className="px-2 font-display text-xl font-bold">Voice</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${voice === 'male' ? 'border-[#7b5b2f] bg-white/45' : 'border-[#7b5b2f]/30 bg-white/15'}`}>
                  <input type="radio" name="read-aloud-voice" value="male" checked={voice === 'male'} onChange={() => chooseVoice('male')} className="mt-1 size-4 accent-[#7b5b2f]" />
                  <span><span className="block font-bold">Male voice <span className="font-normal text-[#604a2c]">(default)</span></span><span className="mt-1 block text-sm text-[#604a2c]">A clear, natural reading voice.</span></span>
                </label>
                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${voice === 'female' ? 'border-[#7b5b2f] bg-white/45' : 'border-[#7b5b2f]/30 bg-white/15'}`}>
                  <input type="radio" name="read-aloud-voice" value="female" checked={voice === 'female'} onChange={() => chooseVoice('female')} className="mt-1 size-4 accent-[#7b5b2f]" />
                  <span><span className="block font-bold">Female voice</span><span className="mt-1 block text-sm text-[#604a2c]">A clear, natural reading voice.</span></span>
                </label>
              </div>
            </fieldset>

            <section className="mt-6 rounded-2xl border border-[#7b5b2f]/35 bg-white/25 p-4" aria-labelledby="reading-bookmark-heading">
              <div className="flex items-start gap-3">
                <BookOpenText className="mt-0.5 size-5 shrink-0 text-[#6c4c24]" aria-hidden="true" />
                <div>
                  <h3 id="reading-bookmark-heading" className="font-display text-xl font-bold">Your reading bookmark</h3>
                  <p className="mt-1 text-sm leading-6 text-[#604a2c]">Read Aloud uses this bookmark to remember your listening place, but you can also use it as an ordinary reading bookmark without turning audio on. The site moves it when Read Aloud begins a release, or when you set it yourself. Browsing around Toril does not move it. The bookmark remembers the release, not the exact sentence, so returning starts at the top of that release.</p>
                  <p className="mt-2 text-sm leading-6 text-[#604a2c]">Export it if you want a tiny backup for another browser or device, then import it wherever you want to restore your place. Finer-grained bookmarks are something I would like to improve later if the site grows enough to support it.</p>
                  {bookmarkReleaseId ? <p className="mt-2 text-sm font-bold">Current bookmark: release {bookmarkReleaseId}</p> : <p className="mt-2 text-sm font-bold">No bookmark yet.</p>}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={setBookmarkToCurrentRelease} disabled={!currentReleaseId} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#7b5b2f]/40 bg-white/35 px-4 text-sm font-bold disabled:opacity-45"><BookOpenText className="size-4" aria-hidden="true" />Set my bookmark to this release</button>
                <button type="button" onClick={downloadBookmark} disabled={!bookmarkReleaseId} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#7b5b2f]/40 bg-white/35 px-4 text-sm font-bold disabled:opacity-45"><Download className="size-4" aria-hidden="true" />Export my bookmark</button>
                <button type="button" onClick={() => restoreInputRef.current?.click()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#7b5b2f]/40 bg-white/35 px-4 text-sm font-bold"><Upload className="size-4" aria-hidden="true" />Import my bookmark</button>
                <input ref={restoreInputRef} type="file" accept="application/json,.json" onChange={restoreBookmark} className="sr-only" aria-label="Choose a reading bookmark file to import" />
              </div>
              {bookmarkNotice && <p className="mt-3 text-sm font-semibold" role="status">{bookmarkNotice}</p>}
            </section>

            {error && <p className="mt-5 rounded-xl border border-red-800/35 bg-red-950/10 px-4 py-3 text-sm font-semibold text-red-950" role="alert">{error}</p>}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={disableReadAloud} className="min-h-11 rounded-xl border border-[#7b5b2f]/40 px-5 font-bold text-[#604a2c]">Turn Read Aloud off</button>
              <button type="button" onClick={() => setOptionsOpen(false)} className="min-h-11 rounded-xl bg-[#76501e] px-5 font-bold text-amber-50">Done</button>
            </div>
          </section>
        </div>
      )}
    </ReadAloudContext.Provider>
  )
}

function useReadAloud() {
  const context = useContext(ReadAloudContext)
  if (!context) throw new Error('Read Aloud controls must be used inside ReadAloudProvider.')
  return context
}

export function ReadAloudReleaseRegistrar({ release }: { release: RegisteredRelease }) {
  const { registerRelease } = useReadAloud()
  useEffect(() => {
    registerRelease(release)
  }, [registerRelease, release])
  return null
}

export function ReadAloudControl({ location }: { location: 'top' | 'bottom' }) {
  const { enabled, status, openOptions, beginSetup, togglePlayback } = useReadAloud()
  const placement = location === 'top' ? 'before the story' : 'after the story'

  if (!enabled) {
    return (
      <div className="flex justify-center py-4" aria-label={`Read Aloud controls ${placement}`}>
        <button type="button" onClick={beginSetup} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#7b5b2f]/40 bg-[#f0dfb7]/70 px-5 py-2.5 font-bold text-[#49351f] transition hover:bg-[#d7bd86]/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7b5b2f]">
          <Volume2 className="size-4" aria-hidden="true" />Read the novel to me, please.
        </button>
      </div>
    )
  }

  const actionLabel = status === 'playing' || status === 'loading'
    ? 'Pause reading'
    : status === 'paused'
      ? 'Continue reading'
      : 'Start reading'
  const ActionIcon = status === 'playing' || status === 'loading' ? Pause : Play

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 py-4" aria-label={`Read Aloud controls ${placement}`}>
      <button type="button" onClick={togglePlayback} aria-keyshortcuts="Space" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#76501e] px-5 py-2.5 font-bold text-amber-50 transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7b5b2f]">
        {status === 'loading' ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <ActionIcon className="size-4" aria-hidden="true" />}
        {actionLabel}
      </button>
      <button type="button" onClick={openOptions} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#7b5b2f]/40 bg-[#f0dfb7]/70 px-4 py-2.5 text-sm font-bold text-[#49351f] transition hover:bg-[#d7bd86]/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7b5b2f]">
        <Settings2 className="size-4" aria-hidden="true" />Options
      </button>
      <span className="sr-only">On this Toril story page, while Read Aloud is on, Space plays or pauses the story. While narration is playing or paused, Enter stops it, regardless of which Read control was used last. Text-entry fields keep normal typing.</span>
    </div>
  )
}

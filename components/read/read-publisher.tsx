'use client'

import { CheckCircle2, FileImage, FileText, LoaderCircle, ShieldCheck, UploadCloud } from 'lucide-react'
import { FormEvent, useEffect, useRef, useState } from 'react'

const SESSION_KEY = 'trotw-read-publisher-code:v1'
const MAX_COMBINED_UPLOAD_BYTES = 4 * 1024 * 1024

interface PublisherRelease {
  id: string
  canonicalId: string
  title: string
  book: number
  unit: number
  publishedAt: string
  wordCount: number
}

interface PreviewResponse {
  ok?: boolean
  release?: PublisherRelease
  html?: string
  warnings?: string[]
  image?: { title: string; publicPath: string } | null
  newBook?: boolean
  githubConfigured?: boolean
  publication?: { commitSha: string; commitUrl: string; branch: string; repository: string }
  message?: string
  error?: string
}

function DropZone({
  label,
  accept,
  file,
  icon,
  onFile,
}: {
  label: string
  accept: string
  file: File | null
  icon: 'document' | 'image'
  onFile: (file: File | null) => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const Icon = icon === 'document' ? FileText : FileImage

  function choose(files: FileList | null) {
    onFile(files?.[0] ?? null)
  }

  return (
    <div
      className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-7 text-center transition ${dragActive ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/60'}`}
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          inputRef.current?.click()
        }
      }}
      onDragEnter={(event) => { event.preventDefault(); setDragActive(true) }}
      onDragOver={(event) => { event.preventDefault(); setDragActive(true) }}
      onDragLeave={(event) => { event.preventDefault(); setDragActive(false) }}
      onDrop={(event) => {
        event.preventDefault()
        setDragActive(false)
        choose(event.dataTransfer.files)
      }}
    >
      <input ref={inputRef} type="file" accept={accept} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(event) => choose(event.target.files)} />
      <Icon className="size-12 text-primary" aria-hidden="true" />
      <p className="mt-5 font-display text-2xl font-bold">{label}</p>
      {file ? (
        <div className="mt-5 rounded-xl border border-primary/35 bg-primary/5 px-4 py-3">
          <p className="break-all font-mono text-sm font-bold text-primary">{file.name}</p>
          <button
            type="button"
            className="mt-2 text-xs font-bold text-muted-foreground underline hover:text-foreground"
            onClick={(event) => { event.stopPropagation(); onFile(null) }}
          >
            Remove file
          </button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Clicking the square opens the file picker too.</p>
      )}
    </div>
  )
}

export function ReadPublisher() {
  const [code, setCode] = useState('')
  const [authorized, setAuthorized] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [releaseFile, setReleaseFile] = useState<File | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [published, setPublished] = useState<PreviewResponse | null>(null)

  const [localImageUrl, setLocalImageUrl] = useState('')
  useEffect(() => {
    if (!imageFile) {
      setLocalImageUrl('')
      return
    }
    const url = URL.createObjectURL(imageFile)
    setLocalImageUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(SESSION_KEY) || ''
      if (stored) {
        setCode(stored)
        void authenticate(stored)
      }
    } catch {
      // The publisher still works when session storage is unavailable.
    }
    // Run once to restore the tab-local publisher code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function resetQa() {
    setPreview(null)
    setPublished(null)
    setError(null)
  }

  async function authenticate(publisherCode = code) {
    const cleanCode = publisherCode.trim()
    if (!cleanCode || busy) return
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/read/publisher', {
        headers: { 'x-trotw-publisher-code': cleanCode },
        cache: 'no-store',
      })
      const payload = (await response.json().catch(() => ({}))) as PreviewResponse
      if (!response.ok) throw new Error(payload.error || 'The Publisher could not be opened.')
      setAuthorized(true)
      try { window.sessionStorage.setItem(SESSION_KEY, cleanCode) } catch { /* tab storage is optional */ }
    } catch (authError) {
      setAuthorized(false)
      setError(authError instanceof Error ? authError.message : 'The Publisher could not be opened.')
    } finally {
      setBusy(false)
    }
  }

  function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void authenticate()
  }

  async function processPackage(action: 'preview' | 'publish') {
    if (!releaseFile || busy) return
    const combinedUploadBytes = releaseFile.size + (imageFile?.size || 0)
    if (combinedUploadBytes > MAX_COMBINED_UPLOAD_BYTES) {
      setError('The release unit and optional bonus image must total no more than 4 MB for the web publisher. Use the manual fallback for a larger package.')
      return
    }
    if (action === 'publish' && !window.confirm(`Publish ${preview?.release?.canonicalId || releaseFile.name} to the live repository?`)) return
    setBusy(true)
    setError(null)
    if (action === 'publish') setPublished(null)

    try {
      const formData = new FormData()
      formData.set('action', action)
      formData.set('release', releaseFile)
      if (imageFile) formData.set('image', imageFile)
      const response = await fetch('/api/read/publisher', {
        method: 'POST',
        headers: { 'x-trotw-publisher-code': code.trim() },
        body: formData,
      })
      const payload = (await response.json().catch(() => ({}))) as PreviewResponse
      if (!response.ok) throw new Error(payload.error || 'The release package could not be processed.')
      if (action === 'preview') setPreview(payload)
      else setPublished(payload)
    } catch (processError) {
      setError(processError instanceof Error ? processError.message : 'The release package could not be processed.')
    } finally {
      setBusy(false)
    }
  }

  if (!authorized) {
    return (
      <form onSubmit={submitCode} className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <ShieldCheck className="size-8 text-primary" aria-hidden="true" />
        <h1 className="mt-4 font-display text-3xl font-bold">Publisher</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Enter the separate Publisher code. It remains only in this browser tab.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="read-publisher-code" className="sr-only">Publisher code</label>
          <input id="read-publisher-code" type="password" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="off" className="min-h-12 flex-1 rounded-xl border border-input bg-background px-4 outline-none focus:ring-2 focus:ring-ring" placeholder="Publisher code" />
          <button type="submit" disabled={!code.trim() || busy} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-bold text-primary-foreground disabled:opacity-45">
            {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="size-4" aria-hidden="true" />}
            Open publisher
          </button>
        </div>
        {error && <p className="mt-4 rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{error}</p>}
      </form>
    )
  }

  return (
    <section aria-labelledby="read-publisher-heading">
      <div className="sr-only">
        <h1 id="read-publisher-heading">Publisher</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DropZone
          label="Drag and drop next release unit here."
          accept=".odt,application/vnd.oasis.opendocument.text"
          file={releaseFile}
          icon="document"
          onFile={(file) => { setReleaseFile(file); resetQa() }}
        />
        <DropZone
          label="Drag and drop next bonus image, if any, here."
          accept=".png,image/png"
          file={imageFile}
          icon="image"
          onFile={(file) => { setImageFile(file); resetQa() }}
        />
      </div>

      {error && <p className="mt-6 rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{error}</p>}

      {releaseFile && !preview && (
        <div className="mt-6 text-center">
          <button type="button" onClick={() => void processPackage('preview')} disabled={busy} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-bold text-primary-foreground disabled:opacity-45">
            {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <UploadCloud className="size-4" aria-hidden="true" />}
            Check release package
          </button>
        </div>
      )}

      {preview?.release && (
        <div className="mt-10 space-y-6">
          <section className="rounded-3xl border border-primary/35 bg-card p-6 sm:p-8">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-primary">QA preview</p>
            <h2 className="mt-2 font-display text-3xl font-bold">{preview.release.id} · {preview.release.title}</h2>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <p><span className="text-muted-foreground">Release ID:</span><br /><strong>{preview.release.id}</strong></p>
              <p><span className="text-muted-foreground">Book:</span><br /><strong>{preview.release.book}</strong></p>
              <p><span className="text-muted-foreground">Words:</span><br /><strong>{preview.release.wordCount.toLocaleString()}</strong></p>
              <p><span className="text-muted-foreground">Bonus image:</span><br /><strong>{preview.image?.title || 'None'}</strong></p>
            </div>
            {(preview.warnings?.length ?? 0) > 0 && (
              <div className="mt-5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm">
                {preview.warnings?.map((warning) => <p key={warning}>{warning}</p>)}
              </div>
            )}
            {!preview.githubConfigured && <p className="mt-5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm">Preview works, but GitHub publication is not configured yet.</p>}
          </section>

          {imageFile && localImageUrl && (
            <figure className="overflow-hidden rounded-3xl border border-border bg-card p-2">
              {/* A local blob URL is used only for Brett's pre-publication preview. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={localImageUrl} alt={preview.image?.title || 'Bonus-image preview'} className="h-auto w-full rounded-2xl" />
              <figcaption className="px-4 py-4 text-center font-display text-xl font-bold text-accent">{preview.image?.title}</figcaption>
            </figure>
          )}

          <article className="relative overflow-hidden rounded-[2rem] border border-amber-900/55 bg-[#e7d4a7] px-6 py-10 text-[#2a2115] shadow-[0_35px_90px_rgba(0,0,0,0.4)] sm:px-12 sm:py-14">
            <div className="border-b border-[#7b5b2f]/40 pb-7 text-center">
              <p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.25em] text-[#765b37]">Release {preview.release.id}</p>
              <h2 className="mt-3 font-display text-4xl font-bold sm:text-5xl">{preview.release.title}</h2>
            </div>
            <section className="wardens-reading-prose mx-auto max-w-2xl py-12 text-[1.08rem] leading-9 sm:text-[1.16rem] sm:leading-10" dangerouslySetInnerHTML={{ __html: preview.html || '' }} />
          </article>

          {!published ? (
            <div className="text-center">
              <button type="button" onClick={() => void processPackage('publish')} disabled={busy || !preview.githubConfigured} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-7 font-bold text-accent-foreground disabled:opacity-45">
                {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="size-4" aria-hidden="true" />}
                Approve and publish
              </button>
            </div>
          ) : (
            <div className="rounded-3xl border border-emerald-600/40 bg-emerald-600/10 p-6 text-center">
              <CheckCircle2 className="mx-auto size-9 text-emerald-600" aria-hidden="true" />
              <p className="mt-3 font-display text-2xl font-bold">Release committed</p>
              <p className="mt-2 text-sm text-muted-foreground">{published.message}</p>
              {published.publication?.commitUrl && <a href={published.publication.commitUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block font-bold text-primary underline">Open the GitHub commit</a>}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

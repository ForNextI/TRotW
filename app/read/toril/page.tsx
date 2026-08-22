import type { Metadata } from 'next'
import { ArrowLeft, BookOpenText } from 'lucide-react'
import Link from 'next/link'
import { Mistinarperadnacles } from '@/components/read/mistinarperadnacles'
import { getReleaseCatalog } from '@/lib/read/releases'
import { TorilEntryRedirect } from '@/components/read/toril-entry-redirect'

export const metadata: Metadata = {
  title: 'Toril · The Wardens of Waterdeep',
  description: 'The ad-free reading room for The Wardens of Waterdeep.',
}

export default async function TorilPage() {
  const catalog = await getReleaseCatalog()
  if (catalog.length) {
    return (
      <div className="medieval-page medieval-page--read flex min-h-screen items-center justify-center px-5 text-stone-100">
        <TorilEntryRedirect releaseIds={catalog.map((release) => release.id)} />
      </div>
    )
  }

  return (
    <div className="medieval-page medieval-page--read min-h-screen text-stone-100">
      <header className="relative z-20 border-b border-amber-200/10 bg-black/20 px-5 py-3 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <Link href="/read" className="inline-flex items-center gap-2 text-sm font-semibold rounded-lg border border-amber-200/35 bg-black/35 px-3 py-2 text-amber-100 transition hover:border-amber-200/60 hover:bg-black/50">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Read overview
          </Link>
          <Mistinarperadnacles />
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="px-4 py-8 sm:px-8 sm:py-12">
        <article className="relative z-10 mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-amber-900/55 bg-[#e7d4a7] px-6 py-10 text-[#2a2115] shadow-[0_35px_90px_rgba(0,0,0,0.55),inset_0_0_80px_rgba(92,58,19,0.16)] sm:px-12 sm:py-14">
          <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(77,48,16,0.35)_0.6px,transparent_0.6px)] [background-size:6px_6px]" aria-hidden="true" />
          <div className="relative text-center">
            <BookOpenText className="mx-auto size-9 text-[#754c1d]" aria-hidden="true" />
            <p className="mt-4 font-mono text-[0.65rem] font-bold uppercase tracking-[0.25em] text-[#765b37]">Reading room ready</p>
            <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">The shelves are waiting.</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#5b472e]">Publish the first release unit with the private Publisher. As soon as the catalog contains a release, this doorway will open directly into it.</p>
          </div>
        </article>
      </main>
    </div>
  )
}

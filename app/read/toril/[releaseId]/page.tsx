import type { Metadata } from 'next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Mistinarperadnacles } from '@/components/read/mistinarperadnacles'
import { ReadAloudControl, ReadAloudReleaseRegistrar } from '@/components/read/read-aloud'
import { ReadTableOfContents } from '@/components/read/read-table-of-contents'
import { ReaderPoll } from '@/components/read/reader-poll'
import { TrotwoodHeader } from '@/components/showcase/trotwood-header'
import { getReadBooks, getReadRelease, getReleaseCatalog, releaseLabel } from '@/lib/read/releases'

interface ReleasePageProps {
  params: Promise<{ releaseId: string }>
}

export async function generateStaticParams() {
  const catalog = await getReleaseCatalog()
  return catalog.map((release) => ({ releaseId: release.id }))
}

export async function generateMetadata({ params }: ReleasePageProps): Promise<Metadata> {
  const { releaseId } = await params
  const loaded = await getReadRelease(releaseId)
  if (!loaded) return { title: 'Release not found · The Wardens of Waterdeep' }
  return {
    title: `${loaded.release.title} · The Wardens of Waterdeep`,
    description: `${releaseLabel(loaded.release)} in the ad-free Toril reading room.`,
  }
}

export default async function ReleasePage({ params }: ReleasePageProps) {
  const { releaseId } = await params
  const loaded = await getReadRelease(releaseId)
  if (!loaded) return notFound()

  const { release, html, catalog } = loaded
  const books = await getReadBooks()
  const book = books.find((entry) => entry.book === release.book)
  const index = catalog.findIndex((entry) => entry.id === release.id)
  const previous = index > 0 ? catalog[index - 1] : null
  const next = index >= 0 && index < catalog.length - 1 ? catalog[index + 1] : null
  const beginning = catalog[0] ?? null

  return (
    <div id="top" className="medieval-page medieval-page--read min-h-screen text-stone-100">
      <TrotwoodHeader active="read" />

      <main id="main-content" tabIndex={-1} className="px-4 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto mb-4 flex max-w-4xl justify-end">
          <Mistinarperadnacles />
        </div>

        <article className="relative z-10 mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-amber-900/55 bg-[#e7d4a7] px-6 py-10 text-[#2a2115] shadow-[0_35px_90px_rgba(0,0,0,0.55),inset_0_0_80px_rgba(92,58,19,0.16)] sm:px-12 sm:py-14">
          <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(77,48,16,0.35)_0.6px,transparent_0.6px)] [background-size:6px_6px]" aria-hidden="true" />
          <div className="relative">
            <div className="border-b border-[#7b5b2f]/40 pb-7 text-center">
              <p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.28em] text-[#765b37]">{book?.label || `Book ${release.book}`}</p>
              <p className="mt-2 font-display text-2xl font-bold uppercase tracking-[0.04em] sm:text-3xl">{book?.title || `Book ${release.book}`}</p>
              <div className="mx-auto my-5 h-px max-w-xs bg-[#7b5b2f]/35" aria-hidden="true" />
              <p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.25em] text-[#765b37]">{releaseLabel(release)}</p>
              <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">{release.title}</h1>
              <p className="mt-2 text-sm text-[#604a2c]">{release.wordCount.toLocaleString()} words · Published {release.publishedAt}</p>
            </div>

            <nav className="mt-6 flex items-center justify-between gap-4 border-b border-[#7b5b2f]/40 pb-6" aria-label="Reading navigation at top">
              {previous ? (
                <Link href={`/read/toril/${previous.id}`} className="inline-flex items-center gap-2 rounded-xl border border-[#7b5b2f]/35 px-4 py-2 text-sm font-bold hover:bg-[#d7bd86]/55"><ChevronLeft className="size-4" aria-hidden="true" />Previous</Link>
              ) : <span className="inline-flex items-center gap-2 rounded-xl border border-[#7b5b2f]/20 px-4 py-2 text-sm font-bold opacity-40"><ChevronLeft className="size-4" aria-hidden="true" />Previous</span>}
              {beginning && beginning.id !== release.id ? (
                <Link href={`/read/toril/${beginning.id}`} className="rounded-xl border border-[#7b5b2f]/35 px-4 py-2 text-center text-sm font-bold hover:bg-[#d7bd86]/55">Beginning of Book One</Link>
              ) : <span className="rounded-xl border border-[#7b5b2f]/20 px-4 py-2 text-center text-sm font-bold opacity-40">Beginning of Book One</span>}
              {next ? (
                <Link href={`/read/toril/${next.id}`} aria-label={`Next update: ${next.title}`} className="inline-flex items-center gap-2 rounded-xl border border-[#7b5b2f]/35 px-4 py-2 text-sm font-bold hover:bg-[#d7bd86]/55">Next<ChevronRight className="size-4" aria-hidden="true" /></Link>
              ) : <span className="inline-flex items-center gap-2 rounded-xl border border-[#7b5b2f]/20 px-4 py-2 text-sm font-bold opacity-40">Next<ChevronRight className="size-4" aria-hidden="true" /></span>}
            </nav>

            <div className="mt-7">
              <ReadTableOfContents
                releases={catalog}
                books={books}
                currentReleaseId={release.canonicalId}
                defaultOpen={false}
                tone="reading-room"
              />
            </div>

            <ReadAloudReleaseRegistrar release={{ id: release.id, title: release.title, html, nextReleaseId: next?.id ?? null }} />
            <ReadAloudControl location="top" />

            <section
              data-protected-prose
              className="wardens-reading-prose mx-auto max-w-2xl py-12 text-[1.08rem] leading-9 sm:text-[1.16rem] sm:leading-10"
              dangerouslySetInnerHTML={{ __html: html }}
            />

            <ReadAloudControl location="bottom" />

            {release.canonicalId === '1.01' ? <ReaderPoll /> : null}

            <nav className="mt-8 flex items-center justify-between gap-4 border-t border-[#7b5b2f]/40 pt-6" aria-label="Reading navigation">
              {previous ? (
                <Link href={`/read/toril/${previous.id}`} className="inline-flex items-center gap-2 rounded-xl border border-[#7b5b2f]/35 px-4 py-2 text-sm font-bold hover:bg-[#d7bd86]/55">
                  <ChevronLeft className="size-4" aria-hidden="true" />Previous
                </Link>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-xl border border-[#7b5b2f]/20 px-4 py-2 text-sm font-bold opacity-40"><ChevronLeft className="size-4" aria-hidden="true" />Previous</span>
              )}
              {beginning && beginning.id !== release.id ? (
                <Link href={`/read/toril/${beginning.id}`} className="rounded-xl border border-[#7b5b2f]/35 px-4 py-2 text-center text-sm font-bold hover:bg-[#d7bd86]/55">Beginning of Book One</Link>
              ) : <span className="rounded-xl border border-[#7b5b2f]/20 px-4 py-2 text-center text-sm font-bold opacity-40">Beginning of Book One</span>}
              {next ? (
                <Link href={`/read/toril/${next.id}`} aria-label={`Next update: ${next.title}`} className="inline-flex items-center gap-2 rounded-xl border border-[#7b5b2f]/35 px-4 py-2 text-sm font-bold hover:bg-[#d7bd86]/55">
                  Next<ChevronRight className="size-4" aria-hidden="true" />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-xl border border-[#7b5b2f]/20 px-4 py-2 text-sm font-bold opacity-40">Next<ChevronRight className="size-4" aria-hidden="true" /></span>
              )}
            </nav>

            <nav className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm font-bold" aria-label="Reading page destinations">
              <a href="#top" className="rounded-xl border border-[#7b5b2f]/35 px-4 py-2 hover:bg-[#d7bd86]/55">Top of Page</a>
              <Link href={`/read/pix/book-${release.book}`} className="rounded-xl border border-[#7b5b2f]/35 px-4 py-2 hover:bg-[#d7bd86]/55">Gallery</Link>
              <Link href="/" className="rounded-xl border border-[#7b5b2f]/35 px-4 py-2 hover:bg-[#d7bd86]/55">Home</Link>
            </nav>

            <aside className="mt-8 border-t border-[#7b5b2f]/35 pt-6 text-center text-sm leading-relaxed text-[#604a2c]">
              <p><strong>Returning reader?</strong> Your bookmark moves when Read Aloud begins a release, or when you set it yourself in Options. Simply browsing Previous, Next, or the Table of Contents does not move it. The Wardens image on Home and Read returns to your bookmark; without one, it opens the latest published release.</p>
            </aside>
          </div>
        </article>
      </main>
    </div>
  )
}

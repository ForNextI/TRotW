import type { Metadata } from 'next'
import Image from 'next/image'
import { BellRing, BookOpenText, CalendarDays, Images, Info, Map } from 'lucide-react'
import Link from 'next/link'
import { SiteFooter } from '@/components/showcase/site-footer'
import { OwnerUtilityLink } from '@/components/owner/owner-utility-link'
import { ReaderPoll } from '@/components/read/reader-poll'
import { ReadTableOfContents } from '@/components/read/read-table-of-contents'
import { getReadBooks, getReadState, getReleaseCatalog } from '@/lib/read/releases'

export const metadata: Metadata = {
  title: 'Read · The Wardens of Waterdeep',
  description: 'Enter The Wardens of Waterdeep, an incredible and surprising fantasy saga in the Adventures with AI project.',
  alternates: { canonical: '/' },
}

export default async function ReadPage() {
  const [releases, books, readState] = await Promise.all([getReleaseCatalog(), getReadBooks(), getReadState()])
  const latest = releases.at(-1) ?? null
  const currentBook = books.find((book) => book.book === readState.currentBook) ?? books[0] ?? null
  const currentBookReleases = currentBook ? releases.filter((release) => release.book === currentBook.book) : releases
  const latestCurrentBookRelease = currentBookReleases.at(-1) ?? null
  const currentBonusImage = readState.currentBonusImage
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main id="main-content" tabIndex={-1}>
        <section className="px-5 py-12 sm:px-8 sm:py-16">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.58fr)] lg:items-center">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-primary">Read</p>
              <h1 className="mt-3 font-display text-5xl font-bold tracking-tight text-accent sm:text-7xl">The Wardens of Waterdeep</h1>
              <p className="mt-3 font-display text-2xl font-semibold italic text-foreground">Adventures with AI</p>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">A fantasy saga born from a D&amp;D 5.5e campaign in the Forgotten Realms.</p>
            </div>

            <Link
              href="/read/toril"
              aria-label="Enter Toril at your saved bookmark, or the latest release if this browser has no bookmark"
              className="overflow-hidden rounded-3xl border border-accent/35 bg-card p-2 shadow-2xl shadow-black/25 transition hover:border-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Image
                src="/images/wardens-hero.png"
                alt="The four Wardens together in Waterdeep"
                width={1536}
                height={1024}
                className="aspect-[3/2] h-auto w-full rounded-2xl object-cover"
              />
            </Link>
          </div>
        </section>

        <section className="px-5 pb-8 sm:px-8">
          <div className="mx-auto max-w-5xl rounded-3xl border border-accent/40 bg-[linear-gradient(145deg,rgba(227,173,64,0.17),rgba(31,35,46,0.92))] p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <BellRing className="mt-1 size-7 shrink-0 text-accent" aria-hidden="true" />
              <div>
                <p className="font-blackletter text-4xl leading-none text-accent sm:text-5xl">Hear ye, hear ye!</p>
                <p className="mt-5 max-w-4xl font-display text-lg leading-relaxed sm:text-xl">
                  Beyond this gate waits a saga, four unlikely Wardens, impossible bargains, public triumphs, private catastrophes, and consequences that have never once learned to remain politely buried. Step forward, traveler. Waterdeep waits, Toril turns, and the Wardens are already at work.
                </p>
              </div>
            </div>
          </div>
        </section>

        {currentBook && (
          <section className="px-5 pb-10 sm:px-8 sm:pb-14">
            <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-primary/35 bg-card shadow-2xl shadow-black/25">
              <Image
                src={currentBook.image.src}
                alt={currentBook.image.alt}
                width={1991}
                height={790}
                className="h-auto w-full object-contain"
                priority={false}
              />
              <div className="border-t border-primary/30 bg-black/90 px-5 py-5 text-white sm:px-8 sm:py-6">
                <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-amber-200">{currentBook.label}</p>
                <h2 className="mt-2 font-display text-3xl font-bold uppercase sm:text-4xl">{currentBook.title}</h2>
                {latestCurrentBookRelease ? (
                  <div className="mt-4 grid gap-1 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-6">
                    <p className="font-mono text-[0.68rem] font-bold uppercase tracking-[0.2em] text-amber-200">Latest release</p>
                    <Link href={`/read/toril/${latestCurrentBookRelease.id}`} className="font-display text-lg text-white/90 transition hover:text-white">
                      {latestCurrentBookRelease.id} · {latestCurrentBookRelease.title}
                    </Link>
                  </div>
                ) : null}
              </div>
              <p className="px-5 py-3 text-xs leading-relaxed text-muted-foreground sm:px-8">{currentBook.image.caption}</p>
            </div>
          </section>
        )}

        <section className="px-5 pb-10 sm:px-8 sm:pb-14" aria-label="Story table of contents">
          <div className="mx-auto max-w-6xl">
            <ReadTableOfContents releases={releases} books={books} defaultOpen={false} />
          </div>
        </section>

        {currentBonusImage && (
          <section className="px-5 pb-12 sm:px-8 sm:pb-16" aria-labelledby="current-bonus-image-heading">
            <div className="mx-auto max-w-6xl">
              <div className="flex flex-col items-center justify-center gap-2 text-center sm:flex-row sm:gap-5">
                <span className="hidden text-xl font-bold text-accent sm:inline" aria-hidden="true">↓</span>
                <div className="rounded-lg border border-amber-200/35 bg-[linear-gradient(180deg,#8a6428,#5f421d)] px-5 py-2 shadow-lg">
                  <h2 id="current-bonus-image-heading" className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-amber-100">Current Bonus Image</h2>
                </div>
                <span className="hidden text-xl font-bold text-accent sm:inline" aria-hidden="true">↓</span>
              </div>
              <p className="mt-3 text-center text-sm font-bold text-accent">↓ Keep going. The road begins below. ↓</p>
              <figure className="mt-4 overflow-hidden rounded-3xl border border-accent/35 bg-card p-2 shadow-2xl shadow-black/25">
                <Image src={currentBonusImage.src} alt={currentBonusImage.alt} width={currentBonusImage.width || 1536} height={currentBonusImage.height || 1024} className="h-auto w-full rounded-2xl" />
                <figcaption className="flex items-center gap-3 px-4 py-4">
                  <span className="min-w-0 flex-1 text-left font-display text-xl font-bold text-accent">{currentBonusImage.title}</span>
                  <Link href="/read/pix/book-1" className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:text-foreground">
                    <Images className="size-3.5" aria-hidden="true" />
                    Gallery
                  </Link>
                </figcaption>
              </figure>
            </div>
          </section>
        )}

        <section className="border-y border-border bg-card/30 px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.34fr)]">
            <article className="rounded-3xl border border-border bg-card p-6 sm:p-9">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-primary">A note before you enter</p>
              <h2 className="mt-3 font-display text-3xl font-bold">A note before you enter</h2>
              <div className="mt-5 space-y-5 text-base leading-8 text-muted-foreground">
                <p>
                  <em>The Wardens of Waterdeep</em>{' '}began with a more specific question than whether an AI could play Dungeons &amp; Dragons. AI could already run scenes, encounters, and short adventures surprisingly well. The real challenge was continuity. Could it carry four characters through a complete campaign, from first level to twentieth, across the limits of a single chat?
                </p>
                <p>
                  Once the characters and background were in place, there was a pause, and the AI asked: “Shall we?” “What?” “Play D&amp;D...” The next words on the screen were: <em>Rain slicked the road into black glass.</em>
                </p>
                <p>
                  That’s when I knew this was going to be fun. What followed was never planned as a novel. It emerged through choices, consequences, arguments, discoveries, unlikely victories, and moments neither the player nor the AI Game Master could have predicted. It was <em>so</em> much fun that I decided to share it.
                </p>
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/read/about" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-5 py-2.5 font-bold text-muted-foreground transition hover:text-foreground">
                  <Info className="size-4" aria-hidden="true" />
                  About this story
                </Link>
              </div>
            </article>

            <aside className="flex flex-col gap-5">
              {latest ? (
                <Link
                  href={`/read/toril/${latest.id}`}
                  className="group block rounded-2xl border border-primary/35 bg-primary/5 p-5 transition hover:border-primary/60 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Open latest update: ${latest.title} (${latest.id})`}
                >
                  <div className="flex items-center gap-2 text-primary">
                    <CalendarDays className="size-5" aria-hidden="true" />
                    <h2 className="font-display text-xl font-bold group-hover:underline">Latest update</h2>
                  </div>
                  <p className="mt-3 text-sm font-semibold">{latest.publishedAt}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{latest.title} ({latest.id}) is now available in the Toril reading room.</p>
                </Link>
              ) : (
                <div className="rounded-2xl border border-primary/35 bg-primary/5 p-5">
                  <div className="flex items-center gap-2 text-primary">
                    <CalendarDays className="size-5" aria-hidden="true" />
                    <h2 className="font-display text-xl font-bold">Latest update</h2>
                  </div>
                  <p className="mt-3 text-sm font-semibold">No release currently listed</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">The Toril reading room will show the next published release here as soon as it is available.</p>
                </div>
              )}

              <div className="rounded-2xl border border-border bg-card p-5">
                <BookOpenText className="size-6 text-accent" aria-hidden="true" />
                <h2 className="mt-3 font-display text-xl font-bold">Release Schedule</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Brett will be releasing one update every Friday for now, with an expectation of increasing that to three times a week in the future.</p>
              </div>
            </aside>
          </div>

          <ReaderPoll />

          <div className="mx-auto mt-10 max-w-6xl rounded-3xl border border-accent/40 bg-accent p-7 text-center text-accent-foreground sm:p-10">
            <Map className="mx-auto size-9" aria-hidden="true" />
            <h2 className="mt-4 font-display text-4xl font-bold">The road begins in Waterdeep.</h2>
            <p className="mx-auto mt-3 max-w-2xl leading-relaxed">{latest ? `Cross the threshold into the ad-free reading room. ${releases.length} release${releases.length === 1 ? '' : 's'} ${releases.length === 1 ? 'is' : 'are'} currently available.` : 'Cross the threshold into the ad-free reading room. Published releases will appear here when available.'}</p>
            <Link href="/read/toril" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-background px-7 py-3 font-display text-lg font-bold text-foreground transition-opacity hover:opacity-90">
              Read the Adventure Now
            </Link>
          </div>
        </section>

      </main>
      <SiteFooter utility={(
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
          <OwnerUtilityLink href="/read/poll-results" className="font-semibold text-muted-foreground transition-colors hover:text-foreground">
            Reader Poll Results
          </OwnerUtilityLink>
          <OwnerUtilityLink href="/read/publisher" className="font-semibold text-muted-foreground transition-colors hover:text-foreground">
            Read Publisher
          </OwnerUtilityLink>
        </div>
      )} />
    </div>
  )
}

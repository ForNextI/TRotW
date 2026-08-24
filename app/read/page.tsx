import type { Metadata } from 'next'
import Image from 'next/image'
import { BookOpenText, CalendarDays, Images, Info } from 'lucide-react'
import Link from 'next/link'
import { SiteFooter } from '@/components/showcase/site-footer'
import { TrotwoodHeader } from '@/components/showcase/trotwood-header'
import { OwnerUtilityLink } from '@/components/owner/owner-utility-link'
import { ReadTableOfContents } from '@/components/read/read-table-of-contents'
import { getReadBooks, getReadState, getReleaseCatalog } from '@/lib/read/releases'

export const metadata: Metadata = {
  title: 'Read · The Wardens of Waterdeep',
  description: 'Read The Wardens of Waterdeep, an epic fantasy adventure in the Forgotten Realms.',
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
      <TrotwoodHeader active="read" />
      <main id="main-content" tabIndex={-1}>
        <section className="px-5 pb-6 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
          <div className="mx-auto max-w-7xl">
            <h1 className="font-display text-[clamp(3.1rem,7.2vw,7.2rem)] font-bold leading-[0.9] tracking-[-0.035em] text-accent lg:whitespace-nowrap">
              The Wardens of Waterdeep
            </h1>

            <div className="mt-8 grid border-y border-border py-1 md:grid-cols-2">
              <div className="py-6 md:pr-8">
                <p className="font-display text-2xl font-bold leading-snug text-foreground sm:text-3xl">
                  An epic fantasy adventure in the <span className="text-primary">Forgotten Realms</span>.
                </p>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  No knowledge of the Forgotten Realms is required. Fans of the setting will find plenty to recognize.
                </p>
              </div>

              <div className="border-t border-border py-6 md:border-l md:border-t-0 md:pl-8">
                <p className="font-display text-2xl font-bold leading-snug text-foreground sm:text-3xl">
                  Adventures with AI
                </p>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  The Wardens of Waterdeep is a fantasy saga born from a D&amp;D 5.5e campaign played with an AI Game Master.
                </p>
              </div>
            </div>
          </div>
        </section>

        {currentBook && (
          <section className="px-5 pb-8 sm:px-8 sm:pb-8">
            <Link
              href="/read/toril"
              aria-label={`Read ${currentBook.label}: ${currentBook.title}`}
              className="group relative mx-auto block max-w-7xl overflow-hidden rounded-3xl border border-primary/35 bg-card shadow-2xl shadow-black/25 transition hover:border-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="absolute right-4 top-4 z-10 rounded-xl border border-amber-100/45 bg-black/80 px-4 py-2 font-mono text-xs font-black uppercase tracking-[0.16em] text-amber-100 shadow-lg sm:right-6 sm:top-6">
                Read Book One
              </div>
              <Image
                src={currentBook.image.src}
                alt={currentBook.image.alt}
                width={1991}
                height={790}
                className="h-auto w-full object-contain transition duration-300 group-hover:scale-[1.005]"
                priority={false}
              />
              <div className="border-t border-primary/30 bg-black/90 px-5 py-5 text-white sm:px-8 sm:py-6">
                <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-amber-200">{currentBook.label}</p>
                <h2 className="mt-2 font-display text-3xl font-bold uppercase sm:text-4xl">{currentBook.title}</h2>
                {latestCurrentBookRelease ? (
                  <div className="mt-4 grid gap-1 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-6">
                    <p className="font-mono text-[0.68rem] font-bold uppercase tracking-[0.2em] text-amber-200">Latest release</p>
                    <p className="font-display text-lg text-white/90">{latestCurrentBookRelease.id} · {latestCurrentBookRelease.title}</p>
                  </div>
                ) : null}
              </div>
              <p className="px-5 py-3 text-xs leading-relaxed text-muted-foreground sm:px-8">{currentBook.image.caption}</p>
            </Link>
          </section>
        )}

        <section className="px-5 pb-6 sm:px-8 sm:pb-6" aria-label="Story table of contents">
          <div className="mx-auto max-w-6xl">
            <ReadTableOfContents releases={releases} books={books} defaultOpen={false} />
          </div>
        </section>

        <section className="border-y border-border bg-card/30 px-5 py-8 sm:px-8 sm:py-8">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.34fr)]">
            <article className="rounded-3xl border border-border bg-card p-6 sm:p-9">
              <h2 className="font-display text-3xl font-bold">A note before you enter</h2>
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
              ) : null}

              <div className="rounded-2xl border border-border bg-card p-5">
                <BookOpenText className="size-6 text-accent" aria-hidden="true" />
                <h2 className="mt-3 font-display text-xl font-bold">Release Schedule</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Brett will be releasing one update every Friday for now, with an expectation of increasing that to three times a week in the future.</p>
              </div>
            </aside>
          </div>
        </section>

        {currentBonusImage && (
          <section className="px-5 py-8 sm:px-8 sm:py-8" aria-label="Latest bonus illustration">
            <div className="mx-auto mb-5 flex max-w-6xl justify-center">
              <div className="relative rounded-xl border border-amber-900/70 bg-gradient-to-b from-amber-200 via-amber-500 to-amber-700 px-8 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_6px_18px_rgba(0,0,0,0.28)]">
                <span className="absolute left-3 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-amber-950/70" aria-hidden="true" />
                <p className="font-display text-base font-black uppercase tracking-[0.18em] text-amber-950 sm:text-lg">
                  Latest Bonus Image
                </p>
                <span className="absolute right-3 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-amber-950/70" aria-hidden="true" />
              </div>
            </div>
            <figure className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-accent/35 bg-card p-2 shadow-2xl shadow-black/25">
              <Image src={currentBonusImage.src} alt={currentBonusImage.alt} width={currentBonusImage.width || 1536} height={currentBonusImage.height || 1024} className="h-auto w-full rounded-2xl" />
              <figcaption className="flex items-center gap-3 px-4 py-4">
                <span className="min-w-0 flex-1 text-left font-display text-xl font-bold text-accent">{currentBonusImage.title}</span>
                <Link href="/read/pix/book-1" className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:text-foreground">
                  <Images className="size-3.5" aria-hidden="true" />
                  Gallery
                </Link>
              </figcaption>
            </figure>
          </section>
        )}
      </main>
      <SiteFooter utility={(
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
          <OwnerUtilityLink href="/read/poll-results" className="font-semibold text-muted-foreground transition-colors hover:text-foreground">Reader Poll Results</OwnerUtilityLink>
          <OwnerUtilityLink href="/read/publisher" className="font-semibold text-muted-foreground transition-colors hover:text-foreground">Read Publisher</OwnerUtilityLink>
        </div>
      )} />
    </div>
  )
}

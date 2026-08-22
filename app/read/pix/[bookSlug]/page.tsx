import type { Metadata } from 'next'
import { ArrowLeft, ChevronLeft, ChevronRight, Images } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GalleryLightbox } from '@/components/read/gallery-lightbox'
import { SiteFooter } from '@/components/showcase/site-footer'
import { compareCanonicalReleaseIds, parseCanonicalReleaseId } from '@/lib/read/release-identifiers'
import { getReadBooks, getReadState, getReleaseCatalog } from '@/lib/read/releases'

interface GalleryPageProps {
  params: Promise<{ bookSlug: string }>
}

function parseBookSlug(value: string) {
  const match = value.match(/^book-([1-9]\d*)$/)
  return match ? Number(match[1]) : null
}

function publishedBookNumbers(releases: Awaited<ReturnType<typeof getReleaseCatalog>>) {
  return [...new Set(releases.map((release) => release.book))].sort((left, right) => left - right)
}

export async function generateStaticParams() {
  const releases = await getReleaseCatalog()
  const numbers = publishedBookNumbers(releases)
  return (numbers.length ? numbers : [1]).map((book) => ({ bookSlug: `book-${book}` }))
}

export async function generateMetadata({ params }: GalleryPageProps): Promise<Metadata> {
  const { bookSlug } = await params
  const bookNumber = parseBookSlug(bookSlug)
  const books = await getReadBooks()
  const book = books.find((entry) => entry.book === bookNumber)
  return {
    title: `${book?.label || `Book ${bookNumber || ''}`} Gallery · The Wardens of Waterdeep`,
    description: `Bonus art from ${book?.title || 'The Wardens of Waterdeep'}.`,
  }
}

export default async function GalleryPage({ params }: GalleryPageProps) {
  const { bookSlug } = await params
  const requestedBook = parseBookSlug(bookSlug)
  if (!requestedBook) return notFound()

  const [releases, books, state] = await Promise.all([getReleaseCatalog(), getReadBooks(), getReadState()])
  const publishedBooks = publishedBookNumbers(releases)
  const visibleBooks = publishedBooks.length ? publishedBooks : [1]
  if (!visibleBooks.includes(requestedBook)) return notFound()

  const book = books.find((entry) => entry.book === requestedBook)
  const images = state.bonusGallery
    .filter((image) => parseCanonicalReleaseId(image.canonicalReleaseId)?.book === requestedBook)
    .sort((left, right) => compareCanonicalReleaseIds(left.canonicalReleaseId, right.canonicalReleaseId))
  const releaseByCanonicalId = new Map(releases.map((release) => [release.canonicalId, release]))
  const otherBooks = visibleBooks.filter((bookNumber) => bookNumber !== requestedBook)
  const previousBook = visibleBooks.filter((bookNumber) => bookNumber < requestedBook).at(-1) ?? null
  const nextBook = visibleBooks.find((bookNumber) => bookNumber > requestedBook) ?? null

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main id="main-content" tabIndex={-1}>
        <section className="px-5 py-12 sm:px-8 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <Link href="/read" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to Read overview
            </Link>

            <div className="mt-8 flex items-start gap-4">
              <Images className="mt-1 size-8 shrink-0 text-accent" aria-hidden="true" />
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-primary">Gallery</p>
                <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-accent sm:text-6xl">
                  {book?.label || `Book ${requestedBook}`}
                </h1>
                {book?.title ? <p className="mt-2 font-display text-2xl font-semibold text-foreground">{book.title}</p> : null}
              </div>
            </div>

            {otherBooks.length > 0 ? (
              <nav className="mt-8 flex flex-wrap gap-3" aria-label="Published book galleries">
                {otherBooks.map((bookNumber) => {
                  const otherBook = books.find((entry) => entry.book === bookNumber)
                  return (
                    <Link
                      key={bookNumber}
                      href={`/read/pix/book-${bookNumber}`}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-5 py-2.5 font-display font-bold text-muted-foreground transition hover:text-foreground"
                    >
                      {otherBook?.label || `Book ${bookNumber}`}
                    </Link>
                  )
                })}
              </nav>
            ) : null}
          </div>
        </section>

        <section className="px-5 pb-16 sm:px-8 sm:pb-20" aria-label={`${book?.label || `Book ${requestedBook}`} bonus image gallery`}>
          <div className="mx-auto max-w-6xl">
            {images.length ? (
              <div className="grid gap-8 lg:grid-cols-2">
                {images.map((image) => {
                  const release = releaseByCanonicalId.get(image.canonicalReleaseId)
                  return (
                    <figure key={`${image.canonicalReleaseId}-${image.src}`} className="overflow-hidden rounded-3xl border border-accent/35 bg-card p-2 shadow-2xl shadow-black/20">
                      <GalleryLightbox
                        src={image.src}
                        alt={image.alt}
                        title={image.title}
                        width={image.width || 1536}
                        height={image.height || 1024}
                      />
                      <figcaption className="px-4 py-5 text-center">
                        <h2 className="font-display text-2xl font-bold text-accent">{image.title}</h2>
                        {release ? (
                          <Link href={`/read/toril/${release.id}`} className="mt-3 inline-flex text-sm font-bold text-muted-foreground transition hover:text-foreground">
                            Release {release.id} · {release.title}
                          </Link>
                        ) : null}
                      </figcaption>
                    </figure>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-border bg-card p-8 text-center sm:p-12">
                <Images className="mx-auto size-10 text-accent" aria-hidden="true" />
                <h2 className="mt-4 font-display text-3xl font-bold">The gallery is waiting for its first image.</h2>
                <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-muted-foreground">
                  When the Current Bonus Image is replaced by a new release image, it will take its place here.
                </p>
              </div>
            )}

            {(previousBook || nextBook) ? (
              <nav className="mt-10 flex items-center justify-between gap-4" aria-label="Adjacent published book galleries">
                {previousBook ? (
                  <Link href={`/read/pix/book-${previousBook}`} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 font-bold text-muted-foreground transition hover:text-foreground">
                    <ChevronLeft className="size-4" aria-hidden="true" />
                    Previous gallery
                  </Link>
                ) : <span />}
                {nextBook ? (
                  <Link href={`/read/pix/book-${nextBook}`} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 font-bold text-muted-foreground transition hover:text-foreground">
                    Next gallery
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Link>
                ) : <span />}
              </nav>
            ) : null}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

import { BookOpenText, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { compareCanonicalReleaseIds } from '@/lib/read/release-identifiers'
import type { ReadBook, ReadRelease } from '@/lib/read/releases'

interface ReadTableOfContentsProps {
  releases: ReadRelease[]
  books: ReadBook[]
  currentReleaseId?: string
  defaultOpen?: boolean
  tone?: 'site' | 'reading-room'
}

function bookLabel(bookNumber: number, books: ReadBook[]) {
  const book = books.find((entry) => entry.book === bookNumber)
  return {
    label: book?.label || `Book ${bookNumber}`,
    title: book?.title || '',
  }
}

export function ReadTableOfContents({
  releases,
  books,
  currentReleaseId,
  defaultOpen = true,
  tone = 'site',
}: ReadTableOfContentsProps) {
  const grouped = [...new Set(releases.map((release) => release.book))]
    .sort((left, right) => left - right)
    .map((bookNumber) => ({
      bookNumber,
      releases: releases
        .filter((release) => release.book === bookNumber)
        .sort((left, right) => compareCanonicalReleaseIds(left.canonicalId, right.canonicalId)),
      ...bookLabel(bookNumber, books),
    }))

  if (!grouped.length) return null

  const readingRoom = tone === 'reading-room'
  const shellClass = readingRoom
    ? 'border-[#7b5b2f]/45 bg-[#dbc48d]/35 text-[#2a2115]'
    : 'border-border bg-card text-foreground'
  const summaryClass = readingRoom
    ? 'border-[#7b5b2f]/35 text-[#2a2115] hover:bg-[#d7bd86]/45'
    : 'border-border text-foreground hover:bg-muted/35'
  const bookClass = readingRoom
    ? 'border-[#7b5b2f]/30 bg-[#ead8aa]/55'
    : 'border-border bg-background/35'
  const linkClass = readingRoom
    ? 'text-[#4e3b23] hover:bg-[#d7bd86]/55 hover:text-[#241a0d]'
    : 'text-muted-foreground hover:bg-muted/45 hover:text-foreground'
  const currentClass = readingRoom
    ? 'border-[#7b5b2f]/45 bg-[#c9a866]/45 text-[#241a0d]'
    : 'border-primary/40 bg-primary/10 text-foreground'

  return (
    <details className={`wardens-accordion overflow-hidden rounded-2xl border ${shellClass}`} open={defaultOpen}>
      <summary className={`flex cursor-pointer list-none items-center gap-3 border-b px-5 py-4 font-display text-xl font-bold transition sm:px-6 ${summaryClass}`}>
        <ChevronRight className="wardens-accordion-caret size-5 shrink-0 transition-transform" aria-hidden="true" />
        <BookOpenText className="size-5 shrink-0" aria-hidden="true" />
        Table of Contents
      </summary>

      <div className="space-y-3 p-4 sm:p-5">
        {grouped.map((group) => {
          const containsCurrent = group.releases.some((release) => release.id === currentReleaseId || release.canonicalId === currentReleaseId)
          return (
            <details key={group.bookNumber} className={`wardens-accordion overflow-hidden rounded-xl border ${bookClass}`} open={containsCurrent || (!currentReleaseId && group.bookNumber === grouped.at(-1)?.bookNumber)}>
              <summary className={`flex cursor-pointer list-none items-start gap-3 px-4 py-3 font-display font-bold transition sm:px-5 ${summaryClass}`}>
                <ChevronRight className="wardens-accordion-caret mt-0.5 size-4 shrink-0 transition-transform" aria-hidden="true" />
                <span>
                  <span>{group.label}</span>
                  {group.title ? <span className="font-normal">: {group.title}</span> : null}
                </span>
              </summary>

              <ol className="border-t border-black/10 px-3 py-3 sm:px-4">
                {group.releases.map((release) => {
                  const current = release.id === currentReleaseId || release.canonicalId === currentReleaseId
                  return (
                    <li key={release.canonicalId}>
                      <Link
                        href={`/read/toril/${release.id}`}
                        aria-current={current ? 'page' : undefined}
                        className={`my-1 flex min-h-10 items-start gap-3 rounded-lg border border-transparent px-3 py-2 text-sm leading-relaxed transition sm:text-base ${current ? currentClass : linkClass}`}
                      >
                        <span className="shrink-0 font-mono text-xs font-bold tracking-[0.08em] sm:text-sm">{release.id}</span>
                        <span className="font-display font-semibold">{release.title}</span>
                        {current ? <span className="ml-auto shrink-0 font-mono text-[0.62rem] font-bold uppercase tracking-[0.14em]">Current</span> : null}
                      </Link>
                    </li>
                  )
                })}
              </ol>
            </details>
          )
        })}
      </div>
    </details>
  )
}

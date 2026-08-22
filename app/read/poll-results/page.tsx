import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { ArrowLeft, KeyRound } from 'lucide-react'
import { ReaderPollResults } from '@/components/read/reader-poll-results'
import { SiteFooter } from '@/components/showcase/site-footer'
import { hasOwnerAccessCookieValue, OWNER_ACCESS_COOKIE } from '@/lib/site/server-access'

export const metadata: Metadata = {
  title: 'Reader Poll Results',
  robots: { index: false, follow: false },
}

export default async function ReaderPollResultsPage() {
  const cookieStore = await cookies()
  const ownerAccessActive = hasOwnerAccessCookieValue(cookieStore.get(OWNER_ACCESS_COOKIE)?.value)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main id="main-content" tabIndex={-1} className="px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <Link href="/read" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"><ArrowLeft className="size-4" aria-hidden="true" />Return to Read</Link>
          {ownerAccessActive ? (
            <ReaderPollResults />
          ) : (
            <section className="rounded-3xl border border-border bg-card p-6 sm:p-8" aria-labelledby="owner-access-required-heading">
              <KeyRound className="size-8 text-primary" aria-hidden="true" />
              <h1 id="owner-access-required-heading" className="mt-4 font-display text-3xl font-bold">Owner Access required</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">These are Brett’s private reader-poll results. Turn on Owner Access first, then come back here.</p>
              <Link href="/owner" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 font-bold text-primary-foreground">Open the Owner Access page</Link>
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

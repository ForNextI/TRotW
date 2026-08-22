import type { Metadata } from 'next'
import { BookOpenCheck } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Before entering the novel',
  robots: { index: false, follow: false },
}

function safeReturnPath(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value
  if (!candidate || !candidate.startsWith('/read/toril') || candidate.startsWith('//')) return '/read/toril'
  return candidate.slice(0, 500)
}

export default async function NovelAgeGatePage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string | string[]; declined?: string | string[] }>
}) {
  const params = await searchParams
  const declined = Array.isArray(params.declined) ? params.declined[0] : params.declined

  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(198,151,57,0.13),transparent_42%),linear-gradient(180deg,#11151d,#090b10)] px-5 py-12 text-stone-100">
      <section className="w-full max-w-2xl rounded-[2rem] border border-amber-200/20 bg-black/35 p-7 shadow-2xl sm:p-10" aria-labelledby="novel-age-title">
        <div className="flex items-center gap-3 text-amber-300">
          <span className="flex size-12 items-center justify-center rounded-2xl border border-amber-200/20 bg-amber-300/10">
            <BookOpenCheck className="size-6" aria-hidden="true" />
          </span>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.24em]">A note about the novel</p>
        </div>

        <h1 id="novel-age-title" className="mt-6 font-display text-4xl font-bold tracking-tight sm:text-5xl">The Wardens of Waterdeep is intended for readers 18 and older.</h1>
        <div className="mt-5 space-y-4 text-base leading-8 text-stone-300">
          <p>Most of the novel does not contain graphic violence or sexual material. It is not written as pornography, erotica, or a catalogue of gore.</p>
          <p>A small number of passages do contain unusually intense violence, adult sexual situations, and strong sexual language. Those moments are only a small part of the story, but they are present.</p>
          <p className="font-bold text-stone-100">For that reason, you must be 18 or older to continue into the novel.</p>
        </div>

        {declined === '1' && (
          <p className="mt-5 rounded-xl border border-amber-200/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100" role="status">
            The novel cannot admit readers under 18. You can return to the site overview.
          </p>
        )}

        <form action="/api/read-age-confirm" method="post" className="mt-8 space-y-3">
          <input type="hidden" name="return_to" value={safeReturnPath(params.return_to)} />
          <button type="submit" name="answer" value="yes" className="flex min-h-12 w-full items-center justify-center rounded-xl bg-amber-300 px-5 font-bold text-stone-950 transition hover:bg-amber-200">
            I am 18 or older. Enter the novel.
          </button>
          <a href="/read" className="flex min-h-12 w-full items-center justify-center rounded-xl border border-amber-300/70 bg-amber-300/10 px-5 font-bold text-amber-100 transition hover:bg-amber-300/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200">
            I am under 18. Return to the Read page.
          </a>
        </form>

        <p className="mt-5 text-xs leading-6 text-stone-400">
          The Reading of the Wardens records only this confirmation in a protected browser cookie. It does not ask for a birth date or identification. Clearing browser data, using another browser, or changing devices may make this notice return.
        </p>
      </section>
    </main>
  )
}

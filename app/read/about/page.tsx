import type { Metadata } from 'next'
import { ArrowLeft, BookOpenText } from 'lucide-react'
import Link from 'next/link'
import { SiteFooter } from '@/components/showcase/site-footer'

export const metadata: Metadata = {
  title: 'About the Story · The Wardens of Waterdeep',
  description: 'How a complete AI-run Dungeons & Dragons campaign became The Wardens of Waterdeep.',
}

export default function ReadAboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main id="main-content" tabIndex={-1} className="px-5 py-12 sm:px-8 sm:py-16">
        <article className="mx-auto max-w-4xl rounded-3xl border border-border bg-card p-6 shadow-2xl shadow-black/20 sm:p-10">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-primary">The Wardens of Waterdeep</p>
          <h1 className="mt-3 font-display text-4xl font-bold sm:text-6xl">About the Story</h1>

          <div className="mt-8 space-y-6 text-base leading-8 text-muted-foreground sm:text-lg">
            <p>
              So, yes, <em>The Wardens of Waterdeep</em> began as an experiment, not to discover whether an AI could run a Dungeons &amp; Dragons session, but whether it could sustain a complete campaign across many separate conversations. The answer was not simple.
            </p>
            <p>
              This is not a conventional fantasy novel. It is a translation of D&amp;D gameplay into literary prose, not simply a gameplay transcript, but a story-shaped account that follows the campaign as it actually happened. One overriding rule guided the novel project:
            </p>
            <blockquote className="rounded-2xl border-l-4 border-accent bg-accent/10 px-5 py-4 font-display text-xl font-semibold text-foreground">
              “Don’t tell a better story. Tell the story that happened as well as possible.”
            </blockquote>
            <p>
              Getting a chat AI to run an entire D&amp;D campaign was not easy. A single conversation lasts only so long, continuity is fragile, and the game had to be carried forward into each new chat. By the end, I had a database of supporting documents, a way to bring every new conversation up to speed, a “DM eyes only” file that kept secrets from me, and twenty-six increasingly long raw chats.
            </p>
            <p>
              To create the novel, I ran those chats through a series of prompts that functioned much like a compiler, producing the core prose. Then came the editing passes, removing drift, gameplay artifacts, raw-chat residue, inconsistencies in tone and style, and the other peculiar barnacles the process produced. There were eight rough drafts. The manuscript shrank from about 1,800 pages to about 1,000.
            </p>
            <p>
              The story is not plotted in the usual way. D&amp;D campaigns follow attention. Characters and factions that appear important may suddenly step out of the spotlight. A minor character may become essential. Episodic arcs come and go. A major villain might appear for only a single session. A joke may become doctrine. An adventure may stop for a long discussion of municipal government.
            </p>
            <p className="font-display text-2xl font-bold text-foreground">And the good guys tend to win.</p>
            <p>
              The AI DM generally rewarded imaginative solutions, elaborated enthusiastically on new ideas, and allowed success to generate still larger possibilities.
            </p>
            <p>
              What follows preserves the messy, beautiful shape of the campaign: strange turns, unexpected consequences, impossible jokes, sudden profundity, things no sane outline would have invented in advance, and an absurd number of ledgers. It is the record of a player and an artificial DM gradually learning how to play with one another.
            </p>
            <p className="font-display text-xl italic text-foreground">Some of the things the AI DM came up with... You’ll see.</p>
          </div>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/read" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/55 bg-primary/10 px-5 py-2.5 font-bold text-primary transition hover:border-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to Read
            </Link>
            <Link href="/read/toril" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-bold text-primary-foreground">
              <BookOpenText className="size-4" aria-hidden="true" />
              Take me to Toril
            </Link>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}

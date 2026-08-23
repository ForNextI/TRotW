import type { Metadata } from 'next'
import { BookOpen, Coins, Dices, Trophy } from 'lucide-react'
import Link from 'next/link'
import { RodneyGame } from '@/components/rodney/rodney-game'
import { OwnerUtilityLink } from '@/components/owner/owner-utility-link'
import { SiteFooter } from '@/components/showcase/site-footer'
import { TrotwoodHeader } from '@/components/showcase/trotwood-header'

export const metadata: Metadata = {
  title: 'Rodney · The Shrine to Tymora',
  description: 'Play Rodney, the fictional Tymoran gambling machine from The Wardens of Waterdeep. No real money is wagered or won.',
}

export default function RodneyPage() {
  return (
    <div className="medieval-page medieval-page--rodney min-h-screen text-foreground">
      <TrotwoodHeader active="rodney" />
      <main id="main-content" tabIndex={-1} className="px-5 py-12 sm:px-8 sm:py-16">
        <div className="medieval-page-panel mx-auto max-w-6xl rounded-3xl p-6 sm:p-10">
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-6xl">
            The Shrine to Tymora
          </h1>

          <p className="mt-5 max-w-4xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            In the foyer of Windstone sits Rodney the Pegacorn, a ridiculous little Shrine to Tymora that escaped from <em>The Wardens of Waterdeep</em> and became playable here. Put one fictional silver piece into Rodney’s pot, roll the bones, and gamble on Tymora’s favor. Double ones win the pot. Double twos through fives advance Tymora’s Favor; six qualifying doubles also win the pot. Double sixes reset Tymora’s Favor and demand one extra silver piece before play continues.
          </p>

          <div className="mt-5 max-w-4xl rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 text-sm leading-7 text-muted-foreground">
            <strong className="text-foreground">Rodney is fictional gambling from the novel.</strong> No real money is wagered, paid, won, or awarded. Every coin, bet, stake, pot, payout, and prize exists only inside this free game. A win earns only a public name and fictional winnings on the Roll of Fortune.
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-4"><Coins className="size-6 text-primary" aria-hidden="true" /><p className="mt-3 font-bold">Wager one silver piece</p></div>
            <div className="rounded-2xl border border-border bg-card p-4"><Dices className="size-6 text-primary" aria-hidden="true" /><p className="mt-3 font-bold">Roll the bones</p></div>
            <div className="rounded-2xl border border-border bg-card p-4"><Trophy className="size-6 text-primary" aria-hidden="true" /><p className="mt-3 font-bold">Win Rodney’s pot</p></div>
          </div>

          <div className="mt-8"><RodneyGame /></div>

          <section className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="rodney-roll-heading">
            <h2 id="rodney-roll-heading" className="font-display text-2xl font-bold">What is the Roll of Fortune?</h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-muted-foreground">The Roll of Fortune is Rodney’s site-wide winners ledger. Qualifying players may record a short public name beside the fictional pot they won. It is there for bragging rights, story flavor, and the pleasure of seeing how lavishly Tymora has smiled on somebody else.</p>
          </section>

          <section className="mt-8 flex flex-col gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <BookOpen className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="font-display font-bold">Who is Rodney, and where do these names come from?</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Rodney and many of the champion names come from <em>The Wardens of Waterdeep</em>.</p>
              </div>
            </div>
            <Link href="/" className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-primary px-4 font-bold text-primary-foreground">Meet them in the story</Link>
          </section>
        </div>
      </main>
      <SiteFooter utility={<OwnerUtilityLink href="/rodney/admin" className="text-xs text-muted-foreground underline decoration-border underline-offset-4 transition hover:text-foreground">Rodney Ledger</OwnerUtilityLink>} />
    </div>
  )
}

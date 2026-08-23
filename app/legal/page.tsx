import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Mail } from 'lucide-react'
import { SiteFooter } from '@/components/showcase/site-footer'

export const metadata: Metadata = {
  title: 'Legal & Fan Content',
  description: 'Fan-content, privacy, and rights information for The Reading of the Wardens.',
}

export default function LegalPage() {
  const contactEmail = process.env.NEXT_PUBLIC_RIGHTS_CONTACT_EMAIL?.trim() || ''
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main id="main-content" tabIndex={-1} className="px-5 py-12 sm:px-8 sm:py-16">
        <article className="mx-auto max-w-4xl rounded-3xl border border-border bg-card p-6 shadow-2xl shadow-black/20 sm:p-10">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"><ArrowLeft className="size-4" aria-hidden="true" />Return home</Link>
          <p className="mt-8 font-mono text-xs font-bold uppercase tracking-[0.22em] text-primary">The Reading of the Wardens</p>
          <h1 className="mt-3 font-display text-4xl font-bold sm:text-6xl">Legal &amp; Fan Content</h1>
          <div className="mt-9 space-y-10 text-base leading-8 text-muted-foreground">
            <section><h2 className="font-display text-2xl font-bold text-foreground">An independent fan project</h2><p className="mt-3">The Reading of the Wardens is an independent, unofficial fan site for <em>The Wardens of Waterdeep</em>. It is not sponsored, approved, or endorsed by Wizards of the Coast or Hasbro. Publisher names, game titles, settings, characters, artwork, logos, trademarks, and other intellectual property remain with their respective owners.</p></section>
            <section><h2 className="font-display text-2xl font-bold text-foreground">The novel</h2><p className="mt-3"><em>The Wardens of Waterdeep</em> began as a Dungeons &amp; Dragons campaign played collaboratively by a human player and an AI Game Master, then was transformed and edited into prose. This site presents that fan-created story and related bonus illustrations as a free reading project.</p></section>
            <section><h2 className="font-display text-2xl font-bold text-foreground">Rodney</h2><p className="mt-3">Rodney is a free fictional gambling game based on a device in <em>The Wardens of Waterdeep</em>. No real money is wagered, paid, won, or awarded. All coins, wagers, pots, winnings, scores, and prizes in Rodney are fictional and have no cash value.</p></section>
            <section><h2 className="font-display text-2xl font-bold text-foreground">Reader storage and poll</h2><p className="mt-3">The site may store small first-party browser preferences for the adult-content confirmation, Read Aloud settings, motion preferences, a reading bookmark, and whether this browser has already answered the reader poll. Reader-poll answers are stored as aggregate results in a private data store and are not intended to include a reader’s name or email address. The server may use a connection address transiently for basic abuse-rate limiting, but that address is not written into the poll results.</p></section>
            <section><h2 className="font-display text-2xl font-bold text-foreground">Read Aloud</h2><p className="mt-3">Read Aloud is optional. When a reader activates it, the selected passage of published story text is sent to an AI speech service so audio can be generated and returned to the browser. The site does not require a reader account to use the novel.</p></section>
            <section><h2 className="font-display text-2xl font-bold text-foreground">Age notice</h2><p className="mt-3">The novel is intended for readers 18 and older. Most of the story is not graphic or sexual, but a small number of passages contain unusually intense violence, adult sexual situations, or strong sexual language. The confirmation is stored in a protected browser cookie. The site does not ask for a birth date or identity document.</p></section>
            <section><h2 className="font-display text-2xl font-bold text-foreground">Rights-holder requests</h2><p className="mt-3">If a rights holder believes material on this site should be corrected or removed, please provide a clear description of the concern and the material involved.</p>{contactEmail ? <a href={`mailto:${contactEmail}`} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-primary/40 px-4 py-2.5 font-bold text-primary hover:bg-primary/5"><Mail className="size-4" aria-hidden="true" />{contactEmail}</a> : null}</section>
            <section className="rounded-2xl border border-border bg-background/60 p-5"><h2 className="font-display text-2xl font-bold text-foreground">Wizards Fan Content Notice</h2><p className="mt-3">The Reading of the Wardens is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.</p></section>
          </div>
          <p className="mt-10 border-t border-border pt-5 text-xs text-muted-foreground">Last updated: August 2026</p>
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}

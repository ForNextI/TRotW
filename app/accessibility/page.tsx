import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Accessibility } from 'lucide-react'
import { SiteFooter } from '@/components/showcase/site-footer'

export const metadata: Metadata = {
  title: 'Accessibility',
  description: 'Accessibility goals and feedback for The Reading of the Wardens.',
}

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main id="main-content" tabIndex={-1} className="px-5 py-12 sm:px-8 sm:py-16">
        <article className="mx-auto max-w-4xl rounded-3xl border border-border bg-card p-6 shadow-2xl shadow-black/20 sm:p-10">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"><ArrowLeft className="size-4" aria-hidden="true" />Return home</Link>
          <Accessibility className="mt-8 size-9 text-primary" aria-hidden="true" />
          <p className="mt-4 font-mono text-xs font-bold uppercase tracking-[0.22em] text-primary">Accessibility</p>
          <h1 className="mt-3 font-display text-4xl font-bold sm:text-6xl">Accessibility target: WCAG 2.2 Level AA</h1>
          <div className="mt-8 space-y-5 text-base leading-8 text-muted-foreground sm:text-lg">
            <p>The Reading of the Wardens targets WCAG 2.2 Level AA. The site includes keyboard access, screen-reader support, visible focus, meaningful labels and status messages, responsive reflow, selectable story text, reduced-motion controls, and accessible dialogs and forms.</p>
            <p>Accessibility is reviewed continuously. This statement is not a claim that every page and every possible state has passed a formal conformance audit. Interactive features such as Read Aloud, bookmarks, the reader poll, galleries, and the private Publisher still benefit from testing with real assistive technology and disabled users.</p>
            <p>I appreciate accessibility feedback. If something blocks you from reading or using the site, please include the page or feature, what happened, what you expected, and the browser or assistive technology you were using.</p>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}

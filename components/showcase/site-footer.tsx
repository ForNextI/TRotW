import Link from 'next/link'
import type { ReactNode } from 'react'
import { MotionSettingsControl } from '@/components/accessibility/motion-preference'
import { TROTW_RELEASE_LABEL } from '@/lib/site/version'

export function SiteFooter({ utility }: { utility?: ReactNode } = {}) {
  return (
    <footer className="border-t border-border px-5 py-7 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-4 text-xs leading-relaxed text-muted-foreground">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p>© {new Date().getFullYear()} dodo ink. Independent creative project.</p>
            <p className="mt-1 font-mono text-[11px]">{TROTW_RELEASE_LABEL}</p>
          </div>
          <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
            <MotionSettingsControl />
            <nav className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Site information">
              <Link className="transition-colors hover:text-foreground" href="/read/about">About the Story</Link>
              <Link className="transition-colors hover:text-foreground" href="/rodney">Rodney</Link>
              <Link className="transition-colors hover:text-foreground" href="/accessibility">Accessibility</Link>
              <Link className="transition-colors hover:text-foreground" href="/legal">Legal &amp; Fan Content</Link>
              <Link className="font-bold transition-colors hover:text-foreground" href="/">Home</Link>
            </nav>
          </div>
        </div>
        {utility && <div className="border-t border-border pt-4 sm:text-right">{utility}</div>}
        <p className="border-t border-border pt-4">
          The Reading of the Wardens is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
        </p>
      </div>
    </footer>
  )
}

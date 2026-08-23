import { BookOpenText } from 'lucide-react'
import Link from 'next/link'
import { FullscreenToggle } from '@/components/accessibility/fullscreen-toggle'

type TrotwoodHeaderProps = {
  active?: 'read' | 'rodney'
}

function navClass(active: boolean) {
  return [
    'inline-flex min-h-10 items-center justify-center rounded-xl border px-3 text-sm font-bold transition sm:px-4',
    active
      ? 'border-primary/50 bg-primary/10 text-primary'
      : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
  ].join(' ')
}

function NavDiamond() {
  return (
    <span
      className="size-2 shrink-0 rotate-45 border border-accent/65"
      aria-hidden="true"
    />
  )
}

export function TrotwoodHeader({ active }: TrotwoodHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 shadow-[0_8px_28px_rgba(0,0,0,0.22)] backdrop-blur-md">
      <div className="mx-auto flex min-h-14 max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-8">
        <Link
          href="/"
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg font-display font-bold tracking-wide text-accent transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Trotwood home"
        >
          <BookOpenText className="size-5 shrink-0" aria-hidden="true" />
          <span className="text-base sm:text-xl">Trotwood</span>
        </Link>

        <NavDiamond />

        <nav className="flex min-w-0 items-center gap-1 sm:gap-2" aria-label="Trotwood">
          <Link
            href="/"
            aria-current={active === 'read' ? 'page' : undefined}
            className={navClass(active === 'read')}
          >
            Read
          </Link>

          <NavDiamond />

          <Link
            href="/rodney"
            aria-current={active === 'rodney' ? 'page' : undefined}
            className={navClass(active === 'rodney')}
          >
            Rodney
          </Link>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <NavDiamond />
          <FullscreenToggle className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-background/70 text-muted-foreground transition hover:border-primary/55 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-10" />
        </div>
      </div>
    </header>
  )
}

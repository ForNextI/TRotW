import { BookOpenText } from 'lucide-react'
import Link from 'next/link'
import { FullscreenToggle } from '@/components/accessibility/fullscreen-toggle'
import { Mistinarperadnacles } from '@/components/read/mistinarperadnacles'

type TrotwoodHeaderProps = {
  active?: 'play' | 'shape' | 'read' | 'rodney'
  showMistControls?: boolean
}

function navClass(prominent = false) {
  return [
    'inline-flex min-h-10 items-center px-1 text-sm font-bold transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    prominent ? 'text-foreground' : 'text-muted-foreground',
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

const standardLinks = [
  { href: '/read/toril', label: 'Read', active: 'read' as const, prominent: true },
  { href: '/rodney', label: 'Rodney', active: 'rodney' as const, prominent: true },
  { href: '/play', label: 'Play', active: 'play' as const, prominent: false },
  { href: '/shape', label: 'Shape', active: 'shape' as const, prominent: false },
]

function TrotwoodBrand() {
  return (
    <Link
      href="/"
      className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg font-display font-bold tracking-wide text-accent transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Trotwood home"
    >
      <BookOpenText className="size-5 shrink-0" aria-hidden="true" />
      <span className="text-base sm:text-xl">Trotwood</span>
    </Link>
  )
}

export function TrotwoodHeader({ active, showMistControls = false }: TrotwoodHeaderProps) {
  // The published reading room keeps the 2.1 header exactly focused on
  // Trotwood + Mist/Motion + Read/Rodney/fullscreen.
  if (showMistControls) {
    return (
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 shadow-[0_8px_28px_rgba(0,0,0,0.22)] backdrop-blur-md">
        <div className="mx-auto grid min-h-14 max-w-7xl grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 px-3 py-2 sm:px-8 md:grid-cols-[auto_minmax(0,1fr)_auto]">
          <div className="col-start-1 row-start-1">
            <TrotwoodBrand />
          </div>

          <div className="col-span-2 row-start-2 flex min-w-0 items-center justify-center md:col-span-1 md:col-start-2 md:row-start-1">
            <Mistinarperadnacles placement="header" />
          </div>

          <div className="col-start-2 row-start-1 ml-auto flex shrink-0 items-center gap-2 sm:gap-3 md:col-start-3">
            <NavDiamond />

            <nav className="flex items-center gap-2 sm:gap-3" aria-label="Trotwood">
              <Link
                href="/read/toril"
                aria-current={active === 'read' ? 'page' : undefined}
                className={navClass()}
              >
                Read
              </Link>

              <NavDiamond />

              <Link
                href="/rodney"
                aria-current={active === 'rodney' ? 'page' : undefined}
                className={navClass()}
              >
                Rodney
              </Link>
            </nav>

            <NavDiamond />

            <FullscreenToggle className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-background/70 text-muted-foreground transition hover:border-primary/55 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-10" />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 shadow-[0_8px_28px_rgba(0,0,0,0.22)] backdrop-blur-md">
      <div className="mx-auto grid min-h-14 max-w-7xl grid-cols-[auto_auto] items-center gap-x-3 gap-y-1 px-3 py-2 sm:px-8 md:grid-cols-[auto_1fr]">
        <div className="col-start-1 row-start-1">
          <TrotwoodBrand />
        </div>

        <div className="col-start-2 row-start-1 ml-auto md:hidden">
          <FullscreenToggle className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-background/70 text-muted-foreground transition hover:border-primary/55 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>

        <div className="col-span-2 row-start-2 flex min-w-0 items-center justify-center pt-1 md:col-span-1 md:col-start-2 md:row-start-1 md:justify-end md:pt-0">
          <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1" aria-label="Trotwood">
            {standardLinks.map((link) => (
              <span key={link.href} className="inline-flex items-center gap-3">
                <NavDiamond />
                <Link
                  href={link.href}
                  aria-current={active === link.active ? 'page' : undefined}
                  className={navClass(link.prominent)}
                >
                  {link.label}
                </Link>
              </span>
            ))}
            <NavDiamond />
          </nav>

          <div className="ml-3 hidden md:block">
            <FullscreenToggle className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-background/70 text-muted-foreground transition hover:border-primary/55 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
        </div>
      </div>
    </header>
  )
}

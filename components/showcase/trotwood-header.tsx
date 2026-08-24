import Image from 'next/image'
import Link from 'next/link'
import { FullscreenToggle } from '@/components/accessibility/fullscreen-toggle'
import { Mistinarperadnacles } from '@/components/read/mistinarperadnacles'

type TrotwoodHeaderProps = {
  active?: 'play' | 'shape' | 'read' | 'rodney'
  showMistControls?: boolean
}

function navClass(emphasized = false) {
  return `inline-flex min-h-10 items-center px-1 text-sm font-bold ${
    emphasized ? 'text-foreground' : 'text-muted-foreground'
  } transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
}

function NavDiamond() {
  return (
    <span
      className="size-2 shrink-0 rotate-45 border border-accent/65"
      aria-hidden="true"
    />
  )
}

function SupportButton() {
  return (
    <a
      href="https://ko-fi.com/dodoink"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-9 items-center rounded-xl border border-accent/70 bg-background/70 px-3 text-sm font-bold text-accent transition hover:border-primary hover:bg-accent/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Support The Reading of the Wardens on Ko-fi (opens in a new tab)"
    >
      Support
    </a>
  )
}

const standardLinks = [
  { href: '/read/toril', label: 'Read', active: 'read' as const, emphasized: true },
  { href: '/rodney', label: 'Rodney', active: 'rodney' as const, emphasized: true },
  { href: '/play', label: 'Play', active: 'play' as const, emphasized: false },
  { href: '/shape', label: 'Shape', active: 'shape' as const, emphasized: false },
]

function TrotwoodBrand() {
  return (
    <Link
      href="/"
      className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg font-display font-bold tracking-wide text-accent transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="The Reading of the Wardens home"
    >
      <Image src="/images/wardens-sigil-64.png" alt="" width={20} height={20} className="size-5 shrink-0" aria-hidden="true" />
      <span className="text-base sm:text-xl">TRotW</span>
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

            <nav className="flex items-center gap-2 sm:gap-3" aria-label="The Reading of the Wardens">
              <Link
                href="/read/toril"
                aria-current={active === 'read' ? 'page' : undefined}
                className={navClass(true)}
              >
                Read
              </Link>

              <NavDiamond />

              <Link
                href="/rodney"
                aria-current={active === 'rodney' ? 'page' : undefined}
                className={navClass(true)}
              >
                Rodney
              </Link>

              <NavDiamond />

              <SupportButton />
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
          <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1" aria-label="The Reading of the Wardens">
            {standardLinks.map((link) => (
              <span key={link.href} className="inline-flex items-center gap-3">
                <NavDiamond />
                <Link
                  href={link.href}
                  aria-current={active === link.active ? 'page' : undefined}
                  className={navClass(link.emphasized)}
                >
                  {link.label}
                </Link>
              </span>
            ))}
            <NavDiamond />
            <SupportButton />
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

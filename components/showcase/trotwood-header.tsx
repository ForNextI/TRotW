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

function KoFiCup() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5 shrink-0"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#72A5F2"
        fillRule="evenodd"
        d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zM18.992 12.937c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z"
      />
      <path
        fill="#FF5E5B"
        d="M12.819 12.459c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311z"
      />
    </svg>
  )
}

function SupportButton() {
  return (
    <a
      href="https://ko-fi.com/dodoink"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-9 max-w-[7.5rem] items-center justify-center gap-1.5 rounded-xl border border-accent/70 bg-background/70 px-2.5 py-1 text-center text-sm font-bold leading-tight text-accent transition hover:border-primary hover:bg-accent/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-none sm:px-3"
      aria-label="Buy Brett a Coffee on Ko-fi (opens in a new tab)"
    >
      <KoFiCup />
      <span>Buy Brett a Coffee</span>
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

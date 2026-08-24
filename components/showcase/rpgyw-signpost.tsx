import Image from 'next/image'
import { TrotwoodHeader } from '@/components/showcase/trotwood-header'

type SignpostKind = 'play' | 'shape'

const content = {
  play: {
    title: 'Play',
    question: 'Looking for the AI Game Master?',
    answer: 'Play lives at RPG Your Way.',
    cta: 'Go to RPG Your Way Play',
    href: 'https://www.rpgyourway.com/play',
  },
  shape: {
    title: 'Shape',
    question: 'Looking for transcript conversion?',
    answer: 'Shape lives at RPG Your Way.',
    cta: 'Go to RPG Your Way Shape',
    href: 'https://www.rpgyourway.com/shape',
  },
} satisfies Record<SignpostKind, {
  title: string
  question: string
  answer: string
  cta: string
  href: string
}>

export function RpgYourWaySignpost({ kind }: { kind: SignpostKind }) {
  const page = content[kind]

  return (
    <div className="min-h-screen bg-[#ead8b7] text-[#13271f]">
      <TrotwoodHeader active={kind} />

      <main id="main-content" tabIndex={-1} className="px-3 py-4 sm:px-6 sm:py-6">
        <section
          className="relative mx-auto flex min-h-[calc(100svh-6.5rem)] w-full max-w-6xl overflow-hidden rounded-[2.25rem] border-[5px] border-[#07553a] bg-[#ead8b7] shadow-[0_24px_70px_rgba(33,24,12,0.28)] sm:rounded-[2.75rem] sm:border-[7px]"
          aria-labelledby={`${kind}-signpost-title`}
        >
          <div className="absolute inset-0 bg-[#ead8b7]" aria-hidden="true" />

          <Image
            src="/images/rpgyw-signpost-map.png"
            alt=""
            fill
            sizes="100vw"
            className="object-contain opacity-40 sepia-[0.28] saturate-[0.62] brightness-[1.08] contrast-[0.88] md:object-cover"
            aria-hidden="true"
          />

          <div className="absolute inset-0 bg-[#f2dfbc]/35" aria-hidden="true" />

          <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center justify-center px-5 py-8 text-center sm:px-10 sm:py-12">
            <Image
              src="/images/rpgyw-logo.png"
              alt="RPG Your Way"
              width={1254}
              height={1254}
              className="h-auto w-36 rounded-2xl border-2 border-[#07553a] shadow-[0_10px_30px_rgba(20,44,31,0.18)] sm:w-44 md:w-48"
              priority
            />

            <div className="mt-7 flex w-full items-center gap-3 sm:mt-9 sm:gap-5">
              <span className="h-px flex-1 bg-[#07553a]/55" aria-hidden="true" />
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f3e4c6]/80 p-1 shadow-sm sm:size-9">
                <Image src="/images/rpgyw-compass.png" alt="" width={512} height={512} className="h-full w-full" aria-hidden="true" />
              </span>
              <h1
                id={`${kind}-signpost-title`}
                className="font-display text-[clamp(3.6rem,14vw,7.5rem)] font-bold leading-none tracking-[-0.04em] text-[#07553a]"
              >
                {page.title}
              </h1>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f3e4c6]/80 p-1 shadow-sm sm:size-9">
                <Image src="/images/rpgyw-compass.png" alt="" width={512} height={512} className="h-full w-full" aria-hidden="true" />
              </span>
              <span className="h-px flex-1 bg-[#07553a]/55" aria-hidden="true" />
            </div>

            <div className="mt-6 h-px w-40 bg-[#07553a]/35 sm:w-56" aria-hidden="true" />

            <p className="mt-6 font-display text-2xl font-bold leading-tight text-[#07553a] sm:text-3xl">
              {page.question}
            </p>
            <p className="mt-3 text-lg font-medium leading-relaxed text-[#2b302c] sm:text-2xl">
              {page.answer}
            </p>

            <a
              href={page.href}
              className="mt-8 inline-flex min-h-14 w-full max-w-xl items-center justify-center gap-3 rounded-2xl border-2 border-[#c6a969] bg-[#07553a] px-5 py-3 font-display text-lg font-bold text-[#fff8e8] shadow-[0_10px_24px_rgba(20,55,39,0.3),inset_0_0_0_2px_rgba(255,255,255,0.08)] transition hover:bg-[#06452f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#07553a]/35 sm:min-h-16 sm:text-2xl"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f5e5c7] p-1.5 sm:size-10">
                <Image src="/images/rpgyw-compass.png" alt="" width={512} height={512} className="h-full w-full" aria-hidden="true" />
              </span>
              <span>{page.cta}</span>
            </a>
          </div>
        </section>
      </main>
    </div>
  )
}

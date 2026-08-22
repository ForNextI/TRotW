import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { OwnerAccess } from '@/components/owner/owner-access'

export const metadata: Metadata = {
  title: 'Owner Access',
  robots: { index: false, follow: false },
}

export default function OwnerAccessPage() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-background px-5 py-12 text-foreground sm:px-8 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Return home
        </Link>
        <OwnerAccess />
      </div>
    </main>
  )
}

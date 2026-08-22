'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { parseReadBookmark, READ_BOOKMARK_KEY } from '@/lib/read/reader-preferences'

export function TorilEntryRedirect({ releaseIds }: { releaseIds: string[] }) {
  const router = useRouter()

  useEffect(() => {
    const validReleaseIds = new Set(releaseIds)
    const bookmark = parseReadBookmark(window.localStorage.getItem(READ_BOOKMARK_KEY), validReleaseIds)
    const destination = bookmark?.releaseId || releaseIds.at(-1)
    if (destination) router.replace(`/read/toril/${destination}`)
  }, [releaseIds, router])

  return <p role="status" className="text-sm text-amber-100/80">Opening Toril…</p>
}

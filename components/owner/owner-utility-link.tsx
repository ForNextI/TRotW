'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useState } from 'react'

interface OwnerUtilityLinkProps {
  href: string
  children: ReactNode
  className?: string
  unauthorizedMessage?: string
}

export function OwnerUtilityLink({
  href,
  children,
  className = '',
  unauthorizedMessage = "Owner Access is required.",
}: OwnerUtilityLinkProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function openUtility() {
    if (busy) return
    setBusy(true)
    setMessage('')

    try {
      const response = await fetch('/api/owner-access', { cache: 'no-store' })
      const payload = (await response.json().catch(() => ({}))) as { active?: boolean }
      if (!response.ok || !payload.active) {
        setMessage(unauthorizedMessage)
        return
      }
      router.push(href)
    } catch {
      setMessage('Owner access could not be confirmed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="inline-flex flex-col items-center gap-2">
      <button type="button" onClick={() => void openUtility()} disabled={busy} className={className}>
        {children}
      </button>
      {message && <span className="text-xs font-semibold text-amber-700 dark:text-amber-300" role="status">{message}</span>}
    </span>
  )
}

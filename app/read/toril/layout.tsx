import type { ReactNode } from 'react'
import { ReadAloudProvider } from '@/components/read/read-aloud'
import { getReleaseCatalog } from '@/lib/read/releases'

export default async function TorilLayout({ children }: { children: ReactNode }) {
  const catalog = await getReleaseCatalog()
  return <ReadAloudProvider catalogIds={catalog.map((release) => release.id)}>{children}</ReadAloudProvider>
}

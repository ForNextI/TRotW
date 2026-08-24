import type { Metadata } from 'next'
import { RpgYourWaySignpost } from '@/components/showcase/rpgyw-signpost'

export const metadata: Metadata = {
  title: 'Shape · RPG Your Way',
  description: 'Looking for transcript conversion? Shape lives at RPG Your Way.',
}

export default function ShapeSignpostPage() {
  return <RpgYourWaySignpost kind="shape" />
}

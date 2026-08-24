import type { Metadata } from 'next'
import { RpgYourWaySignpost } from '@/components/showcase/rpgyw-signpost'

export const metadata: Metadata = {
  title: 'Play · RPG Your Way',
  description: 'Looking for the AI Game Master? Play lives at RPG Your Way.',
}

export default function PlaySignpostPage() {
  return <RpgYourWaySignpost kind="play" />
}

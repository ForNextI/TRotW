import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import championNames from '@/content/read/rodney-champions.json'

export type RodneyPhase = 'ready' | 'round_ready' | 'extra_silver' | 'name_champion'

export interface RodneyGameState {
  version: 4
  score_silver: number
  phase: RodneyPhase
  dice: [number, number] | null
  message: string
  pending_score: number
  qualifying_doubles: number
  current_champion: string
  round_id: string
}

type LegacyRodneyPayload = Omit<Partial<RodneyGameState>, 'version' | 'phase'> & {
  version?: number
  pot_silver?: number
  pending_jackpot?: number
  phase?: RodneyPhase | 'bet_placed' | 'double_bet' | 'name_winner'
}

function stateSecret() {
  return process.env.TROTW_RODNEY_STATE_SECRET?.trim() || process.env.RODNEY_STATE_SECRET?.trim() || process.env.TROTW_NOVEL_GATE_SECRET?.trim() || ''
}

function weightedSeedGold() {
  const roll = randomInt(1, 101)
  if (roll <= 50) return 20
  if (roll <= 70) return 30
  if (roll <= 80) return 40
  if (roll <= 87) return 50
  if (roll <= 92) return 60
  if (roll <= 95) return 70
  if (roll <= 97) return 80
  if (roll <= 99) return 90
  return 100
}

function starterChampion() {
  const names = Array.isArray(championNames)
    ? championNames.filter((name): name is string => typeof name === 'string' && Boolean(name.trim()))
    : []
  return names.length > 0 ? names[randomInt(0, names.length)] : 'Tharad'
}

export function formatCoinTotal(totalSilver: number) {
  const safe = Math.max(0, Math.floor(totalSilver))
  const gold = Math.floor(safe / 10)
  const silver = safe % 10
  const parts = [
    gold > 0 ? `${gold.toLocaleString()} gp` : '',
    silver > 0 || gold === 0 ? `${silver.toLocaleString()} sp` : '',
  ].filter(Boolean)
  return parts.join(', ')
}

export function createRodneyState(currentChampion?: string): RodneyGameState {
  const cleanChampion = currentChampion?.replace(/\s+/g, ' ').trim().slice(0, 60)
  return {
    version: 4,
    score_silver: weightedSeedGold() * 10,
    phase: 'ready',
    dice: null,
    message: 'Rodney’s pot is open. Place a one-silver-piece wager.',
    pending_score: 0,
    qualifying_doubles: 0,
    current_champion: cleanChampion || starterChampion(),
    round_id: crypto.randomUUID(),
  }
}

function encodedPayload(state: RodneyGameState) {
  return Buffer.from(JSON.stringify(state), 'utf8').toString('base64url')
}

function signature(payload: string) {
  const secret = stateSecret()
  if (!secret) throw new Error('Rodney’s state-signing secret is not configured.')
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function signRodneyState(state: RodneyGameState) {
  const payload = encodedPayload(state)
  return `${payload}.${signature(payload)}`
}

function normalizedPhase(phase: LegacyRodneyPayload['phase']): RodneyPhase | null {
  if (phase === 'ready') return 'ready'
  if (phase === 'round_ready' || phase === 'bet_placed') return 'round_ready'
  if (phase === 'extra_silver' || phase === 'double_bet') return 'extra_silver'
  if (phase === 'name_champion' || phase === 'name_winner') return 'name_champion'
  return null
}

function migratedMessage(phase: RodneyPhase) {
  if (phase === 'round_ready') return 'Your one-silver-piece wager is in Rodney’s pot. Roll the bones.'
  if (phase === 'extra_silver') return 'Double sixes. The wager loses, Tymora’s Favor resets, and Rodney calls for one extra silver piece.'
  if (phase === 'name_champion') return 'Fortune favors you. Record your winnings on the Roll of Fortune.'
  return 'Rodney’s pot is open. Place a one-silver-piece wager.'
}

export function verifyRodneyState(token: unknown): RodneyGameState | null {
  if (typeof token !== 'string' || !token.includes('.')) return null
  const [payload, suppliedSignature] = token.split('.', 2)
  if (!payload || !suppliedSignature) return null

  try {
    const expected = signature(payload)
    const suppliedBytes = Buffer.from(suppliedSignature)
    const expectedBytes = Buffer.from(expected)
    if (suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) return null

    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as LegacyRodneyPayload
    const version = Number(parsed.version)
    const phase = normalizedPhase(parsed.phase)
    const scoreSilver = Number.isFinite(parsed.score_silver) ? Number(parsed.score_silver) : Number(parsed.pot_silver)
    if (
      ![2, 3, 4].includes(version) ||
      !Number.isFinite(scoreSilver) ||
      !phase ||
      typeof parsed.current_champion !== 'string' ||
      typeof parsed.round_id !== 'string'
    ) return null

    const pendingScore = Number.isFinite(parsed.pending_score) ? Number(parsed.pending_score) : Number(parsed.pending_jackpot)
    const message = version >= 4 && typeof parsed.message === 'string'
      ? parsed.message.slice(0, 300)
      : migratedMessage(phase)

    return {
      version: 4,
      score_silver: Math.max(0, Math.floor(scoreSilver)),
      phase,
      dice: Array.isArray(parsed.dice) && parsed.dice.length === 2
        ? [Math.max(1, Math.min(6, Math.floor(Number(parsed.dice[0])))), Math.max(1, Math.min(6, Math.floor(Number(parsed.dice[1]))))]
        : null,
      message,
      pending_score: Number.isFinite(pendingScore) ? Math.max(0, Math.floor(pendingScore)) : 0,
      qualifying_doubles: Number.isFinite(parsed.qualifying_doubles) ? Math.max(0, Math.min(6, Math.floor(parsed.qualifying_doubles ?? 0))) : 0,
      current_champion: parsed.current_champion.replace(/\s+/g, ' ').trim().slice(0, 60) || starterChampion(),
      round_id: parsed.round_id.slice(0, 80),
    }
  } catch {
    return null
  }
}

import { randomInt } from 'node:crypto'
import { NextResponse } from 'next/server'
import { isRateLimited } from '@/lib/site/rate-limit'
import { recordRodneyWinner } from '@/lib/rodney/ledger'
import { publicWinnerNameProblem } from '@/lib/rodney/name-filter'
import {
  createRodneyState,
  formatCoinTotal,
  signRodneyState,
  verifyRodneyState,
  type RodneyGameState,
} from '@/lib/rodney/state'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RodneyRequest {
  action?: 'load' | 'play' | 'roll' | 'extra' | 'claim'
  token?: unknown
  champion_name?: unknown
  legacy_champion?: unknown
}

function publicState(state: RodneyGameState) {
  return {
    score_silver: state.score_silver,
    phase: state.phase,
    dice: state.dice,
    message: state.message,
    pending_score: state.pending_score,
    qualifying_doubles: state.qualifying_doubles,
    current_champion: state.current_champion,
  }
}

function response(state: RodneyGameState, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ token: signRodneyState(state), state: publicState(state), ...extra }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

function cleanChampionName(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, 12)
}

export async function POST(request: Request) {
  if (!(process.env.TROTW_RODNEY_STATE_SECRET?.trim() || process.env.RODNEY_STATE_SECRET?.trim() || process.env.TROTW_NOVEL_GATE_SECRET?.trim())) {
    return NextResponse.json({ error: 'Rodney is waiting for its server-side state secret to be configured.' }, { status: 503 })
  }
  if (isRateLimited(request, 'rodney-play', 600, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Rodney needs a brief rest before accepting more rolls from this connection.' }, { status: 429 })
  }

  let body: RodneyRequest
  try {
    body = (await request.json()) as RodneyRequest
  } catch {
    return NextResponse.json({ error: 'Rodney could not read that request.' }, { status: 400 })
  }

  const action = body.action ?? 'load'
  const current = verifyRodneyState(body.token)
  const legacyChampion = typeof body.legacy_champion === 'string'
    ? body.legacy_champion.replace(/\s+/g, ' ').trim().slice(0, 60)
    : ''

  if (action === 'load') return response(current ?? createRodneyState(legacyChampion))
  if (!current) return response(createRodneyState(legacyChampion), { reset: true })

  if (action === 'play') {
    if (current.phase !== 'ready') return response(current)
    return response({
      ...current,
      score_silver: current.score_silver + 1,
      phase: 'round_ready',
      dice: null,
      message: 'Your 1 sp wager joins Rodney’s pot.\nRoll the bones.',
    })
  }

  if (action === 'roll') {
    if (current.phase !== 'round_ready') return response(current)
    const dice: [number, number] = [randomInt(1, 7), randomInt(1, 7)]

    if (dice[0] === 1 && dice[1] === 1) {
      return response({
        ...current,
        phase: 'name_champion',
        dice,
        pending_score: current.score_silver,
        qualifying_doubles: 0,
        message: `Double ones. Tymora smiles. You win Rodney’s pot: ${formatCoinTotal(current.score_silver)}.`,
      })
    }

    if (dice[0] === 6 && dice[1] === 6) {
      return response({
        ...current,
        phase: 'extra_silver',
        dice,
        qualifying_doubles: 0,
        message: 'Double sixes. The wager loses. Tymora’s Favor resets, and Rodney calls for one extra 1 sp wager before the next round.',
      })
    }

    const qualifyingDouble = dice[0] === dice[1] && dice[0] >= 2 && dice[0] <= 5
    const nextDoubles = qualifyingDouble ? Math.min(6, current.qualifying_doubles + 1) : current.qualifying_doubles
    if (nextDoubles >= 6) {
      return response({
        ...current,
        phase: 'name_champion',
        dice,
        qualifying_doubles: 6,
        pending_score: current.score_silver,
        message: `Six qualifying doubles. Tymora has been keeping count. You win Rodney’s pot: ${formatCoinTotal(current.score_silver)}.`,
      })
    }

    return response({
      ...current,
      phase: 'ready',
      dice,
      qualifying_doubles: nextDoubles,
      message: qualifyingDouble
        ? `Double ${dice[0]}s. Tymora’s Favor rises to ${nextDoubles} of 6.`
        : `You rolled a ${dice[0] + dice[1]}.`,
    })
  }

  if (action === 'extra') {
    if (current.phase !== 'extra_silver') return response(current)
    return response({
      ...current,
      score_silver: current.score_silver + 1,
      phase: 'ready',
      message: 'The extra 1 sp wager joins Rodney’s pot. Ready for another round.',
    })
  }

  if (action === 'claim') {
    if (current.phase !== 'name_champion' || current.pending_score <= 0) return response(current)
    const name = cleanChampionName(body.champion_name)
    if (!name) return NextResponse.json({ error: 'Enter a champion name of 1–12 characters.' }, { status: 400 })
    const nameProblem = publicWinnerNameProblem(name)
    if (nameProblem) return NextResponse.json({ error: nameProblem }, { status: 400 })

    const champion = {
      id: crypto.randomUUID(),
      name,
      amount_silver: current.pending_score,
      won_at: new Date().toISOString(),
    }

    try {
      const ledger = await recordRodneyWinner(champion, current.round_id)
      if (ledger.configured && !ledger.recorded) {
        return NextResponse.json({ error: 'Those winnings have already been recorded.' }, { status: 409 })
      }
      const next = createRodneyState(name)
      next.message = ledger.recorded
        ? `${name} enters the Roll of Fortune with ${formatCoinTotal(champion.amount_silver)} in fictional winnings. Rodney opens a fresh pot.`
        : `${name} wins ${formatCoinTotal(champion.amount_silver)} in fictional coin. The shared Roll of Fortune is not connected yet.`
      return response(next, { champion, ledger_recorded: ledger.recorded, ledger_configured: ledger.configured })
    } catch (error) {
      return NextResponse.json({
        error: error instanceof Error ? error.message : 'Rodney could not record those winnings.',
        token: signRodneyState(current),
        state: publicState(current),
      }, { status: 502 })
    }
  }

  return NextResponse.json({ error: 'Rodney does not recognize that action.' }, { status: 400 })
}

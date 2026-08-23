import { pollRedisCommand, pollStoreConfigured } from '@/lib/site/poll-store'

const LEDGER_KEY = 'wardenspc:rodney:winners:v1'
const CLAIM_PREFIX = 'wardenspc:rodney:claimed:v1:'

export interface RodneyWinner {
  id: string
  name: string
  amount_silver: number
  won_at: string
}

async function redisCommand(command: Array<string | number>) {
  return pollRedisCommand(command, {
    unconfigured: 'The shared Rodney ledger is not connected.',
    unavailable: 'The shared Rodney ledger could not be reached.',
  })
}

function memberForWinner(entry: RodneyWinner) {
  const sortName = entry.name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9 -]/g, '')
  const encoded = Buffer.from(JSON.stringify(entry), 'utf8').toString('base64url')
  return `${sortName}\u0000${entry.id}\u0000${encoded}`
}

function winnerFromMember(member: string): RodneyWinner | null {
  const encoded = member.split('\u0000').at(-1)
  if (!encoded) return null
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Partial<RodneyWinner>
    if (!parsed.id || !parsed.name || !Number.isFinite(parsed.amount_silver) || !parsed.won_at) return null
    return {
      id: parsed.id,
      name: parsed.name,
      amount_silver: Math.max(0, Math.floor(parsed.amount_silver ?? 0)),
      won_at: parsed.won_at,
    }
  } catch {
    return null
  }
}

export function rodneyLedgerConfigured() {
  return pollStoreConfigured()
}

export async function recordRodneyWinner(entry: RodneyWinner, roundId: string) {
  if (!rodneyLedgerConfigured()) return { recorded: false, configured: false }
  const claimKey = `${CLAIM_PREFIX}${roundId}`
  const script = `
    if redis.call('EXISTS', KEYS[2]) == 1 then
      return 0
    end
    redis.call('SET', KEYS[2], '1', 'EX', 31536000)
    redis.call('ZADD', KEYS[1], ARGV[1], ARGV[2])
    return 1
  `
  const result = await redisCommand([
    'EVAL',
    script,
    2,
    LEDGER_KEY,
    claimKey,
    -entry.amount_silver,
    memberForWinner(entry),
  ])
  return { recorded: Number(result) === 1, configured: true }
}

export async function readRodneyLedger(page: number, pageSize = 100) {
  if (!rodneyLedgerConfigured()) {
    return { configured: false, entries: [] as RodneyWinner[], champion: null as RodneyWinner | null, total: 0, page: 0, page_size: pageSize }
  }

  const safePage = Math.max(0, Math.floor(page))
  const start = safePage * pageSize
  const stop = start + pageSize - 1
  const [rawEntries, rawChampion, rawTotal] = await Promise.all([
    redisCommand(['ZRANGE', LEDGER_KEY, start, stop]),
    redisCommand(['ZRANGE', LEDGER_KEY, 0, 0]),
    redisCommand(['ZCARD', LEDGER_KEY]),
  ])
  const members = Array.isArray(rawEntries) ? rawEntries.filter((entry): entry is string => typeof entry === 'string') : []
  const championMembers = Array.isArray(rawChampion) ? rawChampion.filter((entry): entry is string => typeof entry === 'string') : []
  const entries = members.map(winnerFromMember).filter((entry): entry is RodneyWinner => Boolean(entry))
  return {
    configured: true,
    entries,
    champion: championMembers.length > 0 ? winnerFromMember(championMembers[0]) : null,
    total: Number(rawTotal) || 0,
    page: safePage,
    page_size: pageSize,
  }
}


export async function deleteRodneyWinner(id: string) {
  if (!rodneyLedgerConfigured()) return { deleted: false, configured: false }
  const cleanId = id.trim().slice(0, 100)
  if (!cleanId) return { deleted: false, configured: true }

  const rawEntries = await redisCommand(['ZRANGE', LEDGER_KEY, 0, -1])
  const members = Array.isArray(rawEntries)
    ? rawEntries.filter((entry): entry is string => typeof entry === 'string')
    : []
  const member = members.find((entry) => winnerFromMember(entry)?.id === cleanId)
  if (!member) return { deleted: false, configured: true }

  const removed = await redisCommand(['ZREM', LEDGER_KEY, member])
  return { deleted: Number(removed) === 1, configured: true }
}

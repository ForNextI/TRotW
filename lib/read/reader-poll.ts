import 'server-only'
import { pollRedisCommand, pollStoreConfigured } from '@/lib/site/poll-store'

export const READER_POLL_COOKIE = 'trotw-reader-poll-v1'

export const READER_FEELING_OPTIONS = [
  'not_for_me',
  'still_deciding',
  'enjoying',
  'loving',
] as const

export const READER_SCHEDULE_OPTIONS = [
  'once_weekly',
  'twice_weekly',
  'three_times_weekly',
] as const

export type ReaderFeeling = (typeof READER_FEELING_OPTIONS)[number]
export type ReaderSchedule = (typeof READER_SCHEDULE_OPTIONS)[number]

export interface ReaderPollResults {
  feeling: Record<ReaderFeeling, number>
  schedule: Record<ReaderSchedule, number>
  feeling_total: number
  schedule_total: number
  last_vote_at: string | null
}

const FEELING_KEY = 'wardenspc:reader-poll:v1:feeling'
const SCHEDULE_KEY = 'wardenspc:reader-poll:v1:schedule'
const LAST_VOTE_KEY = 'wardenspc:reader-poll:v1:last-vote-at'

function numericArray(value: unknown, length: number): number[] {
  const source = Array.isArray(value) ? value : []
  return Array.from({ length }, (_, index) => {
    const parsed = Number(source[index])
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0
  })
}

export function readerPollConfigured() {
  return pollStoreConfigured()
}

export async function recordReaderPollVote(feeling: ReaderFeeling, schedule: ReaderSchedule | null) {
  if (!readerPollConfigured()) return { recorded: false, configured: false }

  const votedAt = new Date().toISOString()
  const script = `
    redis.call('HINCRBY', KEYS[1], ARGV[1], 1)
    if ARGV[2] ~= '' then
      redis.call('HINCRBY', KEYS[2], ARGV[2], 1)
    end
    redis.call('SET', KEYS[3], ARGV[3])
    return 1
  `

  const result = await pollRedisCommand([
    'EVAL',
    script,
    3,
    FEELING_KEY,
    SCHEDULE_KEY,
    LAST_VOTE_KEY,
    feeling,
    schedule || '',
    votedAt,
  ], {
    unconfigured: 'The reader poll is not connected to its private results store.',
    unavailable: 'The private reader poll results could not be reached.',
  })

  return { recorded: Number(result) === 1, configured: true }
}

export async function readReaderPollResults(): Promise<ReaderPollResults> {
  if (!readerPollConfigured()) {
    return {
      feeling: { not_for_me: 0, still_deciding: 0, enjoying: 0, loving: 0 },
      schedule: { once_weekly: 0, twice_weekly: 0, three_times_weekly: 0 },
      feeling_total: 0,
      schedule_total: 0,
      last_vote_at: null,
    }
  }

  const [feelingRaw, scheduleRaw, lastVoteRaw] = await Promise.all([
    pollRedisCommand(['HMGET', FEELING_KEY, ...READER_FEELING_OPTIONS], { unconfigured: 'The reader poll is not connected to its private results store.', unavailable: 'The private reader poll results could not be reached.' }),
    pollRedisCommand(['HMGET', SCHEDULE_KEY, ...READER_SCHEDULE_OPTIONS], { unconfigured: 'The reader poll is not connected to its private results store.', unavailable: 'The private reader poll results could not be reached.' }),
    pollRedisCommand(['GET', LAST_VOTE_KEY], { unconfigured: 'The reader poll is not connected to its private results store.', unavailable: 'The private reader poll results could not be reached.' }),
  ])

  const feelingValues = numericArray(feelingRaw, READER_FEELING_OPTIONS.length)
  const scheduleValues = numericArray(scheduleRaw, READER_SCHEDULE_OPTIONS.length)

  const feeling = {
    not_for_me: feelingValues[0],
    still_deciding: feelingValues[1],
    enjoying: feelingValues[2],
    loving: feelingValues[3],
  }
  const schedule = {
    once_weekly: scheduleValues[0],
    twice_weekly: scheduleValues[1],
    three_times_weekly: scheduleValues[2],
  }

  return {
    feeling,
    schedule,
    feeling_total: Object.values(feeling).reduce((sum, count) => sum + count, 0),
    schedule_total: Object.values(schedule).reduce((sum, count) => sum + count, 0),
    last_vote_at: typeof lastVoteRaw === 'string' && lastVoteRaw ? lastVoteRaw : null,
  }
}

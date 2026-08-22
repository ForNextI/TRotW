export interface ReleaseIdentifier {
  canonicalId: string
  displayId: string
  book: number
  unit: number
}

const RELEASE_PATTERN = /^([1-9]\d*)\.(\d{1,2})$/

export function parseCanonicalReleaseId(value: string): ReleaseIdentifier | null {
  const match = value.trim().match(RELEASE_PATTERN)
  if (!match) return null
  const book = Number(match[1])
  const unit = Number(match[2])
  if (!Number.isSafeInteger(book) || !Number.isSafeInteger(unit)) return null
  return {
    canonicalId: `${book}.${String(unit).padStart(2, '0')}`,
    displayId: `${book}.${unit}`,
    book,
    unit,
  }
}

export function canonicalIdFromDisplayId(value: string) {
  return parseCanonicalReleaseId(value)
}

export function releaseIdFromFilename(filename: string) {
  const base = filename.replace(/\.[^.]+$/, '')
  const match = base.match(/^([1-9]\d*\.\d{1,2})(?=$|[\s_-])/)
  return match ? parseCanonicalReleaseId(match[1]) : null
}

export function titleFromNumberedFilename(filename: string) {
  const base = filename.replace(/\.[^.]+$/, '')
  const match = base.match(/^[1-9]\d*\.\d{1,2}([\s_-]+)(.+)$/)
  if (!match) return ''
  return match[2]
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function compareCanonicalReleaseIds(left: string, right: string) {
  const a = parseCanonicalReleaseId(left)
  const b = parseCanonicalReleaseId(right)
  if (!a || !b) return left.localeCompare(right)
  return a.book - b.book || a.unit - b.unit
}

export function isValidNextRelease(candidateId: string, latestId: string | null) {
  const candidate = parseCanonicalReleaseId(candidateId)
  if (!candidate) return { valid: false, newBook: false, message: 'The release identifier must use book.unit format, such as 1.1 or 1.10.' }
  if (!latestId) return { valid: true, newBook: candidate.unit <= 1, message: '' }
  const latest = parseCanonicalReleaseId(latestId)
  if (!latest) return { valid: false, newBook: false, message: 'The current catalog contains an invalid release identifier.' }

  if (candidate.book === latest.book && candidate.unit === latest.unit + 1) {
    return { valid: true, newBook: false, message: '' }
  }
  if (candidate.book === latest.book + 1 && (candidate.unit === 0 || candidate.unit === 1)) {
    return { valid: true, newBook: true, message: '' }
  }
  return {
    valid: false,
    newBook: false,
    message: `The next release after ${latest.displayId} must be ${latest.book}.${latest.unit + 1} or the opening unit of Book ${latest.book + 1}.`,
  }
}

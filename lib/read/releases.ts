import { promises as fs } from 'node:fs'
import path from 'node:path'
import { canonicalIdFromDisplayId, compareCanonicalReleaseIds } from '@/lib/read/release-identifiers'

export interface ReadRelease {
  id: string
  canonicalId: string
  title: string
  book: number
  unit: number
  publishedAt: string
  contentFile: string
  wordCount: number
}

export interface ReadBook {
  book: number
  label: string
  title: string
  image: {
    src: string
    alt: string
    caption: string
  }
}

export interface ReadBonusImage {
  canonicalReleaseId: string
  title: string
  src: string
  alt: string
  width?: number
  height?: number
}

export interface ReadState {
  currentBook: number
  currentBonusImage: ReadBonusImage | null
  bonusGallery: ReadBonusImage[]
}

const CONTENT_ROOT = path.join(process.cwd(), 'content', 'read')
const CATALOG_PATH = path.join(CONTENT_ROOT, 'catalog.json')
const BOOKS_PATH = path.join(CONTENT_ROOT, 'books.json')
const STATE_PATH = path.join(CONTENT_ROOT, 'read-state.json')

function normalizeRelease(entry: Partial<ReadRelease>): ReadRelease | null {
  if ((!entry.id && !entry.canonicalId) || !entry.title || !entry.contentFile) return null
  const inferred = entry.canonicalId
    ? canonicalIdFromDisplayId(entry.canonicalId)
    : canonicalIdFromDisplayId(entry.id || '')
  if (!inferred) return null
  return {
    id: inferred.displayId,
    canonicalId: inferred.canonicalId,
    title: entry.title,
    book: Number.isSafeInteger(entry.book) ? Number(entry.book) : inferred.book,
    unit: Number.isSafeInteger(entry.unit) ? Number(entry.unit) : inferred.unit,
    publishedAt: entry.publishedAt || '',
    contentFile: entry.contentFile,
    wordCount: Number.isFinite(entry.wordCount) ? Number(entry.wordCount) : 0,
  }
}

export async function getReleaseCatalog(): Promise<ReadRelease[]> {
  try {
    const raw = await fs.readFile(CATALOG_PATH, 'utf8')
    const parsed = JSON.parse(raw) as Partial<ReadRelease>[]
    return Array.isArray(parsed)
      ? parsed
          .map(normalizeRelease)
          .filter((entry): entry is ReadRelease => Boolean(entry))
          .sort((left, right) => compareCanonicalReleaseIds(left.canonicalId, right.canonicalId))
      : []
  } catch {
    return []
  }
}

export async function getReadBooks(): Promise<ReadBook[]> {
  try {
    const parsed = JSON.parse(await fs.readFile(BOOKS_PATH, 'utf8')) as ReadBook[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function getReadState(): Promise<ReadState> {
  try {
    const parsed = JSON.parse(await fs.readFile(STATE_PATH, 'utf8')) as Partial<ReadState>
    return {
      currentBook: Number.isSafeInteger(parsed.currentBook) ? Number(parsed.currentBook) : 1,
      currentBonusImage: parsed.currentBonusImage ?? null,
      bonusGallery: Array.isArray(parsed.bonusGallery) ? parsed.bonusGallery : [],
    }
  } catch {
    return { currentBook: 1, currentBonusImage: null, bonusGallery: [] }
  }
}

export async function getReadRelease(id: string) {
  const catalog = await getReleaseCatalog()
  const release = catalog.find((entry) => entry.id === id || entry.canonicalId === id)
  if (!release) return null

  try {
    const html = await fs.readFile(path.join(CONTENT_ROOT, 'releases', release.contentFile), 'utf8')
    return { release, html, catalog }
  } catch {
    return null
  }
}

export function releaseLabel(release: ReadRelease) {
  return `Book ${release.book} · Release ${release.id}`
}

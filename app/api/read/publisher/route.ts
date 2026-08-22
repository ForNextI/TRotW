import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { isRateLimited } from '@/lib/site/rate-limit'
import {
  commitPreparedRelease,
  readGitHubPublisherSnapshot,
  readPublisherGitHubConfigured,
} from '@/lib/read/github-publisher'
import { canonicalIdFromDisplayId } from '@/lib/read/release-identifiers'
import { prepareReleasePackage, type PublisherInputFile } from '@/lib/read/publisher'
import { getReadState, getReleaseCatalog, type ReadRelease, type ReadState } from '@/lib/read/releases'
import { hasOwnerAccessSession } from '@/lib/site/server-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' }
const MAX_RELEASE_BYTES = 4 * 1024 * 1024
const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const MAX_COMBINED_UPLOAD_BYTES = 4 * 1024 * 1024

function publisherCodeAllowed(request: Request) {
  const required = process.env.TROTW_PUBLISHER_CODE?.trim() || ''
  const supplied = request.headers.get('x-trotw-publisher-code')?.trim() || ''
  if (!required || !supplied) return false
  const expected = Buffer.from(required)
  const received = Buffer.from(supplied)
  return expected.length === received.length && timingSafeEqual(expected, received)
}

function ownerRequired() {
  return NextResponse.json({ error: 'Owner Access is required before the Publisher can be opened.' }, { status: 403, headers: NO_STORE_HEADERS })
}

function publisherUnauthorized() {
  return NextResponse.json({ error: 'The Publisher code was not accepted.' }, { status: 401, headers: NO_STORE_HEADERS })
}

function parseCatalog(raw: string): ReadRelease[] {
  const parsed = JSON.parse(raw) as Array<Partial<ReadRelease>>
  if (!Array.isArray(parsed)) throw new Error('The Read catalog is malformed.')
  return parsed.map((entry) => {
    const identifier = canonicalIdFromDisplayId(entry.canonicalId || entry.id || '')
    if (!identifier || !entry.title || !entry.contentFile) throw new Error('The Read catalog contains an invalid release entry.')
    return {
      id: identifier.displayId,
      canonicalId: identifier.canonicalId,
      title: entry.title,
      book: Number.isSafeInteger(entry.book) ? Number(entry.book) : identifier.book,
      unit: Number.isSafeInteger(entry.unit) ? Number(entry.unit) : identifier.unit,
      publishedAt: entry.publishedAt || '',
      contentFile: entry.contentFile,
      wordCount: Number.isFinite(entry.wordCount) ? Number(entry.wordCount) : 0,
    }
  })
}

function parseState(raw: string): ReadState {
  const parsed = JSON.parse(raw) as Partial<ReadState>
  return {
    currentBook: Number.isSafeInteger(parsed.currentBook) ? Number(parsed.currentBook) : 1,
    currentBonusImage: parsed.currentBonusImage ?? null,
    bonusGallery: Array.isArray(parsed.bonusGallery) ? parsed.bonusGallery : [],
  }
}

async function uploadedFile(value: FormDataEntryValue | null, required: boolean, maxBytes: number): Promise<PublisherInputFile | null> {
  if (!(value instanceof File) || !value.name) {
    if (required) throw new Error('Drop the next release unit before checking the package.')
    return null
  }
  if (value.size <= 0) throw new Error(`${value.name} is empty.`)
  if (value.size > maxBytes) throw new Error(`${value.name} is too large for the publisher.`)
  return { name: value.name, type: value.type, bytes: new Uint8Array(await value.arrayBuffer()) }
}

async function localPublisherSource() {
  const [catalog, state] = await Promise.all([getReleaseCatalog(), getReadState()])
  return { catalog, state }
}

export async function GET(request: Request) {
  if (!hasOwnerAccessSession(request)) return ownerRequired()
  if (!process.env.TROTW_PUBLISHER_CODE?.trim()) {
    return NextResponse.json({ error: 'TROTW_PUBLISHER_CODE is not configured.' }, { status: 503, headers: NO_STORE_HEADERS })
  }
  if (!publisherCodeAllowed(request)) return publisherUnauthorized()
  const catalog = await getReleaseCatalog()
  return NextResponse.json({ ok: true, latestRelease: catalog.at(-1) ?? null, githubConfigured: readPublisherGitHubConfigured() }, { headers: NO_STORE_HEADERS })
}

export async function POST(request: Request) {
  if (!hasOwnerAccessSession(request)) return ownerRequired()
  if (!process.env.TROTW_PUBLISHER_CODE?.trim()) {
    return NextResponse.json({ error: 'TROTW_PUBLISHER_CODE is not configured.' }, { status: 503, headers: NO_STORE_HEADERS })
  }
  if (!publisherCodeAllowed(request)) return publisherUnauthorized()
  if (isRateLimited(request, 'read-publisher', 40, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'The Publisher has received too many requests. Try again shortly.' }, { status: 429, headers: NO_STORE_HEADERS })
  }

  try {
    const formData = await request.formData()
    const action = String(formData.get('action') || 'preview')
    if (!['preview', 'publish'].includes(action)) throw new Error('The publisher action was not recognized.')
    const releaseFile = await uploadedFile(formData.get('release'), true, MAX_RELEASE_BYTES)
    const imageFile = await uploadedFile(formData.get('image'), false, MAX_IMAGE_BYTES)
    if (!releaseFile) throw new Error('Drop the next release unit before checking the package.')
    if (releaseFile.bytes.byteLength + (imageFile?.bytes.byteLength || 0) > MAX_COMBINED_UPLOAD_BYTES) {
      throw new Error('The release unit and optional bonus image must total no more than 4 MB for the web publisher.')
    }

    if (action === 'preview') {
      const source = readPublisherGitHubConfigured()
        ? await readGitHubPublisherSnapshot().then((snapshot) => ({ catalog: parseCatalog(snapshot.catalog), state: parseState(snapshot.state) }))
        : await localPublisherSource()
      const prepared = await prepareReleasePackage({ releaseFile, imageFile, existingCatalog: source.catalog, existingState: source.state })
      return NextResponse.json({
        ok: true,
        action,
        release: prepared.release,
        html: prepared.html,
        warnings: prepared.warnings,
        image: prepared.image ? { title: prepared.image.title, publicPath: prepared.image.publicPath } : null,
        newBook: prepared.newBook,
        githubConfigured: readPublisherGitHubConfigured(),
      }, { headers: NO_STORE_HEADERS })
    }

    const snapshot = await readGitHubPublisherSnapshot()
    const prepared = await prepareReleasePackage({
      releaseFile,
      imageFile,
      existingCatalog: parseCatalog(snapshot.catalog),
      existingState: parseState(snapshot.state),
    })
    const published = await commitPreparedRelease(prepared, snapshot.parentSha, snapshot.baseTree)
    return NextResponse.json({
      ok: true,
      action,
      release: prepared.release,
      warnings: prepared.warnings,
      image: prepared.image ? { title: prepared.image.title, publicPath: prepared.image.publicPath } : null,
      publication: published,
      message: `Release ${prepared.release.id} was committed to GitHub. Vercel should begin deployment automatically.`,
    }, { headers: NO_STORE_HEADERS })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'The release package could not be processed.' }, { status: 400, headers: NO_STORE_HEADERS })
  }
}

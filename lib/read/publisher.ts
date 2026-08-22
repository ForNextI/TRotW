import 'server-only'
import { convertOdtBufferToHtml } from '@/lib/read/odt-to-html.mjs'
import {
  canonicalIdFromDisplayId,
  compareCanonicalReleaseIds,
  isValidNextRelease,
  releaseIdFromFilename,
  titleFromNumberedFilename,
} from '@/lib/read/release-identifiers'
import type { ReadRelease, ReadState } from '@/lib/read/releases'

const MAX_TITLE_LENGTH = 160

export function currentReadPublicationDate(date = new Date()) {
  const timeZone = process.env.TROTW_PUBLICATION_TIME_ZONE?.trim() || 'America/Los_Angeles'
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export interface PublisherInputFile {
  name: string
  type: string
  bytes: Uint8Array
}

export interface PreparedReleasePackage {
  release: ReadRelease
  html: string
  warnings: string[]
  newBook: boolean
  image: null | {
    title: string
    repositoryPath: string
    publicPath: string
    bytes: Uint8Array
  }
  catalog: ReadRelease[]
  state: ReadState
}

function markOpeningParagraph(value: string) {
  let marked = false
  return value.replace(/<p([^>]*)>([\s\S]*?)<\/p>/g, (full, attributes, content) => {
    if (marked || /\bclass=/.test(attributes) || /\bstyle=/.test(attributes)) return full
    const plain = content
      .replace(/<br\s*\/?\s*>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&(?:nbsp|emsp|ensp|thinsp);/gi, ' ')
      .replace(/&[^;]+;/g, 'x')
      .replace(/\s+/g, ' ')
      .trim()
    if (plain.length < 80) return full
    marked = true
    return `<p${attributes} class="opening-paragraph">${content}</p>`
  })
}

function words(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length
}

function slugify(value: string) {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return slug || 'bonus-image'
}

function normalizeCatalog(catalog: ReadRelease[]) {
  return catalog
    .map((entry) => ({ ...entry }))
    .sort((left, right) => compareCanonicalReleaseIds(left.canonicalId, right.canonicalId))
}

function pngDimensions(bytes: Uint8Array) {
  if (bytes.length < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) {
    throw new Error('The bonus image is not a valid PNG file.')
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const width = view.getUint32(16)
  const height = view.getUint32(20)
  if (!width || !height || width > 20000 || height > 20000) throw new Error('The bonus image dimensions could not be read.')
  return { width, height }
}

export async function prepareReleasePackage({
  releaseFile,
  imageFile,
  existingCatalog,
  existingState,
  publishedAt = currentReadPublicationDate(),
}: {
  releaseFile: PublisherInputFile
  imageFile?: PublisherInputFile | null
  existingCatalog: ReadRelease[]
  existingState: ReadState
  publishedAt?: string
}): Promise<PreparedReleasePackage> {
  if (!releaseFile.name.toLocaleLowerCase('en-US').endsWith('.odt')) {
    throw new Error('The release unit must be an .odt file.')
  }

  const identifier = releaseIdFromFilename(releaseFile.name)
  if (!identifier) {
    throw new Error('The release filename must begin with a book.unit identifier, such as 1.2 or 1.10.')
  }

  const catalog = normalizeCatalog(existingCatalog)
  if (catalog.some((entry) => entry.canonicalId === identifier.canonicalId || entry.id === identifier.displayId)) {
    throw new Error(`Release ${identifier.canonicalId} already exists.`)
  }

  const latestCanonicalId = catalog.at(-1)?.canonicalId ?? null
  const sequence = isValidNextRelease(identifier.canonicalId, latestCanonicalId)
  if (!sequence.valid) throw new Error(sequence.message)

  const converted = await convertOdtBufferToHtml(releaseFile.bytes)
  if (converted.blocks.length < 4) {
    throw new Error('The release document must contain the identifier, title, date line, and manuscript text.')
  }

  const documentIdentifierText = converted.blocks[0]?.text.trim() || ''
  const documentIdentifier = canonicalIdFromDisplayId(documentIdentifierText)
  const documentTitle = converted.blocks[1]?.text.replace(/\s+/g, ' ').trim() || ''
  if (!documentIdentifier || documentIdentifier.canonicalId !== identifier.canonicalId) {
    throw new Error(`The filename says ${identifier.displayId}, but the first document paragraph says ${documentIdentifierText || 'nothing'}. Leading zeroes are optional, but the book and unit must match.`)
  }
  if (!documentTitle) throw new Error('The second non-empty document paragraph must contain the canonical release title.')
  if (documentTitle.length > MAX_TITLE_LENGTH) throw new Error(`The release title is longer than ${MAX_TITLE_LENGTH} characters.`)

  const manuscriptBlocks = converted.blocks.slice(3)
  const manuscriptText = manuscriptBlocks.map((block) => block.text).filter(Boolean).join('\n\n').trim()
  if (!manuscriptText) throw new Error('No manuscript text was found after the identifier, title, and date paragraphs.')
  const html = markOpeningParagraph(manuscriptBlocks.map((block) => block.html).filter(Boolean).join('\n')).trim() + '\n'

  let image: PreparedReleasePackage['image'] = null
  let state: ReadState = {
    currentBook: identifier.book,
    currentBonusImage: existingState.currentBonusImage ? { ...existingState.currentBonusImage } : null,
    bonusGallery: [...existingState.bonusGallery],
  }
  const warnings = [...converted.warnings]

  if (imageFile) {
    if (!imageFile.name.toLocaleLowerCase('en-US').endsWith('.png') || imageFile.type && imageFile.type !== 'image/png') {
      throw new Error('The optional bonus image must be a PNG file.')
    }
    const imageIdentifier = releaseIdFromFilename(imageFile.name)
    if (!imageIdentifier) throw new Error('The bonus-image filename must begin with a book.unit identifier, such as 1.2 or 1.10.')
    if (imageIdentifier.canonicalId !== identifier.canonicalId) {
      throw new Error(`The release unit is ${identifier.canonicalId}, but the bonus image is ${imageIdentifier.canonicalId}.`)
    }
    const imageTitle = titleFromNumberedFilename(imageFile.name)
    if (!imageTitle) throw new Error('The bonus-image filename must include its title after the release identifier.')
    const { width, height } = pngDimensions(imageFile.bytes)
    const repositoryPath = `public/images/read/releases/${identifier.displayId}-${slugify(imageTitle)}.png`
    const publicPath = repositoryPath.replace(/^public/, '')
    image = { title: imageTitle, repositoryPath, publicPath, bytes: imageFile.bytes }

    if (state.currentBonusImage && !state.bonusGallery.some((entry) => entry.src === state.currentBonusImage?.src)) {
      state.bonusGallery.push(state.currentBonusImage)
    }
    state.currentBonusImage = {
      canonicalReleaseId: identifier.canonicalId,
      title: imageTitle,
      src: publicPath,
      alt: imageTitle,
      width,
      height,
    }
  }

  if (sequence.newBook) {
    warnings.push(`New book detected. Update the book title and book image separately before announcing Book ${identifier.book}.`)
  }

  const release: ReadRelease = {
    id: identifier.displayId,
    canonicalId: identifier.canonicalId,
    title: documentTitle,
    book: identifier.book,
    unit: identifier.unit,
    publishedAt,
    contentFile: `${identifier.displayId}.html`,
    wordCount: words(manuscriptText),
  }
  catalog.push(release)
  catalog.sort((left, right) => compareCanonicalReleaseIds(left.canonicalId, right.canonicalId))

  return {
    release,
    html,
    warnings,
    newBook: sequence.newBook,
    image,
    catalog,
    state,
  }
}

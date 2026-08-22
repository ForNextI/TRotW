import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const FAN_NOTICE = 'The Reading of the Wardens is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.'

function fail(message: string): never {
  console.error(`\nTROTW 1.2.1 validation failed: ${message}`)
  process.exit(1)
}

function text(relative: string) {
  const file = path.join(ROOT, relative)
  if (!fs.existsSync(file)) fail(`missing required file: ${relative}`)
  return fs.readFileSync(file, 'utf8')
}

function exists(relative: string) {
  if (!fs.existsSync(path.join(ROOT, relative))) fail(`missing required file: ${relative}`)
}

function walk(directory: string): string[] {
  const full = path.join(ROOT, directory)
  if (!fs.existsSync(full)) return []
  return fs.readdirSync(full, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(relative) : [relative]
  })
}

const packageJson = JSON.parse(text('package.json')) as { version?: string; scripts?: Record<string, string> }
if (packageJson.version !== '1.2.1') fail('package.json is not version 1.2.1')
if (!packageJson.scripts?.['validate:version'] || !packageJson.scripts?.['validate:release']) fail('release validation scripts are missing')

const layout = text('app/layout.tsx')
if (!layout.includes('https://thereadingofthewardens.com')) fail('canonical production domain is missing from root metadata')
if (!layout.includes('The Reading of the Wardens')) fail('standalone site identity is missing from root metadata')

const rootPage = text('app/page.tsx')
if (!rootPage.includes("from './read/page'")) fail('the root route no longer reuses the Read landing experience')

const footer = text('components/showcase/site-footer.tsx')
const legal = text('app/legal/page.tsx')
if (!footer.includes(FAN_NOTICE)) fail('Wizards fan-content notice is missing or changed in the site footer')
if (!legal.includes(FAN_NOTICE)) fail('Wizards fan-content notice is missing or changed on the Legal page')

const accessibility = text('app/accessibility/page.tsx')
if (!accessibility.includes('WCAG 2.2 Level AA')) fail('WCAG 2.2 Level AA target is missing from Accessibility page')
if (!accessibility.includes('selectable story text')) fail('Accessibility page no longer documents selectable published prose')
const copyDeterrent = text('components/security/image-copy-deterrent.tsx')
if (/selectstart|selectionTouchesProtectedProse|preventProseCopy/.test(copyDeterrent)) fail('published prose copy/selection blocking returned; this conflicts with the TROTW accessibility carve-out')

for (const required of [
  'app/api/read/speech/route.ts',
  'app/api/read/poll/route.ts',
  'app/api/read/poll/results/route.ts',
  'app/api/read/publisher/route.ts',
  'app/api/owner-access/route.ts',
  'app/api/owner/service-status/route.ts',
  'components/owner/owner-service-status.tsx',
  'lib/site/service-config.ts',
  'lib/read/narration-cache.ts',
  'app/read/toril/[releaseId]/page.tsx',
  'components/read/read-aloud.tsx',
  'components/read/reader-poll.tsx',
  'components/read/read-publisher.tsx',
  'lib/read/github-publisher.ts',
  'lib/read/publisher.ts',
  'lib/read/reader-preferences.ts',
  'content/read/catalog.json',
  'content/read/read-state.json',
  'content/read/books.json',
  'public/images/wardens-hero.png',
]) exists(required)

const publisherRoute = text('app/api/read/publisher/route.ts')
const githubPublisher = text('lib/read/github-publisher.ts')
for (const expected of ['TROTW_PUBLISHER_CODE', 'x-trotw-publisher-code']) {
  if (!publisherRoute.includes(expected)) fail(`Publisher is missing TROTW-specific ${expected}`)
}
for (const expected of ['TROTW_GITHUB_TOKEN', 'TROTW_GITHUB_REPOSITORY', 'TROTW_GITHUB_BRANCH']) {
  if (!githubPublisher.includes(expected)) fail(`GitHub Publisher is missing ${expected}`)
}

const sourceFiles = [
  ...walk('app'),
  ...walk('components'),
  ...walk('lib'),
  ...walk('content'),
  'next.config.mjs',
  'proxy.ts',
  '.env.example',
].filter((relative) => /\.(?:ts|tsx|mts|mjs|js|json|example)$/.test(relative) || relative === '.env.example')

const forbidden: Array<[RegExp, string]> = [
  [/https?:\/\/(?:www\.)?wardenspc\.com/i, 'WardensPC.com backlink'],
  [/\/aigm\/owner/i, 'WardensPC owner route'],
  [/WARDENS_GITHUB_/i, 'WardensPC GitHub environment variable'],
  [/WARDENS_OWNER_/i, 'WardensPC owner environment variable'],
  [/@\/lib\/aigm\//i, 'AIGM library dependency'],
  [/googletagmanager|gtag\(|google-ads|meta-pixel|reddit-pixel/i, 'advertising/tracking dependency'],
]

for (const relative of sourceFiles) {
  const body = text(relative)
  for (const [pattern, label] of forbidden) {
    if (pattern.test(body)) fail(`${label} remains in ${relative}`)
  }
}

const publisherSources = [publisherRoute, githubPublisher, text('lib/read/publisher.ts')].join('\n')
if (/rodney/i.test(publisherSources)) fail('Publisher still contains the former Rodney coupling')

const catalog = JSON.parse(text('content/read/catalog.json')) as Array<{ id?: string; contentFile?: string }>
if (!Array.isArray(catalog) || catalog.length === 0) fail('release catalog is empty')
for (const release of catalog) {
  if (!release.contentFile) fail(`release ${release.id || '(unknown)'} has no contentFile`)
  exists(`content/read/releases/${release.contentFile}`)
}

const books = JSON.parse(text('content/read/books.json')) as Array<{ image?: { src?: string } }>
const state = JSON.parse(text('content/read/read-state.json')) as { currentBonusImage?: { src?: string } | null; bonusGallery?: Array<{ src?: string }> }
const imagePaths = [
  ...books.map((book) => book.image?.src),
  state.currentBonusImage?.src,
  ...(state.bonusGallery || []).map((entry) => entry.src),
].filter((value): value is string => Boolean(value))
for (const imagePath of imagePaths) {
  if (imagePath.startsWith('/')) exists(`public${imagePath}`)
}

const envExample = text('.env.example')
for (const expected of ['TROTW_OWNER_CODE', 'TROTW_PUBLISHER_CODE', 'TROTW_NOVEL_GATE_SECRET', 'TROTW_GITHUB_TOKEN', 'TROTW_OPENAI_API_KEY', 'TROTW_OPENAI_TTS_MODEL', 'BLOB_READ_WRITE_TOKEN', 'TROTW_UPSTASH_REDIS_REST_URL', 'TROTW_UPSTASH_REDIS_REST_TOKEN']) {
  if (!envExample.includes(`${expected}=`)) fail(`.env.example is missing ${expected}`)
}

const packageDependencies = (packageJson as { dependencies?: Record<string, string> }).dependencies || {}
if (!packageDependencies['@vercel/blob']) fail('@vercel/blob dependency is missing')
const narrationCache = text('lib/read/narration-cache.ts')
for (const expected of ['createHash', 'read-aloud/v1', "access: 'public'", 'addRandomSuffix: false']) {
  if (!narrationCache.includes(expected)) fail(`shared narration cache is missing ${expected}`)
}
const readerPreferences = text('lib/read/reader-preferences.ts')
const readAloud = text('components/read/read-aloud.tsx')
if (!readerPreferences.includes("return value === 'male' ? 'male' : 'female'")) fail('Read Aloud normalization no longer defaults to female')
if (!readAloud.includes("useState<ReadAloudVoice>('female')")) fail('Read Aloud state no longer initializes to female')
if (!readAloud.includes('Female voice <span className="font-normal text-[#604a2c]">(default)</span>')) fail('Read Aloud UI no longer labels the female voice as default')
if (readAloud.includes('Male voice <span className="font-normal text-[#604a2c]">(default)</span>')) fail('Read Aloud UI still labels the male voice as default')

const speechRoute = text('app/api/read/speech/route.ts')
for (const expected of ['findCachedNarration', 'storeNarration', 'X-TROTW-Narration-Cache']) {
  if (!speechRoute.includes(expected)) fail(`Read Aloud route is missing shared-cache behavior: ${expected}`)
}

const serviceConfig = text('lib/site/service-config.ts')
for (const expected of ['TROTW_OPENAI_API_KEY', 'OPENAI_API_KEY', 'TROTW_UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_URL']) {
  if (!serviceConfig.includes(expected)) fail(`standalone service configuration is missing ${expected}`)
}
const serviceStatusRoute = text('app/api/owner/service-status/route.ts')
if (!serviceStatusRoute.includes('hasOwnerAccessSession')) fail('owner service-status route is not protected by Owner Access')
const ownerServiceStatus = text('components/owner/owner-service-status.tsx')
for (const expected of ['Novel age gate', 'Read Aloud', 'Narration library', 'Reader Poll', 'Publisher']) {
  if (!ownerServiceStatus.includes(expected)) fail(`owner service-status panel is missing ${expected}`)
}

const repositoryText = sourceFiles.map((relative) => text(relative)).join('\n')
const secretPatterns = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /ghp_[A-Za-z0-9]{20,}/,
]
for (const pattern of secretPatterns) {
  if (pattern.test(repositoryText)) fail('a credential-shaped secret appears to be committed in source')
}

console.log('TROTW 1.2.1 release validation passed.')
console.log(`Validated ${catalog.length} published release units and ${imagePaths.length} referenced catalog/state images.`)

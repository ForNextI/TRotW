import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const EXPECTED = '2.2.304'

function fail(message: string): never {
  console.error(`\nTROTW version validation failed: ${message}`)
  process.exit(1)
}

const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as { name?: string; version?: string }
if (packageJson.name !== 'trotw') fail(`package name is ${JSON.stringify(packageJson.name)}, expected "trotw"`)
if (packageJson.version !== EXPECTED) fail(`package.json is ${JSON.stringify(packageJson.version)}, expected ${EXPECTED}`)

const versionSource = fs.readFileSync(path.join(ROOT, 'lib/site/version.ts'), 'utf8')
if (!versionSource.includes(`TROTW_VERSION = '${EXPECTED}'`)) fail('lib/site/version.ts does not expose TROTW_VERSION 2.2.304')

console.log(`TROTW version validation passed: ${EXPECTED}`)

import 'server-only'
import type { PreparedReleasePackage } from '@/lib/read/publisher'

interface GitHubConfig {
  repository: string
  branch: string
  token: string
}

interface GitHubRefResponse { object?: { sha?: string } }
interface GitHubCommitResponse { tree?: { sha?: string } }
interface GitHubBlobResponse { sha?: string; content?: string; encoding?: string }

export function readPublisherGitHubStatus() {
  const repository = process.env.TROTW_GITHUB_REPOSITORY?.trim()
    || [process.env.VERCEL_GIT_REPO_OWNER?.trim(), process.env.VERCEL_GIT_REPO_SLUG?.trim()].filter(Boolean).join('/')
  const branch = process.env.TROTW_GITHUB_BRANCH?.trim() || 'main'
  const tokenConfigured = Boolean(process.env.TROTW_GITHUB_TOKEN?.trim())
  const repositoryConfigured = Boolean(repository && repository.includes('/'))
  return {
    configured: Boolean(repositoryConfigured && tokenConfigured),
    repository: repositoryConfigured ? repository : '',
    branch,
    tokenConfigured,
  }
}

function githubConfig(): GitHubConfig | null {
  const status = readPublisherGitHubStatus()
  const token = process.env.TROTW_GITHUB_TOKEN?.trim() || ''
  if (!status.configured || !status.repository || !token) return null
  return { repository: status.repository, branch: status.branch, token }
}

async function githubRequest<T>(config: GitHubConfig, path: string, init: RequestInit = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${config.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  })
  const payload = (await response.json().catch(() => ({}))) as T & { message?: string }
  if (!response.ok) throw new Error(payload.message || `GitHub returned ${response.status}.`)
  return payload
}

export function readPublisherGitHubConfigured() {
  return Boolean(githubConfig())
}

async function readGitHubTextFileAtRef(config: GitHubConfig, path: string, ref: string) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  const payload = await githubRequest<GitHubBlobResponse>(config, `/repos/${config.repository}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`)
  if (payload.encoding !== 'base64' || typeof payload.content !== 'string') throw new Error(`GitHub did not return readable content for ${path}.`)
  return Buffer.from(payload.content.replace(/\s+/g, ''), 'base64').toString('utf8')
}

export async function readGitHubPublisherSnapshot() {
  const config = githubConfig()
  if (!config) throw new Error('GitHub publication is not configured.')
  const ref = await githubRequest<GitHubRefResponse>(config, `/repos/${config.repository}/git/ref/heads/${encodeURIComponent(config.branch)}`)
  const parentSha = ref.object?.sha
  if (!parentSha) throw new Error('GitHub did not return the current branch commit.')
  const commit = await githubRequest<GitHubCommitResponse>(config, `/repos/${config.repository}/git/commits/${parentSha}`)
  const baseTree = commit.tree?.sha
  if (!baseTree) throw new Error('GitHub did not return the current repository tree.')
  const [catalog, state] = await Promise.all([
    readGitHubTextFileAtRef(config, 'content/read/catalog.json', parentSha),
    readGitHubTextFileAtRef(config, 'content/read/read-state.json', parentSha),
  ])
  return { catalog, state, parentSha, baseTree }
}

async function createBlob(config: GitHubConfig, content: string, encoding: 'utf-8' | 'base64') {
  const payload = await githubRequest<{ sha?: string }>(config, `/repos/${config.repository}/git/blobs`, {
    method: 'POST',
    body: JSON.stringify({ content, encoding }),
  })
  if (!payload.sha) throw new Error('GitHub did not return a blob identifier.')
  return payload.sha
}

export async function commitPreparedRelease(prepared: PreparedReleasePackage, expectedParentSha: string, baseTree: string) {
  const config = githubConfig()
  if (!config) throw new Error('GitHub publication is not configured. Add TROTW_GITHUB_TOKEN in Vercel.')

  const textFiles = new Map<string, string>([
    [`content/read/releases/${prepared.release.contentFile}`, prepared.html],
    ['content/read/catalog.json', JSON.stringify(prepared.catalog, null, 2) + '\n'],
    ['content/read/read-state.json', JSON.stringify(prepared.state, null, 2) + '\n'],
  ])

  const entries: Array<{ path: string; mode: '100644'; type: 'blob'; sha: string }> = []
  for (const [path, content] of textFiles) {
    entries.push({ path, mode: '100644', type: 'blob', sha: await createBlob(config, content, 'utf-8') })
  }
  if (prepared.image) {
    entries.push({
      path: prepared.image.repositoryPath,
      mode: '100644',
      type: 'blob',
      sha: await createBlob(config, Buffer.from(prepared.image.bytes).toString('base64'), 'base64'),
    })
  }

  const tree = await githubRequest<{ sha?: string }>(config, `/repos/${config.repository}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ base_tree: baseTree, tree: entries }),
  })
  if (!tree.sha) throw new Error('GitHub did not create the release tree.')

  const createdCommit = await githubRequest<{ sha?: string; html_url?: string }>(config, `/repos/${config.repository}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({
      message: `Publish ${prepared.release.canonicalId}: ${prepared.release.title}`,
      tree: tree.sha,
      parents: [expectedParentSha],
    }),
  })
  if (!createdCommit.sha) throw new Error('GitHub did not create the release commit.')

  const currentRef = await githubRequest<GitHubRefResponse>(config, `/repos/${config.repository}/git/ref/heads/${encodeURIComponent(config.branch)}`)
  if (currentRef.object?.sha !== expectedParentSha) throw new Error('The repository changed while this release was being prepared. Check the release again before publishing.')

  await githubRequest(config, `/repos/${config.repository}/git/refs/heads/${encodeURIComponent(config.branch)}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: createdCommit.sha, force: false }),
  })

  return { commitSha: createdCommit.sha, commitUrl: createdCommit.html_url || '', branch: config.branch, repository: config.repository }
}

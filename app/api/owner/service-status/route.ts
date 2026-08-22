import { NextResponse } from 'next/server'
import { novelGateConfigured } from '@/lib/read/novel-gate'
import { readPublisherGitHubStatus } from '@/lib/read/github-publisher'
import { hasOwnerAccessSession } from '@/lib/site/server-access'
import { pollStoreServiceConfig, readAloudServiceConfig } from '@/lib/site/service-config'
import { TROTW_VERSION } from '@/lib/site/version'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' }

export async function GET(request: Request) {
  if (!hasOwnerAccessSession(request)) {
    return NextResponse.json({ error: 'Owner Access is required.' }, { status: 403, headers: NO_STORE_HEADERS })
  }

  const readAloud = readAloudServiceConfig()
  const poll = pollStoreServiceConfig()
  const github = readPublisherGitHubStatus()

  return NextResponse.json({
    version: TROTW_VERSION,
    services: {
      novelGate: { configured: novelGateConfigured() },
      readAloud: {
        configured: readAloud.configured,
        model: readAloud.model,
        usingLegacyVariable: readAloud.usingLegacyVariable,
      },
      readerPoll: {
        configured: poll.configured,
        usingLegacyVariables: poll.usingLegacyVariables,
      },
      publisher: {
        ownerCodeConfigured: Boolean(process.env.TROTW_OWNER_CODE?.trim()),
        publisherCodeConfigured: Boolean(process.env.TROTW_PUBLISHER_CODE?.trim()),
        githubConfigured: github.configured,
        githubRepository: github.repository,
        githubBranch: github.branch,
        githubTokenConfigured: github.tokenConfigured,
      },
      rightsContact: { configured: Boolean(process.env.NEXT_PUBLIC_RIGHTS_CONTACT_EMAIL?.trim()) },
    },
  }, { headers: NO_STORE_HEADERS })
}

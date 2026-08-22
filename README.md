# The Reading of the Wardens

**TROTW 1.1.0** is the standalone home of *The Wardens of Waterdeep* and the Read experience originally published as part of WardensPC.

- Production domain: `https://thereadingofthewardens.com`
- GitHub repository: `ForNextI/TrotW`
- Vercel project: `trotw`
- Initial source lineage: WardensPC 4.13.0 Read carve-out

This repository is intentionally independent of WardensPC. It contains the novel reader, bonus art and galleries, bookmarks, MIST, Reader Poll, optional Read Aloud, and the private drag-and-drop Publisher. It does not require the WardensPC application at runtime.

## Routes

The site homepage (`/`) renders the existing Read landing experience. Existing `/read/...` routes are retained so the migration does not gratuitously break the reader's route structure.

Public reader routes include:

- `/`
- `/read`
- `/read/about`
- `/read/toril`
- `/read/toril/[releaseId]`
- `/read/pix/[bookSlug]`
- `/legal`
- `/accessibility`

Private owner tools include:

- `/owner`
- `/read/publisher`
- `/read/poll-results`

## Deployment

TROTW is designed for GitHub + Vercel. A push to the repository's `main` branch should trigger the connected Vercel project automatically.

Do not put secrets in this public repository. Configure them as Vercel environment variables.

### Required environment variables

For the adult-novel gate:

- `TROTW_NOVEL_GATE_SECRET` — long random signing secret

For private Owner Access and Publisher:

- `TROTW_OWNER_CODE`
- `TROTW_PUBLISHER_CODE`
- `TROTW_GITHUB_TOKEN`
- `TROTW_GITHUB_REPOSITORY` — normally `ForNextI/TrotW`
- `TROTW_GITHUB_BRANCH` — normally `main`
- `TROTW_PUBLICATION_TIME_ZONE` — normally `America/Los_Angeles`

`TROTW_GITHUB_TOKEN` should be a fine-grained GitHub token limited to this repository with the minimum permission required to read and write repository contents. The Publisher commits the release HTML, catalog/state updates, and optional bonus image to the repository. Vercel then deploys that commit.

For Read Aloud:

- `TROTW_OPENAI_API_KEY`
- `TROTW_OPENAI_TTS_MODEL` — optional; defaults to `gpt-4o-mini-tts`

For the Reader Poll:

- `TROTW_UPSTASH_REDIS_REST_URL`
- `TROTW_UPSTASH_REDIS_REST_TOKEN`

TROTW 1.1.0 still recognizes the generic `OPENAI_*` and standard `UPSTASH_REDIS_*` names as migration fallbacks, but new Vercel configuration should use the TROTW-prefixed names so this site remains visibly independent from WardensPC.

For rights-holder contact display:

- `NEXT_PUBLIC_RIGHTS_CONTACT_EMAIL` — optional

See `.env.example` for the complete template.


## TROTW 1.1 standalone-service setup

Version 1.1 adds an owner-only service-status panel at `/owner`. After Owner Access is active, the panel reports whether the server can see configuration for:

- novel age gate
- Read Aloud
- Reader Poll
- Publisher / GitHub
- optional rights-holder contact

The status panel returns only booleans, model/repository labels, and branch names. It never returns passwords, tokens, API keys, or Redis credentials.

Recommended Vercel setup order:

1. `TROTW_NOVEL_GATE_SECRET`
2. `TROTW_OPENAI_API_KEY` (and optionally `TROTW_OPENAI_TTS_MODEL`)
3. `TROTW_UPSTASH_REDIS_REST_URL` + `TROTW_UPSTASH_REDIS_REST_TOKEN`
4. `TROTW_OWNER_CODE`
5. `TROTW_PUBLISHER_CODE`
6. `TROTW_GITHUB_TOKEN`
7. `TROTW_GITHUB_REPOSITORY=ForNextI/TrotW`
8. `TROTW_GITHUB_BRANCH=main`
9. `TROTW_PUBLICATION_TIME_ZONE=America/Los_Angeles`

After changing Vercel environment variables, redeploy before testing the service. The preferred QA sequence is age gate → Read Aloud → poll → Owner Access → Publisher preview → harmless Publisher commit/deployment test.

## Reader Poll migration note

TROTW intentionally retains the existing private Redis key names used by the WardensPC Read poll. These key names are implementation details and are not WardensPC links or runtime dependencies.

If TROTW is connected to the same Upstash database, the existing aggregate poll totals continue rather than resetting at migration. The browser cookie that remembers whether a reader already voted does **not** transfer between domains, because browsers correctly isolate cookies by domain.

## Bookmarks and local reader preferences

TROTW uses its own browser-storage keys. Old exported WardensPC bookmark JSON remains import-compatible, so a reader who exported a bookmark can import it on the new domain. Browser-local state cannot automatically cross domains.

## Accessibility

The practical accessibility target is **WCAG 2.2 Level AA**. The site preserves keyboard interaction, semantic landmarks, visible focus, labels and status messages, responsive reflow, reduced-motion controls, and accessible dialogs/forms from the Read experience. `/accessibility` states the target without claiming that a formal conformance audit has been completed.

## Wizards fan-content notice

The Wizards Fan Content notice appears in the global footer and on `/legal`:

> The Reading of the Wardens is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.

The standalone Legal page is intentionally scoped to this novel site rather than copying WardensPC's unrelated AIGM, Shape, Chat, advertising, or other product terms.

## What was deliberately removed from the WardensPC source

The carve-out does not include:

- AIGM / Play
- Shape / ProseMaker
- Chat
- Rodney
- WardensPC advertising and conversion tracking
- Google Tag Manager, Meta Pixel, or Reddit Pixel plumbing
- WardensPC API-usage analytics
- WardensPC navigation/backlinks
- the Publisher's former Rodney champion-name side effect

Read Aloud calls OpenAI directly from its own server route. Reader Poll storage uses its own small Upstash adapter. Owner Access and the Publisher use TROTW-specific environment variables and cookies.

## Publisher workflow

1. Activate `/owner` with `TROTW_OWNER_CODE`.
2. Open `/read/publisher`.
3. Enter the separate `TROTW_PUBLISHER_CODE` when prompted.
4. Drag/drop the supported release package and optional PNG bonus image.
5. Preview and validate the release.
6. Publish. The server commits the new files to GitHub.
7. Vercel detects the commit and deploys it.

The GitHub token remains server-side in Vercel and must never be committed to source or exposed to the browser.

## Release validation

Run these separately and stop on failure:

```bash
pnpm run validate:release
pnpm run build
git diff --check
git status --short
```

For TROTW 1.1.0 and later updates:

```bash
git add -A
git diff --cached --check
git status --short
git commit -m "TROTW 1.1.0"
git push
```

Do not attach `thereadingofthewardens.com` until the Vercel deployment has passed reader and Publisher QA on the Vercel URL.

## Relationship to WardensPC

This repository is Phase 1 of the separation. WardensPC should remain unchanged while TROTW is deployed and tested. Removal of Read from WardensPC is a separate later WardensPC release after the standalone site is proven.

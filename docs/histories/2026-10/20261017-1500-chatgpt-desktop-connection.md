## [2026-10-17 15:00] | Task: Connect the open-source desktop app to ChatGPT

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-6`
- Runtime: `Codex desktop`

### User Query

> Implement ChatGPT subscription sign-in for the open-source local app, and
> establish whether an OpenAI console application must be created first.
> Commit and push this integration, keeping its official tutorial URL and
> open-source registration requirements discoverable in repository docs.

### Changes Overview

- Implemented official OSS dynamic registration without a pre-created console
  app, client secret or API key; issued IDs persist before token exchange.
- Added Node-only protected account storage, PKCE/state/nonce, signed OIDC identity
  verification with pinned jose, scope checks, serialized renewal and sign out.
- Added allowlisted desktop IPC, ChatGPT settings, model selection, first-use
  confirmation, usage controls and explicit browser-only availability messaging.
- Replaced new illustrative chat replies with bounded streamed text inference.
  Only completed replies persist; partial failures/cancellation support retry.
  Saved provenance preserves old sample labels and excludes sample replies from
  model context. This slice has no market-data tools or sourced research execution.
- Updated setup, architecture, security, product, quality, reliability, frontend,
  design index, execution plan and user-facing release notes.

### Design Intent

Serve the open-source local desktop app using official public endpoints. Keep
identity, inference permission, stock collection and brokerage independent, and
keep credentials entirely outside renderer and workspace storage. Preserve the
pre-existing uncommitted work in this checkout. Do not reuse Codex credentials
or silently switch billing paths.

### Main Files

- `packages/core/src/chatgpt.ts` and `workspace.ts`
- `packages/host/src/chatgpt.ts`, `chatgpt-oauth.ts`, `chatgpt-store.ts`,
  `chatgpt-transport.ts`, and `chatgpt.test.ts`
- `packages/platform/src/chatgpt.ts` and `chatgpt.test.ts`
- `apps/desktop/src/main.ts` and `preload.ts`
- `packages/ui/src/chatgpt-context.tsx`, `pages/ChatGPTSettings.tsx`,
  `pages/Research.tsx`, settings navigation and shell
- `scripts/fixtures/chatgpt.tsx` and `scripts/check-chatgpt.mjs`
- `docs/design-docs/chatgpt-desktop-connection.md`

### Validation And Remaining Limits

- `make ci` passed: 107 TypeScript tests, renderer/desktop builds, repository
  checks and Go vet/race tests. `git diff --check` passed.
- Real isolated Electron smoke/capability tests and renderer chat completion,
  partial failure/retry and composer-continuity checks passed. Settings screenshot
  reviewed; diagnostics remain in ignored artifacts.
- Public OpenAI discovery fetch from Node succeeded; public clients are supported.
- The user completed browser authentication/plan consent. The live account
  returned seven models. The actual app completed a minimal reply showing
  `AIFi connection works.` and retained its connection after restart.
- Live service SSE omitted Content-Type; fixed the overly strict header gate
  while retaining framing, size, terminal completion and explicit-type checks.
  Added missing-header and conflicting-type regressions.
- Added normal Electron single-instance ownership after duplicate old processes
  exposed stale UI state. A second launch exited and focused the existing app.
- Live expiry/refresh and revocation were not forced; synthetic tests cover them.
  The user's working connection remains signed in.
- Automated identity/inference checks use generated test credentials and mocked
  OpenAI transport. No personal tokens or authorization URLs were recorded.
- Added an independent `pnpm smoke:chatgpt` renderer check so this integration
  can be committed and verified without the pre-existing UI-continuity changes.
- Added the original official Cookbook URL and supporting registration, inference,
  session and availability links to the implementation doc and reference index.
- Before committing, exported only staged ChatGPT changes over the committed
  baseline into an isolated directory. Offline frozen-lockfile installation,
  `make ci` (99 tests in that isolated snapshot), and `pnpm smoke:chatgpt` passed
  without the unrelated pending directory/cache/continuity work. The earlier
  107-test result above includes that shared-workspace work.
- `pnpm smoke:desktop` also passed from the isolated staged snapshot, validating
  native launch, sandboxed IPC and ChatGPT settings independently of pending work.

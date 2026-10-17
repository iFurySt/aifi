# ChatGPT Desktop Connection

## Goal

Connect the open-source local Electron app to the official Sign in with ChatGPT
flow and complete real text conversations using the user's authorized plan.
No OpenAI console application, client secret, or API key is required: initial
dynamic registration returns the client ID that AIFi subsequently reuses.

## Scope

- Desktop account registration, reconnect, account selection, protected token
  persistence, serialized renewal, cancellation, and session revocation.
- Account-specific model discovery, bounded streaming text chat, explicit usage
  controls, first-use confirmation, and actionable errors.
- Narrow Electron capabilities; browser-only builds explain desktop availability.
- Excludes hosted/commercial deployment, API-key billing, autonomous research,
  source collection, and model tool execution in this first connection slice.

## Context and Risks

- Follow `docs/design-docs/chatgpt-auth-and-plan-usage.md`, `docs/SECURITY.md`,
  and the official registration, inference, and session guides linked there.
- Preserve pre-existing working-tree edits, including the chat scroll fix.
- Never expose tokens or authorization URLs to the renderer, logs, or artifacts.
- Verify JWT signature/issuer/audience/nonce and actual granted scopes. Keep
  registration identity separate from email and preserve issued IDs on failure.
- Protect rotating refresh tokens against concurrent runtimes; incomplete streams
  must not become completed assistant messages.
- Real account consent requires the user in the browser; automated tests use
  generated test identities and mocked OpenAI transport, never existing tokens.

## Milestones and Validation

- [x] Recheck official dynamic registration and current app boundaries.
- [x] Implement host storage, OAuth, models, inference, and cancellation.
- [x] Wire desktop IPC, settings, and real chat with safe persistence.
- [x] Add auth/stream/boundary regressions; run type checks, tests, builds, CI,
      and actual isolated Electron smoke/UI review.
- [x] Update architecture/security/frontend/setup/release/history documentation.
- [x] Offer the running app for real browser consent; clearly record any live
      validation that still needs the user's account interaction.
- [x] User-assisted acceptance: browser Passkey/Touch ID and consent, seven
      account models, completed reply and restart without a new sign-in verified.
      Revocation/expiry remain synthetic checks; retain the user's working connection.

## Verification Log

- 2026-10-17: `make ci` passed, including 107 TypeScript tests, production
  builds and Go vet/race checks. `pnpm smoke:desktop` passed with ChatGPT capability
  checks and streamed-chat persistence/failure/retry renderer checks.
- 2026-10-17: Visually inspected isolated Electron settings. OpenAI's public
  discovery endpoint is reachable from Node and supports public clients.
- 2026-10-17: Rebuilt and launched the real app, opened Settings → ChatGPT,
  and started official sign-in. Browser reached OpenAI Passkey/Touch ID verification;
  requested the user complete authentication and plan consent. No real tokens
  or authorization URLs were saved to test artifacts.
- 2026-10-17: Live inference exposed an absent Content-Type header on a valid
  HTTP 200 SSE response. Added compatibility with strict event/completion checks
  and a regression for missing versus conflicting content types. Live host and
  actual desktop requests completed; the UI showed `AIFi connection works.`.
- 2026-10-17: Confirmed two old app processes could cause stale UI state; added
  a single-instance lock. Restart restored the account/models, and a second
  normal launch exited successfully while retaining the existing process/window.
- 2026-10-17: Added standalone `pnpm smoke:chatgpt` checks and a curated official
  reference list. Exported the staged integration without unrelated pending UI
  work; offline frozen-lockfile installation, `make ci` (99 tests) and the standalone
  chat check passed in that isolated snapshot before commit/push.

## Decisions

- 2026-10-17: Desktop first, direct official public OAuth/Responses endpoints.
  No credential reuse from Codex or ChatGPT and no API-key fallback.

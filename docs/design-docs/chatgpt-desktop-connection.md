# ChatGPT Desktop Connection

Status: implemented; live sign-in, model discovery, completed inference and restart verified.
Reviewed: 2026-10-17.

## Official Open-Source Integration References

OpenAI explicitly supports Sign in with ChatGPT and optional ChatGPT plan usage
for open-source tools and personal projects running locally. Eligible Plus/Pro
users can authorize AIFi to use their plan without an API key. This is an official
integration, not a private-endpoint workaround or reuse of Codex credentials.

- [Official Cookbook: Integrating Sign in with ChatGPT in your Opensource App](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt)
  is the original integration tutorial, published 2026-09-28.
- [Quickstart and availability](https://developers.openai.com/siwc/quickstart)
  separates open-source plan usage from partner-only identity integration.
- [Open-source overview](https://developers.openai.com/siwc/token-sharing-open-source)
  defines client registrations and installation host IDs.
- [Registration and sign-in](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)
  documents dynamic registration: no pre-created console app or client secret;
  persist the issued client ID before exchange and reuse it afterward.
- [Models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference),
  [preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations),
  and [accounts and sessions](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions)
  define supported requests, feature limits, renewal, revocation and shared usage.

Identity sign-in and permission to spend plan allowance are separate. Signing in
does not expose existing ChatGPT conversations. Availability is account/workspace
dependent; do not generalize this local open-source path to a hosted or paid service.

## Setup And Scope

Run `pnpm install`, `pnpm build`, and `pnpm desktop`. Open Settings → ChatGPT,
choose **Continue with ChatGPT**, complete browser sign-in and plan consent,
then return to AIFi. Dismiss the first-use confirmation, choose a model and send
a short message in Chat. **Manage usage** opens ChatGPT usage settings. Add
account, selection, reconnect, cancel and sign out are supported.

No environment variable, OpenAI console app, API key or client secret is required.
Dynamic registration returns the issued client ID; AIFi saves it before exchange
and reuses it on reconnect, including after failed exchange. An eligible account,
region/workspace and explicit permission are still required. See
[official registration](https://developers.openai.com/siwc/token-sharing-open-source/sign-in).

This slice is desktop-only; Web directs users to desktop. Chats have no attached
market-data context or model tools and answers are drafts. Source collection,
autonomous research, brokerage, hosted service and API-key billing are outside
this slice. Existing market-data reads/collection remain independent.

## Host And Credential Boundary

Core declares contracts. The Node host owns OAuth, models and inference. Electron
main validates top frame, origin and methods on a dedicated capability. Preload
exposes display state, model choices and request-scoped deltas, never tokens,
client IDs, subjects or authorization URLs. Renderer CSP remains restricted.
Normal launches share a single Electron instance; a second launch focuses the
existing window. Smoke profiles remain isolated from the user's running app.

Attempts use fresh state/nonce/S256 PKCE and a bounded `127.0.0.1` listener at
`/auth/callback` on an available port. Callbacks validate method, host, path,
unique parameters, state, issued client ID and one-use transaction state. Pinned
`jose` verifies RS256 signatures against OpenAI JWKS, issuer, audience, expiration,
issued-at and nonce. Reconnect must match the existing verified subject. Actual
granted scopes gate inference separately; emails never merge registrations.

The data directory contains `chatgpt/profiles.enc` (AES-256-GCM) and
`chatgpt/vault.key` (a private 32-byte file key). New directories use 0700 and
files 0600. This shares the existing vault threat model: same-user filesystem
access can read the key. Back up both files together. Atomic replacements retain
committed state; corrupt/unsafe storage fails closed. Credential files, temporary
writes and locks are ignored by Git; Vite denies the ChatGPT storage subtree.

One stable host ID serves at most 20 separate registrations. Storage is bounded
to 1 MiB. File transactions serialize rotating refresh tokens across runtimes
and recover exited owners' locks. Sign out revokes the renewable session and
clears local tokens while retaining registration and host ID. Failed remote
revocation directs the user to disconnect AIFi in ChatGPT settings. Workspace
Reset does not remove the separate ChatGPT connection.

## Inference And Persistence

The account's `GET /v1/models` supplies displayable choices. A one-minute host
cache validates model IDs; switching accounts refreshes choices. OAuth-authenticated
`POST /v1/responses` uses `store: false`, `stream: true`, explicit history and
developer instructions. No private backend, Codex credentials, unsupported
generation controls, paid fallback or automatic inference retry are used.

One foreground request per host accepts at most 100 messages, 100,000 context
characters, 2,000 characters per new user message, 32,000 output characters,
2 MiB streamed bytes and a three-minute deadline. Illustrative assistant replies
are excluded from context. Partial deltas stay in memory; only nonempty text
followed by `response.completed` becomes a saved assistant message. The live direct
route can omit Content-Type; absent headers are accepted only through the same
bounded SSE event parser, while conflicting explicit media types are rejected. Failed,
incomplete, cancelled and interrupted streams remain retryable. Request/chat
IDs reject late updates after switching or resetting. Leaving Chat cancels generation.

History retains local workspace storage with backward-compatible optional message
provenance. Quota errors remain visible; this is not the durable evidence/artifact
store. Draft replies must not be treated as sourced research reports.

## Verification

Host regressions use generated JWTs, a real callback listener and mocked OpenAI
transport. They cover encryption, registration before exchange, identity checks,
scope gating, renewal, revocation failure, completion and malformed capabilities.
`pnpm smoke:desktop` checks the actual sandboxed app with an isolated profile.
`pnpm smoke:chatgpt` uses synthetic model transport to check React chat
persistence, provisional failures/retry and composer continuity. No real tokens
or auth URLs enter test artifacts.

On 2026-10-17, user-completed browser consent, seven account-specific models,
and a completed text reply were verified against the live official service.
The actual desktop UI displayed `AIFi connection works.` after restart without
another sign-in. A duplicate launch exited and kept the existing instance.
Live refresh-expiry and revocation were not exercised; synthetic tests cover
those paths and the user's working connection was retained. See
[plan research](chatgpt-auth-and-plan-usage.md) for broader eligibility/restrictions.

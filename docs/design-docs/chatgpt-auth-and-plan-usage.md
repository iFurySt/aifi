# ChatGPT Sign In and Plan Usage for AIFi

Status: researched integration option; documentation only, no implementation.
Reviewed: 2026-10-12.

AIFi can pursue an official Sign in with ChatGPT integration for its open-source,
locally running research tool. Eligible Plus and Pro users can authorize model
requests against their ChatGPT plan without supplying an API key. This flow also
returns verified identity. A general identity-only website login has different
availability: it currently requires access through the selected commercial
partner trial. AIFi has not registered or tested an integration.

The official [Quickstart](https://developers.openai.com/siwc/quickstart) distinguishes
these paths. The [OpenAI Cookbook tutorial](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt),
published 2026-09-28, explicitly includes research tools among the intended
open-source harnesses. The tutorial's publication date is evidence that this is
a documented integration, not a commitment that every deployment or account is
eligible.

## Availability by Deployment

| AIFi deployment or capability | Current documented path | Consequence |
| --- | --- | --- |
| Open-source CLI, desktop app, or local runtime with a browser UI | Dynamic client registration and optional ChatGPT plan authorization | Suitable candidate for users who clone and run AIFi themselves |
| Verified identity within that client | Validate the returned OpenID Connect ID token | Identity and permission to spend plan allowance remain separate |
| User-operated remote VM | Documented local authorization and protected credential transfer procedure | Evaluate the self-hosted VM guide; do not assume the browser callback reaches the VM |
| General identity-only website login | Selected commercial partner trial with a registered OAuth client | Do not assume registration is publicly available like a general Google login integration |
| Paid or centrally hosted plan usage | OpenAI's interest and approval path | Open-source source code alone does not establish eligibility for a hosted service |

Sources: [website identity guide](https://developers.openai.com/siwc/website),
[open-source overview](https://developers.openai.com/siwc/token-sharing-open-source),
and [self-hosted VMs](https://developers.openai.com/siwc/token-sharing-open-source/self-hosted-vms).
The personal VM procedure is distinct from a company-operated service for many
users. Recheck availability when selecting a deployment.

## Identity and Model Permission

The identity scope set is `openid profile email`. Plan access additionally
requests `offline_access resource.invoke chatgpt.tokens.use.direct`. Verify the
ID token before accepting account identity, then inspect the granted scopes
before allowing inference. A successful identity result alone does not prove
that plan use was granted. Neither permission reads existing ChatGPT chats.
[Registration and sign-in](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)
describes these checks.

For AIFi, keep application identity, inference credentials, and broker access as
three separate concerns. ChatGPT authorization does not replace Schwab or Plaid
authorization. Selecting a ChatGPT account must not silently select or link an
investment account based on matching email addresses.

## Open Source Authorization Flow

The future local runtime would follow this sequence:

1. Persist a stable host identifier and prepare a loopback listener, fresh
   transaction state, nonce, and PKCE challenge.
2. Open the system browser. First registration uses `dynamic_agent_client` and
   the AIFi app name; later sign-ins use the issued registration.
3. Let the user choose their ChatGPT account and workspace and authorize the
   requested permissions.
4. Validate the callback and save the issued client identifier. Exchange the
   code with its matching PKCE verifier, callback URI, and API resource.
5. Verify identity and granted permissions, then save credentials separately
   for that account registration in protected runtime storage.
6. Discover available models and send eligible requests with the access token.

This public-client flow needs no client secret or partner API key. Its callback
must use `127.0.0.1`; the registration placeholder is not the issued client ID
used for token exchange. See the
[registration guide](https://developers.openai.com/siwc/token-sharing-open-source/sign-in).

The [overview](https://developers.openai.com/siwc/token-sharing-open-source) separates
a registration, bound to a user and workspace, from the machine running it.
Hosts need distinct stable identifiers; restarting AIFi should not create a new
one. The [VM procedure](https://developers.openai.com/siwc/token-sharing-open-source/self-hosted-vms)
authorizes locally, transfers protected credentials through a secure channel,
and lets the VM own later refreshes. Host-specific attribution and revocation
for transferred sessions are not yet available.

## Inference Contract and Research Tools

The supported request path is the public Responses API,
`POST https://api.openai.com/v1/responses`, authenticated with the OAuth access
token. Discover the selected account's models from `GET /v1/models` rather than
assuming the normal API-key catalog or a fixed model. HTTP calls require
`store: false` and `stream: true`; wait for `response.completed` before declaring
success. An early text delta can precede a terminal failure.
[Models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)
provides the current request contract. AIFi does not need to route these calls
through Codex or ChatGPT's private backend.

The current [preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)
matter to a research runtime:

- Send necessary history explicitly. Persistent server conversation references
  and HTTP background execution are unavailable.
- Function and custom tools have a prescribed namespace or input-item format.
  Built-in web search depends on the selected model and account policy.
- Hosted File Search, Code Interpreter, MCP/connectors, image generation, and
  tool search are unavailable on this route. AIFi should perform evidence
  retrieval, calculations, and connector calls in its own runtime.
- Common controls such as `temperature` and `max_output_tokens` are unsupported.
  A standard API-key request builder cannot be reused unchanged.

AIFi should preserve its own evidence archive and workflow state. This is an
architectural implication of the route's contract, not an implemented storage
decision. The authorization covers eligible model requests; it does not supply
financial data licenses or pay for Schwab, Plaid, news, or other providers.

## Usage Limits and Sessions

Users manage app access, allowance, and credits in ChatGPT settings. Plus has a
five-hour limit shared across apps using the plan; AIFi would not receive its
own extra allowance. That five-hour limit does not apply to Pro, which still
must not be advertised as universally unlimited.
[Accounts and sessions](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions)
documents this distinction. No fixed token allowance or reset schedule is
assumed for AIFi.

The [token reference](https://developers.openai.com/siwc/token-sharing-open-source/token-reference)
currently specifies one-hour access tokens and renewable 30-day refresh tokens.
The runtime must atomically replace rotated credentials and serialize refresh
for a session. Tokens belong in protected local or user-controlled runtime
storage, outside browser storage, Git, logs, and research artifacts. Sign-out
should revoke the renewable session and clear local tokens.
[Session management](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions)
defines the renewal and sign-out behavior.

When consent is missing, preserve valid identity but disable plan inference.
Usage-limit errors should pause requests; temporary availability errors need
bounded retry; unsupported capabilities require a corrected request. AIFi must
not silently switch to paid API-key billing. See
[errors and recovery](https://developers.openai.com/siwc/token-sharing-open-source/errors-and-recovery).

The future interface should use **Continue with ChatGPT**, show which account
and funding path are active, and provide **Manage usage**. Respect the user's
plan and credit permissions, and make alternative billing an explicit choice.
[UI/UX guidelines](https://developers.openai.com/siwc/ui-ux-guidelines)
describe these product requirements.

## AIFi Direction and Follow Up

Treat ChatGPT plan usage as a useful optional provider for a future local AIFi
runtime. Preserve user-supplied API keys and other model providers as separate
choices. A plan-specific adapter should handle authorization, account-specific
models, supported requests, streaming completion, and session renewal. Research
skills should depend on a capability contract rather than on one billing path.

This task implements no authentication or model calls and does not add a new
first-wave requirement. Before implementation:

1. Recheck eligibility and limitations for the selected local or self-hosted
   deployment, user account, workspace, and serving region.
2. Validate the official OAuth flow with an eligible test account, including
   declined consent, renewal, revocation, and account switching.
3. Exercise a representative research tool call and terminal stream failures;
   check tool formats instead of assuming the complete Responses feature set.
4. Define credential storage and explicit provider selection before adding UI.
5. Revisit OpenAI approval independently if a company-operated hosted product
   is proposed. Keep this separate from the
   [Schwab and Plaid direction](broker-connectivity-direction.md).

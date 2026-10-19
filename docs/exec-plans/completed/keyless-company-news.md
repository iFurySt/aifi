# Keyless company news

Completed 2026-10-19.

## Findings and goal
Digest has no snapshots because news is disabled and the only source is FMP;
the current key receives HTTP 402. Personal FMP Starter+ includes news; personal
use is not itself the restriction. Rallies displays its own prose summaries but
the inspected public article does not disclose the upstream supplier.
Yahoo's direct public ticker RSS returns current AAPL headlines without a key.

## Scope and decisions
- Add bounded, identity-validated Yahoo RSS collection through the existing Yahoo
  budget/worker. Persist normalized metadata/snippets and immutable evidence;
  normal reads remain offline and retain last-good data on collection failure.
- New installations default to enabled Yahoo news. Keep legacy enable/disable
  choices and enabled legacy FMP selections; expose Yahoo/FMP in Sync settings.
  Explicitly enable Yahoo news for the current user after validation.
- Show source-dated, deduplicated headlines, short feed-provided snippets and
  safe original links. Do not relabel this as an AI-generated digest, copy Rallies
  prose or scrape full articles. Surface disabled/empty states accurately.
- Preserve concurrent dirty work using scoped staging and independent validation.

## Verification
- Collector: exact endpoint/symbol, budget gate, no auth/cookies, feed identity,
  malformed XML/XXE/size limits, invalid/future dates, duplicate ordering/URL safety.
- Store/engine: scheduler fairness, defaults/legacy choices, persisted restart
  reads with zero HTTP, disabled status and last-good preservation.
- UI: populated/empty/disabled Digest, safe links and settings source selection;
  TypeScript/Go tests/build and isolated desktop layout/read checks.
- Bounded actual collection into the user's existing store, read-back verification
  and refreshed App. Document source findings, tests and remaining limitations.

## Outcome
- Added the fixed Yahoo RSS collector, persisted evidence/metadata, fair worker
  rotation, source selection and readable disabled/empty Digest states. Fresh
  installs enable Yahoo news; legacy choices remain intact. Safe headlines/snippets
  and original links use actual publication time and existing source details.
- Independent staged snapshot passed TypeScript, 14 core/link tests, production
  renderer build, market/store/research/service Go suites, CLI build and the new
  company-news Electron gate at wide/narrow and light/dark widths. Current-workspace
  full app build and scoped Go vet also passed.
- Enabled Yahoo news in the current local configuration, collected/persisted eight
  valid AAPL items, reopened the actual App and verified visible news. The restarted
  background worker then automatically stored nine MSFT items, proving ongoing
  collection. Existing accounts, other settings and stored research were retained.
- Rallies' upstream provider remains undisclosed by the public pages inspected;
  AIFi uses the directly verified Yahoo feed, with FMP optional per entitlement.

# 2026-05-21 Target Refresh: Intel Market Signal

## Goal

Review tracked targets under `research/targets`, identify incremental public
information since the latest archive refresh, save any material evidence, and
decide whether a user notification is warranted.

## Scope

- Targets: `anthropic`, `cbrs`, `intc`, `nbis`, `nok`, `nvda`, `openai`.
- Sources: target archive baselines, company newsrooms / investor relations,
  SEC or filing mirrors where applicable, product release notes, and reputable
  market-data / financial-news sources for price and analyst-context signals.
- Output: archive updates only for material incremental evidence; run-level
  notification logs remain private under `research/notification-log/`.

## Plan

1. Load repository collaboration, archive, history, and notification rules.
2. Read each target profile and index to establish the latest archived baseline.
3. Search current sources target by target.
4. Archive material incremental evidence and update target navigation.
5. Commit and push completed archive changes.
6. Send a Resend notification only if the incremental evidence is time-sensitive
   or useful for asset / watchlist management.

## Current Findings

- `intc`: material market-signal update. The market continues to re-rate Intel
  around foundry optionality, 18A supply / adoption pressure, possible Apple
  interest, and analyst target revisions, while official company releases still
  do not confirm a signed Apple / 14A external-customer commitment.
- `nvda`: Q1 FY2027 result and call readthrough already archived earlier today;
  the next unresolved item is the Q1 FY2027 10-Q.
- `anthropic`, `cbrs`, `nbis`, `nok`, `openai`: no newer high-materiality
  update found beyond items already archived in the latest target refreshes.

## Risks

- Intel update is largely market narrative and secondary-source driven. The note
  must clearly distinguish confirmed company disclosures from analyst/news
  interpretation and unconfirmed Apple / 18A customer reports.
- Live market data is time-sensitive and should be labeled with the exact date.

## Validation

- Check that new evidence includes metadata, source URLs, retrieval date, and
  confidence.
- Run `git diff --check`.
- Commit scoped changes and attempt `git push origin main`.


# Notification Log

Use `research/notification-log/` for private records created by scheduled
research update runs when the run decides whether to notify the user.

This directory is intentionally gitignored. It can contain recipient addresses,
sent email bodies, run-local judgments, and other operational notes that should
not become repository history.

## Directory Layout

```text
research/notification-log/
  decisions/
    2026-05-20-run.md
  sent/
    2026-05-20-nvda-earnings-preview.md
    2026-05-20-intc-material-news.md
```

- `decisions/`: one file per research run that records which targets were
  reviewed, what changed, and why each item was sent or skipped.
- `sent/`: one file per outbound notification that records exactly what was
  sent and the evidence that supported it.

Keep notification records global instead of under `research/targets/*/`.
Outbound messages are cross-target workflow artifacts, and a global log makes
deduplication, audit, and run-level summaries easier.

## Naming

- Decision files: `YYYY-MM-DD-run.md`, or `YYYY-MM-DD-run-N.md` if there are
  multiple scheduled runs in one day.
- Sent files: `YYYY-MM-DD-<target-or-theme>-<short-topic>.md`.
- Use lowercase slugs and keep filenames stable once created.

## Sent Record Template

```markdown
---
target: nvda
sent_at: 2026-05-20T09:30:00+08:00
to: ifuryst@gmail.com
subject: "NVDA earnings preview"
source_run: 2026-05-20-run
---

## Why Sent

Briefly state the threshold-crossing change or time-sensitive reason.

## Incremental Information

Summarize only what is new relative to the prior tracked state.

## Email Body

Record the final body that was sent.

## Evidence Links

- Link to local evidence, target artifacts, filings, transcripts, news, or data
  snapshots used for the notification.
```

## Decision Record Template

```markdown
---
run_date: 2026-05-20
status: complete
---

## Scope

- Targets reviewed:
- Sources checked:

## Notifications Sent

- `sent/2026-05-20-nvda-earnings-preview.md`: reason.

## Skipped Items

- `intc`: no material change since the last run.

## Follow-Ups

- Open research questions or future events to watch.
```

## Repository Boundary

Do not put notification policy or reusable decision rules in the gitignored
log. Version those rules in repository docs, product specs, or skills so future
agents can inspect and improve them.

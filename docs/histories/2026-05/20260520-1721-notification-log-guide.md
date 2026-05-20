## [2026-05-20 17:21] | Task: Notification log guide

### Execution Context

- Agent ID: `codex`
- Base Model: `GPT-5`
- Runtime: `local shell`

### User Query

> Add repository guidance for a gitignored notification-log directory used to
> record sent research notifications and run decisions; update `.gitignore` and
> `AGENTS.md` navigation as needed.

### Changes Overview

- Area: research workflow documentation and repository hygiene.
- Key actions: added notification-log conventions, ignored the private log
  directory, and linked the guide from `AGENTS.md`.

### Design Intent

Keep private sent-message records out of git while preserving a repository-local
contract for future agents. The guide chooses a global log under `research/`
because notification decisions can span multiple targets and need run-level
deduplication and auditability.

### Files Modified

- `docs/NOTIFICATION_LOG.md`
- `.gitignore`
- `AGENTS.md`
- `docs/histories/2026-05/20260520-1721-notification-log-guide.md`

# Contributing

AIFi is an agent-first investment research workspace. Contributions should make
the skills, research archive, and local documentation easier for agents and
humans to reuse.

## Working Agreement

- Start from `AGENTS.md`, then read the linked docs that match the task.
- Keep repository knowledge in versioned files, not only in chat or ticket comments.
- If behavior changes, update skills, docs, research examples, scripts, and
  history records together.
- Keep research claims traceable to sources. Do not replace uncertainty with a
  polished but unsupported answer.
- For large or risky work, create an execution plan under `docs/exec-plans/active/`.

## Before Opening A Pull Request

- Run `make ci`.
- Add or update a history entry if the task changed skills, docs, scripts, or
  workflow behavior.
- Update release notes only when the change is user-visible.
- Verify affected skills, examples, and scripts still match the current behavior.
- If the change touches archived research, preserve source links, retrieval
  dates, and notes about uncertainty.

## Review Expectations

- Prefer small, scoped pull requests.
- Call out research-quality risks, data-retention concerns, migrations, and
  deferred follow-ups explicitly.
- Link to the relevant plan, spec, or history file when context is important.

## Contribution License

Submit original contributions under the repository's GNU Affero General Public
License v3.0 only (`AGPL-3.0-only`). You must have the rights to contribute the
material under those terms. Retain the origin and license notices of third-party
material; the repository license does not replace their separate terms.

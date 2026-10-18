# ChatGPT account management UX

## Goal and decisions
Follow sign-in → chat → account management. Anonymous account-menu identity is the
single ChatGPT sign-in CTA. Signed-in identity opens account settings; Usage stays
a separate menu action. Settings lists real saved accounts with Name/Email, Active,
Use account, Sign in/Reconnect, Add account and per-account Sign out. Model choice
remains in Chat. Keep external ChatGPT usage as a low-emphasis link,
not another descriptive settings row.

## Scope and safeguards
Reuse existing auth actions and scopes. No OAuth/host/credential changes. Never sign
out, add or switch the real user's accounts during verification: use synthetic
profiles for auth mutations and inspect the real signed-in settings read-only.
Preserve first-use plan notice, cancel and actionable errors, unavailable desktop
state and connected-but-plan-permission-missing state. Preserve unrelated work.

## Work
- [x] Inspect account menu, connection settings, host actions and chat model chooser.
- [x] Implement anonymous and signed-in routes plus compact account list.
- [x] Verify multiple profiles, reconnect, cancellation, errors and menu/model routes.
- [x] Review light/dark/narrow screenshots, update docs/history and refresh App.

## Validation
TypeScript, synthetic account UI/auth-action checks, existing chat interaction gate,
production renderer build and native read-only settings inspection. Verify a clean
snapshot of task-scoped changes before commit.

## Outcome
Implemented without auth/credential changes. TypeScript and account/Chat gates
passed both in the shared working tree and a clean task-scoped snapshot. Reviewed
light/dark and 390px account layouts. The production renderer built successfully;
the real signed-in App now shows the compact account list and connected identity
opens that settings page. Real sign-in, switch and sign-out were not exercised.

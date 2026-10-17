# Compact account and settings surfaces

Status: completed, 2026-10-17.

- [x] Balance/slightly narrow icon+text rail, enlarge account control.
- [x] Replace anonymous A with a person icon; reuse existing ChatGPT sign-in,
      connected identity and official Manage usage action in a compact menu.
- [x] Add Command/Ctrl+, Settings shortcut and compact settings spacing/controls.
- [x] Verify anonymous/connected states with synthetic auth, UI layout/shortcuts,
      preserve the existing real connection and unrelated work; document,
      commit and push after the underlying ChatGPT integration is committed.

Official docs currently document a browser Manage usage link, not a confirmed
remaining-percentage API for this flow. Show no invented quota percentage.

Validation: TypeScript, 107 unit tests, production builds, account/chat/desktop
smokes, Chrome desktop/mobile visual checks, and real macOS Command+, both with
and without the account menu open. The existing connection survived restart;
no real OAuth, inference, sign-out or usage mutation was performed.

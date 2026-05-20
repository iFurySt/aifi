---
name: resend-email-cli
description: Send transactional or operational emails for AIFi through the authenticated Resend CLI. Use when the user asks to send, draft-and-send, test, schedule, or verify email delivery from the AIFi sender address aifi@ifuryst.com using Resend.
---

# Resend Email CLI

Use this skill when AIFi needs to send email through Resend from the local
machine. The Resend CLI is already authenticated with the `default` profile in
macOS Keychain.

## Defaults

- Sender: `aifi@ifuryst.com`
- CLI command: `resend`
- Profile: default, unless the user explicitly asks for another profile
- API key handling: never print, persist, copy, or expose API keys
- Telemetry: set `RESEND_TELEMETRY_DISABLED=1` for agent-run commands

The user decides the recipient, subject, and content at send time. Do not invent
missing required fields. If any of `to`, `subject`, or body is absent, ask for
the missing value before sending.

## Workflow

1. Confirm the CLI is available with `command -v resend`.
2. For a new environment or suspected auth issue, run:

   ```sh
   RESEND_TELEMETRY_DISABLED=1 resend whoami --json
   ```

3. Build the email using the requested `to`, `subject`, body, and any optional
   fields such as `cc`, `bcc`, `reply-to`, attachments, tags, or schedule.
4. Prefer a dry run when the content is complex, has attachments, or the user
   asks to inspect before sending:

   ```sh
   RESEND_TELEMETRY_DISABLED=1 resend emails send \
     --from aifi@ifuryst.com \
     --to recipient@example.com \
     --subject "Subject" \
     --text "Plain text body" \
     --dry-run
   ```

5. Send exactly what the user approved or requested:

   ```sh
   RESEND_TELEMETRY_DISABLED=1 resend emails send \
     --from aifi@ifuryst.com \
     --to recipient@example.com \
     --subject "Subject" \
     --text "Plain text body" \
     --json
   ```

6. Report the result concisely, including the Resend email id when returned.

## Body Handling

- Use `--text` for short plain-text messages.
- Use `--html` or `--html-file` only when HTML is requested or clearly needed.
- Use `--text-file -` or `--html-file -` for long bodies to avoid shell quoting
  problems.
- Preserve the user's exact intended meaning. Do not add marketing language,
  disclaimers, signatures, or extra content unless requested.

## Optional Commands

- List recent sent emails:

  ```sh
  RESEND_TELEMETRY_DISABLED=1 resend emails list --json
  ```

- Get a sent email:

  ```sh
  RESEND_TELEMETRY_DISABLED=1 resend emails get <email-id> --json
  ```

- Diagnose setup:

  ```sh
  RESEND_TELEMETRY_DISABLED=1 resend doctor --json
  ```

## Safety Gate

Before any real send, verify:

- `--from` is `aifi@ifuryst.com`
- at least one recipient is explicit
- subject is explicit
- body source is explicit
- attachments, if any, are intended and path-resolved
- scheduled sends include the exact intended time or natural-language schedule

Do not use hidden Resend API keys or direct HTTP calls when the CLI can perform
the task.

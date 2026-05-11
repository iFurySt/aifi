# Security Policy

This repository currently stores AIFi skills, documentation, scripts, and
research artifacts. It does not ship a production service, release artifact, or
dependency graph yet.

## Reporting

Do not open a public issue for a suspected vulnerability.

Use a private channel to contact the maintainer or repository owner, and include:

- Affected area and impact.
- Reproduction steps or proof of concept.
- Known mitigations or workarounds.

## Scope

Security-sensitive issues include:

- committed secrets, tokens, cookies, or private API keys
- private research files or non-public company information committed by mistake
- unsafe scripts that could delete data, exfiltrate files, or run untrusted input
- external integration changes that weaken authentication, authorization, or
  source handling

Out of scope for now:

- dependency vulnerability reports where no dependency manifest or lockfile is
  present
- deployment, runtime, or infrastructure reports before those surfaces exist

When application code, dependencies, or deployment infrastructure are added,
update this file with a concrete security contact, supported versions, and
response expectations.

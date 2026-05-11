# AIFi Research Archive Layout

The archive lives in the repository so agents can reuse evidence across sessions.
Use relative links inside markdown files whenever possible.

## Target Directory

```text
research/targets/<ticker-or-slug>/
```

Required files:

- `profile.md`: stable target identity created by `research-target-resolver`
- `index.md`: navigation, latest artifact links, source coverage, open gaps

Optional directories:

- `evidence/filings/`: SEC filings, annual reports, investor presentations,
  regulatory notices
- `evidence/earnings/`: earnings releases, call transcripts, guidance notes
- `evidence/news/`: dated news digests and primary press releases
- `evidence/market/`: price, volume, valuation, options, short interest, and
  relative-performance notes
- `evidence/competitors/`: peer comparisons, sector maps, product comparisons
- `evidence/risks/`: legal, operational, geopolitical, balance-sheet, and
  thesis-risk notes
- `evidence/media/`: images, charts, PDFs, screenshots, and other source files
- `artifacts/memos/`: synthesized research memos
- `artifacts/decision-frames/`: action-oriented scenario frames
- `artifacts/watchlists/`: monitoring checklists and trigger definitions

## File Naming

Use stable, sortable names:

```text
YYYY-MM-DD-source-topic.md
YYYY-MM-DD-source-topic.pdf
YYYY-MM-DD-artifact-kind.md
```

Examples:

```text
2026-05-11-sec-10q-summary.md
2026-05-11-investor-relations-q1-release.pdf
2026-05-11-news-digest.md
2026-05-11-decision-frame.md
```

## Evidence Metadata Block

Put this near the top of each evidence note:

```markdown
## Metadata

- Target:
- Evidence type:
- Source:
- Source URL:
- Retrieved:
- Published:
- Coverage period:
- Confidence:
- Raw file:
```

## Target Index Template

```markdown
# <Target> Research Index

## Latest Artifacts

| Date | Artifact | Notes |
| --- | --- | --- |

## Evidence Coverage

| Area | Latest file | Coverage | Gaps |
| --- | --- | --- | --- |

## Reusable Facts

- 

## Open Questions

- 
```

## Redaction Rules

Do not store:

- account credentials or session cookies
- private brokerage account details unless the user explicitly asks and the
  security posture is documented
- full paid research reports when redistribution is not allowed
- unnecessary personal data from social, forum, or email sources

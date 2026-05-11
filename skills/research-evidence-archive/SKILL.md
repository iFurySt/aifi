---
name: research-evidence-archive
description: Create and maintain persistent AIFi research archives in the current repository. Use when collecting, saving, deduplicating, citing, or reusing source materials such as markdown notes, filings, PDFs, images, transcripts, charts, datasets, and generated research artifacts under research/*.
---

# Research Evidence Archive

Use this skill whenever research materials need to be saved, reused, or linked
across AIFi workflows. The archive is part of the product: old material should
compound into better future research instead of disappearing into chat history.

## Workflow

1. Identify the `ResearchTarget` and archive path.
2. Create the target directory if it does not exist.
3. Save source material in the right subdirectory.
4. Record metadata, retrieval date, source URL or file origin, and confidence.
5. Deduplicate against existing material before adding new files.
6. Link synthesized notes back to raw evidence.
7. Update indexes so future skills can discover reusable material quickly.

## Archive Layout

Use this default layout:

```text
research/
  targets/
    <ticker-or-slug>/
      profile.md
      index.md
      evidence/
        filings/
        earnings/
        news/
        market/
        competitors/
        risks/
        media/
      artifacts/
        memos/
        decision-frames/
        watchlists/
```

Read `references/archive-layout.md` before creating or reorganizing archive
files.

## Evidence Rules

- Prefer markdown for extracted notes and structured summaries.
- Preserve original files when they are useful: PDFs, images, spreadsheets, HTML
  snapshots, and downloaded datasets can live beside markdown summaries.
- Never overwrite useful prior evidence without preserving history or explaining
  why it is obsolete.
- Every synthesized claim should link to one or more evidence items.
- Label generated analysis separately from source material.

## Output

Return:

- files created or updated
- sources stored
- duplicates skipped
- stale or missing metadata
- next skills that can consume the archive

## Quality Gate

Before finishing, check:

- target archive has an `index.md`
- new evidence has source and retrieval metadata
- raw and synthesized materials are clearly separated
- paths are stable and lowercase where practical
- no secrets, paid-content dumps, or private account data were stored

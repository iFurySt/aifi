---
name: earnings-call-analysis
description: Analyze earnings releases, earnings-call transcripts, management commentary, analyst Q&A, guidance changes, and language shifts for investment research. Use when the user asks about quarterly results, management tone, guidance, or what changed in the latest earnings call.
---

# Earnings Call Analysis

Use this skill to understand what management said, what analysts challenged, and
how guidance or tone changed. Treat the call as evidence, not as truth.

## Workflow

1. Load the target profile and existing earnings archive.
2. Collect the earnings release, presentation, transcript, and replay notes when
   available.
3. Extract headline results, guidance, segment commentary, and management
   priorities.
4. Analyze the Q&A separately from prepared remarks.
5. Compare current language to prior calls when a trend or surprise matters.
6. Save the analysis under `research/targets/<target>/evidence/earnings/`.
7. Hand off numerical metrics to financial snapshot and strategic claims to
   thesis synthesis.

Read `references/call-analysis-checklist.md` before writing an earnings note.

## Output

Return:

- earnings event inventory
- management message summary
- analyst Q&A pressure points
- guidance changes and uncertainty labels
- language shifts versus prior calls
- archive files created or updated
- handoffs to financials, risks, and thesis

## Quality Gate

Before finishing:

- label prepared remarks, Q&A, and agent interpretation separately
- preserve event date, fiscal period, and source
- avoid treating management optimism as confirmed fact
- mark missing transcript or missing prior-period comparison
- keep long transcript quotes out of generated artifacts unless brief and needed

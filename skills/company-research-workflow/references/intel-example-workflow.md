# Intel-Like Company Research Workflow

Use this as the default decomposition for a request like:

```text
I want to understand Intel's recent situation from different angles.
```

## Default Run

1. `research-target-resolver`
   - Resolve Intel Corporation, `INTC`, exchange, sector, aliases, and peers.
   - Create or update `research/targets/intc/profile.md`.

2. `research-evidence-archive`
   - Create `research/targets/intc/index.md`.
   - Reuse prior Intel materials when present.

3. `company-news-research`
   - Collect recent company announcements, media coverage, product news,
     management changes, subsidies, litigation, and restructuring events.

4. `company-filing-research`
   - Review recent 10-K, 10-Q, 8-K, proxy, and investor-relations disclosures.
   - Extract risk-factor and management-discussion changes.

5. `earnings-call-analysis`
   - Review latest earnings release, presentation, transcript, guidance, and Q&A.
   - Compare management tone against prior calls when possible.

6. `financial-snapshot-analysis`
   - Build revenue, margin, cash flow, balance sheet, capex, foundry, data
     center, client, and valuation snapshot.

7. `market-signal-analysis`
   - Compare `INTC` price action against semiconductor peers, relevant index,
     and event windows.

8. `competitive-landscape-analysis`
   - Compare with AMD, Nvidia, TSMC, Samsung Foundry, and other relevant peers by
     segment.

9. `investment-thesis-synthesis`
   - Produce bull/base/bear cases, risk register, watchlist triggers, and a
     user-controlled decision frame.

## Evidence Coverage Expectations

The final artifact should make these areas visible:

- latest filings reviewed
- latest earnings event reviewed
- latest market data timestamp
- recent-news date range
- peer set used
- missing materials
- stale or conflicting evidence

## Archive Deliverables

Expected files after a complete run:

```text
research/targets/intc/profile.md
research/targets/intc/index.md
research/targets/intc/evidence/news/<date>-news-digest.md
research/targets/intc/evidence/filings/<date>-filing-review.md
research/targets/intc/evidence/earnings/<date>-earnings-call.md
research/targets/intc/evidence/market/<date>-financial-snapshot.md
research/targets/intc/evidence/market/<date>-market-signal-note.md
research/targets/intc/evidence/competitors/<date>-competitive-landscape.md
research/targets/intc/artifacts/decision-frames/<date>-thesis-frame.md
```

## Stop Conditions

Stop and surface the gap instead of forcing a polished memo when:

- the target is ambiguous
- current retrieval fails for a "latest" request
- source dates are unknown
- the archive contains contradictory material that has not been reconciled
- the user is asking for execution of a trade rather than research support

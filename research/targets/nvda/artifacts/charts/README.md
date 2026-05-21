# NVIDIA Chart Artifacts - 2026-05-11

## Files

- [NVIDIA research dashboard](2026-05-11-nvda-dashboard.html): static, self-contained HTML dashboard with inline SVG charts.
- [NVIDIA Q1 FY2027 earnings dashboard](2026-05-21-nvda-earnings-dashboard.html): static, self-contained Chinese HTML visualization for the post-earnings analysis, with KPI tiles, revenue, Data Center, margin, surprise, valuation, and scenario panels.

## Data Sources

- `research/targets/nvda/evidence/market/2026-05-11-financial-snapshot.md`
- `research/targets/nvda/evidence/news/2026-05-11-news-digest.md`
- `research/targets/nvda/evidence/competitors/2026-05-11-competitive-landscape.md`
- `research/targets/nvda/evidence/news/2026-05-21-q1-fy2027-results.md`
- `research/targets/nvda/evidence/earnings/2026-05-21-q1-fy2027-call-readthrough.md`
- `research/targets/nvda/evidence/market/2026-05-21-post-earnings-market-snapshot.md`
- `research/targets/nvda/artifacts/memos/2026-05-21-earnings-analysis-zh.md`

## Transformations

- FY2025 Data Center revenue in the growth chart is derived from NVIDIA's disclosure that FY2026 Data Center revenue of $193.7B grew 68% year over year.
- Specialized-market composition uses rounded figures from NVIDIA's Q4 FY2026 release. The residual category reconciles rounded segment figures to FY2026 total revenue.
- Margins are reported percentages from NVIDIA's FY2026 release and 10-K. Q1 FY2027 gross margin is company guidance.
- Risk metrics use FY2026 10-K customer-concentration, inventory, supply-obligation, cash, marketable-securities, and operating-cash-flow disclosures.
- The Q1 FY2027 earnings dashboard uses rounded values from the official release and AP article; valuation ratios use an AP-reported approximate $5.4T market value and simple run-rate math.

## Limitations

- No live market price, valuation multiple, or consensus estimate series is included.
- Charts are static and optimized for a compact research readout, not a full model dashboard.
- The 2026-05-21 dashboard does not include live quote refresh, volume, options/implied-move, or a full sell-side estimate table.

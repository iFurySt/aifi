# Cerebras Systems Research Target

## Identity

- Canonical name: Cerebras Systems Inc.
- Ticker: CBRS
- Exchange: Nasdaq Global Select Market
- Country: United States
- Sector: Technology
- Industry: AI infrastructure / semiconductor systems
- Website: https://www.cerebras.ai/
- Investor relations: https://investors.cerebras.ai/
- Common aliases: Cerebras, Cerebras Systems, CBRS, Cerebras Systems Inc.
- User-provided phrases: Cerebras

## Scope Notes

- Research scope: Public-company investment research after the May 2026 IPO.
- Exclusions: No brokerage execution, no personalized trade instruction.
- Ambiguities: The company was private until the May 2026 IPO; older private-company summaries may be stale.
- Last resolved: 2026-05-15 12:27 CST

## Peer Set

| Peer | Ticker | Why included |
| --- | --- | --- |
| NVIDIA | NVDA | Dominant AI accelerator and software ecosystem benchmark. |
| Advanced Micro Devices | AMD | GPU accelerator competitor and second-source AI compute supplier. |
| Broadcom | AVGO | Custom AI accelerator, networking, and hyperscaler ASIC exposure. |
| Marvell Technology | MRVL | Custom silicon and data-center interconnect peer. |
| Alphabet / Google | GOOGL | TPU stack and internal AI infrastructure competitor. |
| Amazon | AMZN | AWS distribution partner and Trainium/Inferentia internal silicon competitor. |
| Groq | Private | Low-latency inference specialist competing for speed-sensitive workloads. |

## Source Notes

| Source | Retrieved | Notes |
| --- | --- | --- |
| SEC 424B4 final IPO prospectus | 2026-05-15 | Primary source for IPO terms, 2025 financials, RPO, customer concentration, risk factors, WSE-3 details. |
| SEC Form 8-A | 2026-05-15 | Confirms Nasdaq registration of Class A common stock. |
| Cerebras pricing press release | 2026-05-15 | Company confirmation of IPO pricing and listing date. |
| Yahoo Finance CBRS quote page | 2026-05-15 | Market quote source for first-day close and day range. |
| Reuters/Investing.com IPO debut report | 2026-05-15 | Secondary source for opening trade and fully diluted valuation estimate. |

## Downstream Handoff

```yaml
research_target:
  canonical_name: Cerebras Systems Inc.
  ticker: CBRS
  exchange: Nasdaq Global Select Market
  country: United States
  sector: Technology
  industry: AI infrastructure / semiconductor systems
  aliases:
    - Cerebras
    - Cerebras Systems
    - CBRS
  peer_tickers:
    - NVDA
    - AMD
    - AVGO
    - MRVL
    - GOOGL
    - AMZN
  archive_path: research/targets/cbrs
  resolved_at: 2026-05-15T12:27:00+08:00
```

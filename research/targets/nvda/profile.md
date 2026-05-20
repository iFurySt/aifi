# NVIDIA Corporation Research Target

## Identity

- Canonical name: NVIDIA Corporation
- Ticker: NVDA
- Exchange: Nasdaq
- Country: United States
- Sector: Technology
- Industry: Semiconductors / AI infrastructure
- Website: https://www.nvidia.com/
- Investor relations: https://investor.nvidia.com/
- Common aliases: NVIDIA, Nvidia, NVDA, 英伟达
- User-provided phrases: NVIDIA 的情况

## Scope Notes

- Research scope: Public-company investment research for NVIDIA Corporation.
- Exclusions: No brokerage execution, no personalized trade instruction.
- Ambiguities: None for the current request.
- Last resolved: 2026-05-11 23:30 CST

## Peer Set

| Peer | Ticker | Why included |
| --- | --- | --- |
| Advanced Micro Devices | AMD | Direct data center accelerator and server CPU competitor. |
| Broadcom | AVGO | Custom AI accelerators, networking, and AI infrastructure peer. |
| Taiwan Semiconductor Manufacturing Company | TSM | Key foundry dependency and AI supply-chain benchmark. |
| Intel | INTC | CPU, AI PC, foundry, and NVIDIA partnership/competition context. |
| Marvell Technology | MRVL | Custom silicon and data center networking peer. |
| Alphabet, Amazon, Microsoft, Meta | GOOGL/AMZN/MSFT/META | Major customers, custom silicon competitors, and AI capex setters. |

## Source Notes

| Source | Retrieved | Notes |
| --- | --- | --- |
| NVIDIA FY2026/Q4 earnings release | 2026-05-11 | Primary earnings and guidance source. |
| NVIDIA FY2026 Form 10-K | 2026-05-11 | Primary filing, customer concentration, liquidity, commitments, risk source. |
| NVIDIA Q1 FY2027 conference-call notice | 2026-05-11 | Confirms next earnings date: 2026-05-20. |
| Microsoft, Alphabet, Amazon Q1 2026 disclosures | 2026-05-11 | AI capex/customer-demand context. |
| Reuters/Bloomberg/industry media snippets | 2026-05-11 | China export-control and H200 restart context; secondary-source layer. |
| NVIDIA Q1 FY2027 call notice and event page | 2026-05-20 | Primary source for result release timing, call timing, and post-release monitoring setup. |
| NVIDIA Q1 FY2027 release, SEC 8-K mirror, and AP report | 2026-05-21 | Primary/secondary sources for Q1 actuals, Q2 guide, capital return, reporting-framework change, consensus comparison, and AI infrastructure readthrough. |

## Downstream Handoff

```yaml
research_target:
  canonical_name: NVIDIA Corporation
  ticker: NVDA
  exchange: Nasdaq
  country: United States
  sector: Technology
  industry: Semiconductors / AI infrastructure
  aliases:
    - NVIDIA
    - Nvidia
    - NVDA
    - 英伟达
  peer_tickers:
    - AMD
    - AVGO
    - TSM
    - INTC
    - MRVL
  archive_path: research/targets/nvda
  resolved_at: 2026-05-21T06:20:43+08:00
```

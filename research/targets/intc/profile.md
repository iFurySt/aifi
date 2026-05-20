# Intel Corporation Research Target

## Identity

- Canonical name: Intel Corporation
- Ticker: INTC
- Exchange: Nasdaq
- Country: United States
- Sector: Technology
- Industry: Semiconductors
- Website: https://www.intel.com/
- Investor relations: https://www.intc.com/
- Common aliases: Intel, INTC, 英特尔
- User-provided phrases: Intel 最近大涨, Intel 资产配置

## Scope Notes

- Research scope: Public-company investment research for Intel Corporation.
- Exclusions: No brokerage execution, no personalized trade instruction.
- Ambiguities: None for the current request.
- Last resolved: 2026-05-11 15:11 CST

## Peer Set

| Peer | Ticker | Why included |
| --- | --- | --- |
| Advanced Micro Devices | AMD | x86 CPU, data center CPU, client CPU, AI accelerator competition. |
| NVIDIA | NVDA | AI infrastructure platform leader and Intel AI CPU/platform partner. |
| Taiwan Semiconductor Manufacturing Company | TSM | Leading external foundry benchmark. |
| Samsung Electronics | 005930.KS | Foundry alternative for advanced-node and US manufacturing discussions. |
| Broadcom | AVGO | Custom silicon, networking, AI infrastructure, and semiconductor margin benchmark. |
| Qualcomm | QCOM | Client/edge compute and Arm-based PC/AI device competition. |

## Source Notes

| Source | Retrieved | Notes |
| --- | --- | --- |
| Intel Investor Relations Q1 2026 release | 2026-05-11 | Primary earnings source. |
| Intel Q1 2026 10-Q | 2026-05-11 | Primary filing source. |
| Intel Q1 2026 prepared remarks | 2026-05-11 | Management commentary source. |
| Bloomberg, Reuters/Investing.com, Motley Fool, FX Leaders | 2026-05-11 | Secondary market/news sources for recent rally and Apple/Terafab reports. |
| Intel press-release list | 2026-05-20 | Official low-materiality update check for post-baseline company announcements. |

## Downstream Handoff

```yaml
research_target:
  canonical_name: Intel Corporation
  ticker: INTC
  exchange: Nasdaq
  country: United States
  sector: Technology
  industry: Semiconductors
  aliases:
    - Intel
    - INTC
    - 英特尔
  peer_tickers:
    - AMD
    - NVDA
    - TSM
    - AVGO
    - QCOM
  archive_path: research/targets/intc
  resolved_at: 2026-05-20T18:07:00+08:00
```

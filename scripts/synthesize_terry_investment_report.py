#!/usr/bin/env python3
"""Synthesize the current Terry YouTube research archive into a report draft."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


DEFAULT_TARGET_DIR = Path("research/targets/terry-chen-youtube")


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def format_evidence_refs(refs: list[str]) -> str:
    return ", ".join(f"`{Path(ref).name}`" if ":" not in ref else f"`{Path(ref.split(':')[0]).name}:{ref.split(':')[-1]}`" for ref in refs)


def table_rows(items: list[dict[str, Any]]) -> str:
    lines = []
    for item in items:
        lines.append(
            f"| {item['category']} | {item['claim']} | {format_evidence_refs(item.get('evidence', []))} |"
        )
    return "\n".join(lines)


def priority_rows(items: list[dict[str, Any]]) -> str:
    if not items:
        return "| - | - | No unresolved title-only hypotheses after the latest online-provider batch. | - | - |"
    lines = []
    for idx, item in enumerate(items, start=1):
        video = item.get("video") or ", ".join(item.get("videos", []))
        title = item.get("title") or "-"
        lines.append(f"| {idx} | `{video}` | {title} | {item.get('hypothesis')} | {item.get('priority')} |")
    return "\n".join(lines)


def transcript_ok_ids(manifest: list[dict[str, Any]]) -> set[str]:
    return {row["id"] for row in manifest if row.get("status") == "ok" and row.get("id")}


def unresolved_title_hypotheses(items: list[dict[str, Any]], ok_ids: set[str]) -> list[dict[str, Any]]:
    unresolved: list[dict[str, Any]] = []
    for item in items:
        if item.get("video"):
            if item["video"] not in ok_ids:
                unresolved.append(item)
            continue
        videos = [video for video in item.get("videos", []) if video not in ok_ids]
        if videos:
            copied = dict(item)
            copied["videos"] = videos
            unresolved.append(copied)
    return unresolved


def latest_allocation_markdown(target_dir: Path) -> str:
    gwn_path = (
        target_dir
        / "evidence"
        / "media"
        / "transcripts"
        / "Gwn_kEegfJ4.provider-aivideosummarizer.txt"
    )
    if not gwn_path.exists():
        return "The public net-worth / asset-allocation video is still missing transcript text."
    return "\n".join(
        [
            "- `Gwn_kEegfJ4.provider-aivideosummarizer.txt:21-36`: stocks are the largest asset class, about 47% of total personal assets; Tesla is about half of the stock portfolio, with Palantir, Nvidia, and VOO among the other major stock holdings.",
            "- `Gwn_kEegfJ4.provider-aivideosummarizer.txt:39-48`: Terry says he basically does not hold bonds, aside from a small iBond amount that he ignores for allocation purposes.",
            "- `Gwn_kEegfJ4.provider-aivideosummarizer.txt:71-78`: real-estate net equity is about 19% of total assets.",
            "- `Gwn_kEegfJ4.provider-aivideosummarizer.txt:79-117`: real estate is split across Toronto, Seattle, and California, with Toronto long-term rented and US properties managed for Airbnb / rental use.",
            "- `Gwn_kEegfJ4.provider-aivideosummarizer.txt:143-157`: real-estate income covers all mortgages plus basic living expenses, and is treated as a cash-flow survival engine.",
            "- `Gwn_kEegfJ4.provider-aivideosummarizer.txt:159-168`: crypto is about 15% of total assets, mostly Bitcoin, then Ethereum, with small altcoin exposure.",
            "- `Gwn_kEegfJ4.provider-aivideosummarizer.txt:221-227`: for learners, he frames 1-5% crypto exposure as a possible starting range if it is money they can afford not to need for several years.",
            "- `Gwn_kEegfJ4.provider-aivideosummarizer.txt:358-397`: cash is about 19% of total assets, mainly in IB at about 3.7% interest plus some USDT yield on OKX.",
            "- `Gwn_kEegfJ4.provider-aivideosummarizer.txt:398-414`: private-company shares are excluded from total assets because the value could be zero or very large before liquidity events.",
        ]
    )


def ledger_summary_markdown(target_dir: Path) -> str:
    ledger_path = target_dir / "artifacts" / "decision-frames" / "2026-07-13-investment-evidence-ledger.json"
    if not ledger_path.exists():
        return "No structured evidence ledger has been generated yet."
    ledger = load_json(ledger_path)
    summary = ledger.get("summary", {})
    category_counts = summary.get("category_counts", {})
    top_keywords = summary.get("top_keywords", {})
    lines = [
        f"- Evidence ledger entries: {len(ledger.get('entries', []))}",
        f"- Category counts: `{json.dumps(category_counts, ensure_ascii=False)}`",
        f"- Top keywords: `{json.dumps(dict(list(top_keywords.items())[:12]), ensure_ascii=False)}`",
        "- Ledger artifact: `2026-07-13-investment-evidence-ledger.md`",
    ]
    return "\n".join(lines)


def priority_transcript_synthesis_markdown() -> str:
    return """## Priority Transcript Derived Synthesis

### Portfolio And Wealth Development

| Period / source | What changed | Evidence-backed read |
| --- | --- | --- |
| Older allocation disclosure | The older allocation video describes a more growth-oriented, opportunity-seeking portfolio: traditional stocks around 11%, high-growth stocks around 22%, Bitcoin around 5%, private-company stock around 21%, real estate around one third, and cash around 8%. | `52XVsVj6b4E.provider-aivideosummarizer.txt:54-71`, `52XVsVj6b4E.provider-aivideosummarizer.txt:110-125`, `52XVsVj6b4E.provider-aivideosummarizer.txt:214-241`, `52XVsVj6b4E.provider-aivideosummarizer.txt:260-291` |
| Older allocation process | Even in the older allocation video, Terry frames broad ETFs as the simple default, says he had shifted toward buying ETFs rather than individual names, and warns against blindly copying another person's holdings because risk capacity differs by age and situation. | `52XVsVj6b4E.provider-aivideosummarizer.txt:34-45`, `52XVsVj6b4E.provider-aivideosummarizer.txt:59-71`, `52XVsVj6b4E.provider-aivideosummarizer.txt:91-109` |
| Latest allocation disclosure | The latest allocation video shifts the disclosed mix toward stocks around 47%, real-estate net equity around 19%, crypto around 15%, and cash around 19%, while excluding private-company shares from the total. | `Gwn_kEegfJ4.provider-aivideosummarizer.txt:21-36`, `Gwn_kEegfJ4.provider-aivideosummarizer.txt:71-78`, `Gwn_kEegfJ4.provider-aivideosummarizer.txt:159-168`, `Gwn_kEegfJ4.provider-aivideosummarizer.txt:358-414` |
| Passive-income buildout | The passive-income path moved from yield platforms and real-estate optimization toward a multi-engine stack: rental/Airbnb cash flow, covered-call income, side-business income, cash yield, and crypto/stablecoin yield. | `hbJ0S2hINWg.provider-aivideosummarizer.txt:319-359`, `2avMoXe8Bwg.txt:41-66`, `L7xgc12JfHA.provider-aivideosummarizer.txt:312-334`, `P6XYXfePAsA.provider-aivideosummarizer.txt:79-137` |
| Creator-income role | The recovered YouTube-income video supports treating creator income as a side engine and distribution asset, not the main wealth engine: year-one ad revenue was modest relative to time cost, sponsorships mattered, and Terry said YouTube income was unlikely to exceed his core professional income. | `KLjed4HMArA.provider-aivideosummarizer.txt:29-51`, `KLjed4HMArA.provider-aivideosummarizer.txt:120-145`, `KLjed4HMArA.provider-aivideosummarizer.txt:152-183`, `KLjed4HMArA.provider-aivideosummarizer.txt:250-284` |
| Modern allocation view | The recovered 60/40 critique video supports a more adaptive allocation philosophy: classic 60/40 is explained as stock/bond balance, but Terry argues recent stock/bond correlation, debt, inflation, and geopolitical reserve shifts justify adding neutral assets such as gold, oil, and Bitcoin while keeping a healthy cash position. | `XJtbWhnclB4.provider-aivideosummarizer.txt:1-18`, `XJtbWhnclB4.provider-aivideosummarizer.txt:38-70`, `XJtbWhnclB4.provider-aivideosummarizer.txt:120-188`, `XJtbWhnclB4.provider-aivideosummarizer.txt:191-197`, `XJtbWhnclB4.provider-aivideosummarizer.txt:317-360` |
| Risk maturity | The later yield-platform videos are more explicit about where yield comes from, collateral liquidation, platform risk, and why high advertised rates require skepticism. | `L7xgc12JfHA.provider-aivideosummarizer.txt:80-112`, `L7xgc12JfHA.provider-aivideosummarizer.txt:147-165`, `HL26tMSTqO4.provider-aivideosummarizer.txt:139-155`, `HL26tMSTqO4.provider-aivideosummarizer.txt:274-287` |

Interpretation: Terry's path does not look like a single static portfolio. It looks like an operator/investor sequence: high-skill income creates surplus, surplus is put into concentrated growth/private equity/real estate, then the portfolio is gradually converted into income engines and liquidity failovers. The most transferable part is not the exact weights; it is the progression from earning power, to investable surplus, to risk buckets, to cash-flow resilience.

### Ordinary-Investor Translation

| Terry practice | Ordinary-person translation | Boundary |
| --- | --- | --- |
| Broad ETFs are the simple default even for someone interested in single names. | Start with a diversified core before stock picking. Use active selection only as a capped learning sleeve. | Do not copy his historical concentration unless you can copy the income, time horizon, and drawdown tolerance behind it. |
| Cash is kept for opportunity and survival, not just idleness. | Keep a runway plus deployable cash so drawdowns become optionality rather than forced selling. | Cash/yield products are not all equivalent; Treasuries, broker cash interest, stablecoin lending, and platform yield sit in different risk buckets. |
| Real estate income is engineered by layout, tenant type, manager choice, and vacancy control. | Treat rental/Airbnb as an operating project with underwriting, manager selection, legal constraints, and exit-value risk. | Do not treat gross rent as passive income; model management fees, utilities, insurance, vacancy, repairs, and resale impact. |
| Creator work is useful but not automatically a main income engine. | Treat content as skill compounding, distribution, and optional sponsorship upside before treating it as salary replacement. | Do not quit a high-income core job for creator income until unit economics and stress level are proven. |
| Covered calls and puts are used as entry/exit and cash-flow tools. | Learn options only after owning the underlying thesis and understanding assignment, capped upside, liquidity, and tax consequences. | Covered calls are not free yield; the transcript explicitly flags capped upside and the seller's obligation. |
| Yield platforms are evaluated by spread, collateral, liquidity, and counterparty risk. | If using crypto/platform yield at all, cap it as a risk sleeve and require a written source-of-yield explanation. | Any 15-20% "risk-free" or guaranteed yield claim should be treated as a warning sign unless the source and failure modes are clear. |
| 60/40 is a baseline, not a law. | Use stock/bond diversification as a starting model, then stress test inflation, stock/bond correlation, currency/debt risk, and whether a small neutral-asset sleeve is justified. | Neutral assets can diversify macro risk, but they can also be volatile and should not replace the core portfolio wholesale. |

### Practical Learning Sequence

1. Build an income and runway map before picking assets.
2. Use a broad ETF baseline and benchmark every active idea against it.
3. Add one written single-stock thesis only after defining maximum size and failure conditions.
4. Underwrite one real-estate cash-flow model with vacancy, manager fees, taxes, repairs, and resale impact.
5. Paper-trade covered calls / cash-secured puts before using them on real holdings.
6. Study crypto yield by tracing collateral, liquidation, custody, smart-contract, and centralized-platform risk.
7. Build a creator/business unit-economics sheet before treating side income as replaceable salary.
8. Stress-test the portfolio against 60/40 failure modes: inflation, correlated stock/bond drawdowns, currency risk, and neutral-asset volatility.
9. Write a portfolio policy that separates core, satellite, operating assets, cash, neutral assets, and speculative yield.
"""


def write_report(args: argparse.Namespace) -> Path:
    target_dir = args.target_dir
    media_dir = target_dir / "evidence" / "media"
    artifact = load_json(
        target_dir
        / "artifacts"
        / "decision-frames"
        / "2026-07-13-evidence-backed-portfolio-timeline.json"
    )
    videos = load_json(media_dir / "youtube-video-index.json")
    manifest = load_json(media_dir / "transcripts" / "manifest.json")
    queue = load_json(media_dir / "asr" / "queue.json")
    selected_queue_path = media_dir / "asr" / "selected-queue.json"
    selected_queue = load_json(selected_queue_path) if selected_queue_path.exists() else []
    counts = load_json(media_dir / "2026-07-13-corpus-signal-counts.json")

    transcript_ok = sum(1 for row in manifest if row.get("status") == "ok")
    transcript_missing = sum(1 for row in manifest if row.get("status") == "missing")
    title_themes = counts.get("theme_counts_from_titles", {})
    title_assets = counts.get("asset_counts_from_titles", {})
    transcript_assets = counts.get("asset_counts_from_transcripts", {})
    ok_ids = transcript_ok_ids(manifest)
    unresolved_hypotheses = unresolved_title_hypotheses(
        artifact.get("title_only_hypotheses_to_verify_with_asr", []),
        ok_ids,
    )

    selected_lines = "\n".join(
        f"| {item['index']} | `{item['id']}` | {item['title']} |"
        for item in selected_queue
    ) or "| - | - | - |"

    markdown = f"""# Terry Chen Investment And Learning Report Draft

## Metadata

- Target: Terry Chen YouTube channel
- Artifact type: Evidence-backed synthesis draft
- Source: current Terry YouTube research archive
- Generated: 2026-07-13
- Coverage: {len(videos)} video titles; {transcript_ok} transcript files; {len(queue)} videos still lack stored transcript text; {transcript_missing} browser-readable transcript misses recorded
- Confidence: Medium for transcript-backed claims, including the latest and older allocation videos recovered through online providers; lower for exact historical weights, timing, realized returns, and claims that still depend on one hard-case provider. This draft is not financial advice.

## Current Evidence Coverage

The archive has full public channel link coverage, but not full spoken-text coverage. The strongest available evidence currently supports Terry's income-stack design, part of his wealth-development path, his latest disclosed high-level allocation, an older allocation anchor, passive-income examples, a creator-income unit-economics check, and a first ordinary-investor indexing-versus-stock-picking rule set. Exact position sizes, realized returns, leverage, taxes, and a fully reviewed historical allocation timeline remain incomplete.

## Transcript-Backed Claims

| Area | Claim | Evidence |
| --- | --- | --- |
{table_rows(artifact.get("confirmed_from_transcripts", []))}

## Current Signal Counts

Title themes:

```json
{json.dumps(title_themes, ensure_ascii=False, indent=2)}
```

Title asset/strategy signals:

```json
{json.dumps(title_assets, ensure_ascii=False, indent=2)}
```

Transcript asset/strategy signals:

```json
{json.dumps(transcript_assets, ensure_ascii=False, indent=2)}
```

## Structured Evidence Ledger

{ledger_summary_markdown(target_dir)}

## Portfolio History Draft

- Proven: Terry's latest transcript describes leaving salaried engineering work and relying on multiple income streams.
- Proven: covered calls, Tesla, Nvidia, Palantir, VOO, Airbnb/rental income, side-business income, YouTube income, IB01/short-term Treasuries, QQQI, stablecoin lending, crypto, cash yield, and private-company equity appear in transcript-backed evidence.
- Now partly proven: the latest public asset-allocation video discloses high-level allocation weights for stocks, real estate, crypto, and cash.
- Not yet proven: net worth, exact position sizes, realized returns, leverage, tax structure, and how allocation weights changed over time.
- Best current interpretation: his portfolio is not a plain index-only model. It appears to combine high human-capital income, concentrated equity exposure, option overlays, real estate/business cash flow, and yield/cash-management failovers.

## Latest Asset Allocation Extract

{latest_allocation_markdown(target_dir)}

## Wealth-Development Draft

1. Frugal capital formation: available transcripts support ordinary-family background, self-funded study, scholarships/subsidies, low-cost living, internships, and consulting.
2. High-income skill engine: software engineering and consulting became the capital-formation engine.
3. Concentrated compounding: title and transcript signals point to Tesla and other single-name growth exposure, but exact contribution to wealth remains unverified.
4. Income-stack diversification: covered calls, rentals, side business, creator income, and yield products appear as later-stage failovers.
5. Optionality phase: the current transcript-backed model emphasizes no longer depending on salary and building financial failovers.

{priority_transcript_synthesis_markdown()}

## Ordinary-Investor Portfolio Draft

This is a conservative translation of the evidence, not an attempt to copy Terry's risk profile.

1. Cash/runway layer: hold enough liquidity or short-duration safe yield to avoid forced selling.
2. Broad-market core: use diversified equity exposure as the default baseline before trying to beat the market.
3. Capped satellite sleeve: only use single-name concentration where the investor has a written thesis, position cap, and failure rule.
4. Income overlay: covered calls only after understanding stock ownership, assignment, missed-upside risk, taxes, and roll rules.
5. Real-estate/business sleeve: treat rentals and side businesses as operating assets, not passive magic.
6. Crypto/yield sleeve: cap size and separate custody risk, platform risk, and asset-price risk.
7. Human-capital engine: career skill, consulting, products, and distribution are part of the portfolio because they fund investments and reduce dependency on one employer.

## Practice-First Learning Plan

1. Build a personal cash-flow map and runway target.
2. Learn index investing and benchmark every active idea against it.
3. Write one full single-stock thesis with a failure case and max size.
4. Paper-trade covered calls before using real money.
5. Build a rental-property spreadsheet with vacancy, repairs, taxes, fees, and financing.
6. Learn crypto custody and platform risk before chasing yield.
7. Write a portfolio policy covering sizing, rebalancing, income targets, and failure scenarios.

## Remaining Online-Provider Priority Batch

| Index | Video id | Title |
| ---: | --- | --- |
{selected_lines}

## Title-Only Hypotheses To Verify

| Order | Video | Title | Hypothesis | Priority |
| ---: | --- | --- | --- | --- |
{priority_rows(unresolved_hypotheses)}

## Completion Criteria Still Missing

- Line-level review and cross-provider validation where possible for hard-case AI Video Summarizer transcripts.
- A dated historical portfolio timeline from old to recent allocation videos.
- Separation of actual holdings from educational examples, interviews, sponsorships, and product reviews.
- Position sizing rules, income contribution ranges, tax/leverage details, and drawdown behavior.
"""

    output = target_dir / "artifacts" / "memos" / "2026-07-13-terry-investment-learning-report-draft.md"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(markdown, encoding="utf-8")
    return output


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target-dir", type=Path, default=DEFAULT_TARGET_DIR)
    return parser.parse_args()


def main() -> None:
    output = write_report(parse_args())
    print(f"wrote {output}")


if __name__ == "__main__":
    main()

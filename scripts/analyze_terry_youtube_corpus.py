#!/usr/bin/env python3
"""Create preliminary investment-signal artifacts from Terry YouTube raw data."""

from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


DEFAULT_TARGET_DIR = Path("research/targets/terry-chen-youtube")


THEMES: dict[str, list[str]] = {
    "portfolio_disclosure": ["公開", "全部身家", "資產配置", "現金", "被動收入", "財富自由", "收入", "身家"],
    "equities_single_names": [
        "特斯拉",
        "Tesla",
        "Nvidia",
        "Palantir",
        "SpaceX",
        "台積電",
        "TSM",
        "比亞迪",
        "Cursor",
    ],
    "index_or_factor": ["大盤", "ETF", "高股息", "價值投資", "低本益比", "資產配置"],
    "options_income": ["選擇權", "期權", "covered call", "Covered Call", "賣 covered call"],
    "crypto": ["比特幣", "加密", "Crypto", "BNB", "山寨幣", "穩定幣", "區塊鏈", "冷錢包", "出入金"],
    "real_estate": ["房地產", "房子", "房車", "租金", "Airbnb", "房租", "東京的家"],
    "macro_regime": ["美元", "通貨膨脹", "資產配置法則", "市場", "泡沫", "股市", "危機", "財富正在輪動"],
    "career_wealth": ["工程師", "薪水", "Offer", "跳槽", "面試", "裁員", "退休", "職場"],
    "travel_lifestyle": ["旅行", "商務艙", "飯店", "越南", "東京", "不丹", "土耳其", "Vegas", "大阪"],
    "learning_tools": ["教學", "一次搞懂", "完整教學", "研究神器", "回測", "分析"],
}

ASSET_KEYWORDS: dict[str, list[str]] = {
    "TSLA / Tesla": ["TSLA", "Tesla", "特斯拉"],
    "NVDA / Nvidia": ["NVDA", "Nvidia", "輝達"],
    "PLTR / Palantir": ["PLTR", "Palantir"],
    "SpaceX": ["SpaceX"],
    "TSM / 台積電": ["TSM", "台積電"],
    "Bitcoin": ["Bitcoin", "BTC", "比特幣"],
    "BNB": ["BNB"],
    "Stablecoins / crypto lending": ["穩定幣", "放貸", "Nexo"],
    "IB01 / short-term Treasuries": ["IB01", "國債", "短期國債"],
    "QQQI": ["QQQI"],
    "Airbnb / rental real estate": ["Airbnb", "rental", "房租", "租金", "房地產"],
    "Covered calls": ["covered call", "Covered Call", "賣 covered call", "期權", "選擇權"],
    "Grid strategy": ["網格策略"],
}


def short_snippet(text: str, limit: int = 42) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= limit:
        return text
    return text[:limit].rstrip() + "..."


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def contains_any(text: str, keywords: list[str]) -> bool:
    return bool(matching_keywords(text, keywords))


def matching_keywords(text: str, keywords: list[str]) -> list[str]:
    lowered = text.lower()
    matches: list[str] = []
    for keyword in keywords:
        if keyword == "BNB":
            if re.search(r"(?<!air)\bbnb\b", lowered, flags=re.IGNORECASE):
                matches.append(keyword)
            continue
        if keyword.lower() in lowered:
            matches.append(keyword)
    return matches


def classify_titles(videos: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for video in videos:
        title = video.get("title") or ""
        themes = [name for name, keywords in THEMES.items() if contains_any(title, keywords)]
        assets = [
            {"asset": name, "matched_keywords": matching_keywords(title, keywords)}
            for name, keywords in ASSET_KEYWORDS.items()
            if contains_any(title, keywords)
        ]
        rows.append(
            {
                "index": video["index"],
                "id": video["id"],
                "title": title,
                "url": video["url"],
                "duration_seconds": video.get("duration_seconds"),
                "themes": themes,
                "assets": assets,
            }
        )
    return rows


def transcript_files(target_dir: Path) -> list[Path]:
    transcript_dir = target_dir / "evidence" / "media" / "transcripts"
    manifest_path = transcript_dir / "manifest.json"
    ok_ids: set[str] = set()
    if manifest_path.exists():
        manifest = load_json(manifest_path)
        ok_ids = {row["id"] for row in manifest if row.get("status") == "ok" and row.get("id")}
    candidates: dict[str, Path] = {}
    for path in sorted(transcript_dir.glob("*.txt")):
        video_id = transcript_video_id(path)
        if ok_ids and video_id not in ok_ids:
            continue
        current = candidates.get(video_id)
        if current is None or transcript_source_rank(path) < transcript_source_rank(current):
            candidates[video_id] = path
    return sorted(candidates.values())


def transcript_video_id(path: Path) -> str:
    stem = path.stem
    return stem.split(".provider-", 1)[0].split(".asr", 1)[0]


def transcript_source_rank(path: Path) -> tuple[int, str]:
    name = path.name
    if ".provider-aivideosummarizer" in name:
        rank = 1
    elif ".provider-kome" in name:
        rank = 2
    elif ".provider-tubetranscript-pro-ai" in name:
        rank = 3
    elif ".provider-youtubetranscript-pro" in name:
        rank = 4
    elif ".provider-" in name:
        rank = 5
    elif ".asr" in name:
        rank = 6
    else:
        rank = 0
    return (rank, name)


def extract_transcript_signals(target_dir: Path) -> list[dict[str, Any]]:
    signals: list[dict[str, Any]] = []
    media_dir = target_dir / "evidence" / "media"
    videos = load_json(media_dir / "youtube-video-index.json") if (media_dir / "youtube-video-index.json").exists() else []
    video_by_id = {video["id"]: video for video in videos if video.get("id")}
    for txt_path in transcript_files(target_dir):
        json_path = txt_path.with_suffix(".json")
        metadata = load_json(json_path) if json_path.exists() else {}
        video = metadata.get("video", {})
        video_id = transcript_video_id(txt_path)
        current_video = video_by_id.get(video_id, {})
        lines = txt_path.read_text(encoding="utf-8").splitlines()
        for i, line in enumerate(lines, start=1):
            matched_assets = [
                {"asset": name, "matched_keywords": matching_keywords(line, keywords)}
                for name, keywords in ASSET_KEYWORDS.items()
                if contains_any(line, keywords)
            ]
            matched_themes = [name for name, keywords in THEMES.items() if contains_any(line, keywords)]
            if matched_assets or matched_themes:
                signals.append(
                    {
                        "video_id": current_video.get("id") or video.get("id") or video_id,
                        "video_index": current_video.get("index") or video.get("index"),
                        "title": current_video.get("title") or video.get("title"),
                        "url": current_video.get("url") or video.get("url"),
                        "source_file": str(txt_path),
                        "line": i,
                        "themes": matched_themes,
                        "assets": matched_assets,
                        "snippet": short_snippet(line),
                    }
                )
    return signals


def counters(title_rows: list[dict[str, Any]], transcript_signals: list[dict[str, Any]]) -> dict[str, Any]:
    theme_counts: Counter[str] = Counter()
    asset_title_counts: Counter[str] = Counter()
    asset_transcript_counts: Counter[str] = Counter()
    for row in title_rows:
        theme_counts.update(row["themes"])
        asset_title_counts.update(asset["asset"] for asset in row["assets"])
    for signal in transcript_signals:
        asset_transcript_counts.update(asset["asset"] for asset in signal["assets"])
    return {
        "theme_counts_from_titles": dict(theme_counts.most_common()),
        "asset_counts_from_titles": dict(asset_title_counts.most_common()),
        "asset_counts_from_transcripts": dict(asset_transcript_counts.most_common()),
    }


def write_title_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=["index", "id", "title", "url", "duration_seconds", "themes", "assets"],
        )
        writer.writeheader()
        for row in rows:
            writer.writerow(
                {
                    **{key: row[key] for key in ["index", "id", "title", "url", "duration_seconds"]},
                    "themes": ";".join(row["themes"]),
                    "assets": ";".join(asset["asset"] for asset in row["assets"]),
                }
            )


def priority_score(row: dict[str, Any]) -> int:
    weights = {
        "portfolio_disclosure": 6,
        "options_income": 6,
        "index_or_factor": 5,
        "real_estate": 4,
        "crypto": 3,
        "equities_single_names": 3,
        "macro_regime": 2,
        "career_wealth": 1,
    }
    return sum(weights.get(theme, 0) for theme in row["themes"]) + len(row["assets"]) * 2


def write_gap_priority(target_dir: Path, rows: list[dict[str, Any]]) -> None:
    media_dir = target_dir / "evidence" / "media"
    manifest_path = media_dir / "transcripts" / "manifest.json"
    manifest = load_json(manifest_path) if manifest_path.exists() else []
    status_by_id = {row["id"]: row.get("status") for row in manifest}
    row_by_id = {row["id"]: row for row in rows}
    gaps: list[dict[str, Any]] = []
    for video_id, status in status_by_id.items():
        if status == "ok" or video_id not in row_by_id:
            continue
        row = row_by_id[video_id]
        score = priority_score(row)
        if score <= 0:
            continue
        gaps.append(
            {
                "priority_score": score,
                "index": row["index"],
                "id": row["id"],
                "title": row["title"],
                "url": row["url"],
                "transcript_status": status,
                "themes": row["themes"],
                "assets": [asset["asset"] for asset in row["assets"]],
            }
        )
    gaps.sort(key=lambda row: (-row["priority_score"], row["index"]))
    write_json(media_dir / "2026-07-13-high-priority-transcript-gaps.json", gaps)
    with (media_dir / "2026-07-13-high-priority-transcript-gaps.csv").open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=[
                "priority_score",
                "index",
                "id",
                "title",
                "url",
                "transcript_status",
                "themes",
                "assets",
            ],
        )
        writer.writeheader()
        for row in gaps:
            writer.writerow({**row, "themes": ";".join(row["themes"]), "assets": ";".join(row["assets"])})


def format_count_table(counts: dict[str, int]) -> str:
    if not counts:
        return "| Signal | Count |\n| --- | --- |\n| None | 0 |"
    lines = ["| Signal | Count |", "| --- | --- |"]
    for key, value in counts.items():
        lines.append(f"| {key} | {value} |")
    return "\n".join(lines)


def relevant_title_rows(rows: list[dict[str, Any]], limit: int = 40) -> list[dict[str, Any]]:
    priority_themes = {
        "portfolio_disclosure",
        "equities_single_names",
        "index_or_factor",
        "options_income",
        "crypto",
        "real_estate",
        "macro_regime",
    }
    selected = [row for row in rows if priority_themes.intersection(row["themes"]) or row["assets"]]
    return selected[:limit]


def write_markdown(
    target_dir: Path,
    path: Path,
    rows: list[dict[str, Any]],
    transcript_signals: list[dict[str, Any]],
    count_payload: dict[str, Any],
) -> None:
    manifest_path = target_dir / "evidence" / "media" / "transcripts" / "manifest.json"
    if manifest_path.exists():
        manifest = load_json(manifest_path)
        transcript_count = sum(1 for row in manifest if row.get("status") == "ok")
    else:
        transcript_count = len(transcript_files(target_dir))
    asr_queue_path = target_dir / "evidence" / "media" / "asr" / "queue.json"
    asr_queue_count = len(load_json(asr_queue_path)) if asr_queue_path.exists() else max(0, len(rows) - transcript_count)
    selected_titles = relevant_title_rows(rows)
    evidence_lines = []
    asset_first_signals = sorted(
        transcript_signals,
        key=lambda signal: (0 if signal["assets"] else 1, signal.get("video_index") or 9999, signal["line"]),
    )
    for signal in asset_first_signals[:16]:
        assets = ", ".join(asset["asset"] for asset in signal["assets"]) or ", ".join(signal["themes"])
        matched = ", ".join(
            keyword
            for asset in signal["assets"]
            for keyword in asset.get("matched_keywords", [])
        ) or ", ".join(signal["themes"])
        source = Path(signal["source_file"]).name
        evidence_lines.append(
            f"| {signal.get('video_index') or ''} | {signal.get('title') or signal['video_id']} | {assets} | `{source}:{signal['line']}` | {matched} |"
        )

    if not evidence_lines:
        evidence_table = "| Video | Title | Signal | Source | Note |\n| --- | --- | --- | --- | --- |\n| None | None | None | None | None |"
    else:
        evidence_table = "\n".join(
            ["| Video | Title | Signal | Source | Note |", "| --- | --- | --- | --- | --- |", *evidence_lines]
        )

    title_lines = [
        f"| {row['index']} | [{row['title']}]({row['url']}) | {', '.join(row['themes']) or '-'} | {', '.join(asset['asset'] for asset in row['assets']) or '-'} |"
        for row in selected_titles
    ]

    markdown = f"""# Terry Chen Preliminary Portfolio And Learning Frame

## Metadata

- Target: Terry Chen YouTube channel
- Artifact type: Preliminary investment-signal frame
- Source: `youtube-video-index.json` plus currently archived transcript text
- Source URL: https://www.youtube.com/@hackbearterry/videos
- Generated: 2026-07-13
- Coverage: {len(rows)} video titles; {transcript_count} unique transcript captures; {asr_queue_count} videos still lack stored transcript text. ASR remains a last-resort fallback after online link-to-transcript providers.
- Confidence: Low-to-medium. Title coverage is complete, but transcript coverage is sparse. Treat conclusions as a research scaffold, not final findings.

## What The Current Evidence Supports

The complete title inventory shows Terry's channel is heavily centered on single-name growth equities, crypto, options/income tactics, real estate or lifestyle-location decisions, macro regime shifts, and engineer-to-wealth career leverage. The currently archived transcripts add stronger direct evidence for the recent income-stack point: Terry says he has left salaried engineering work and currently relies on multiple income streams, including covered calls, Airbnb/rental income, side projects, YouTube, short-term Treasury/interest-style income, QQQI, and stablecoin lending references.

## Title Theme Counts

{format_count_table(count_payload["theme_counts_from_titles"])}

## Asset And Strategy Signals From Titles

{format_count_table(count_payload["asset_counts_from_titles"])}

## Asset And Strategy Signals From Available Transcripts

{format_count_table(count_payload["asset_counts_from_transcripts"])}

## High-Signal Videos To Prioritize For ASR

| Index | Video | Title themes | Asset / strategy signals |
| --- | --- | --- | --- |
{chr(10).join(title_lines)}

## Transcript Evidence Signals

{evidence_table}

## Preliminary Portfolio Hypothesis

- Core wealth engine appears to combine high-income engineering/career capital, concentrated long-term equity winners, and monetized derivative overlays.
- Current cash-flow stack appears diversified across covered calls, Airbnb/rental income, side projects, YouTube/creator monetization, and interest-like instruments. This is based mainly on the recent transcript and must be cross-checked against older videos.
- The equity risk profile is likely concentrated, not a plain broad-market index portfolio. Tesla is the strongest repeated signal in the available transcript and title set; Nvidia, Palantir, SpaceX, TSM, and broader AI/semiconductor themes appear as recurring title-level research targets.
- Crypto is a recurring sleeve, including Bitcoin, BNB, exchange/on-ramp education, cold wallets, and stablecoin lending. Current sizing and risk controls are not yet proven from available text.
- Real estate is both lifestyle and investment-linked: Airbnb/rental income, Seattle property handling, Japan property, and travel-location cost videos appear in the title map.

## Preliminary Wealth-Development Hypothesis

- Stage 1: education and frugal early career behavior; one available transcript references low-rent living and consulting while studying.
- Stage 2: high-income software engineering and consulting compounds investable surplus.
- Stage 3: concentrated equity exposure and long holding period become the visible wealth accelerator, especially Tesla references.
- Stage 4: income stack broadens from salary to options income, rental/Airbnb cash flow, side projects, creator income, and yield/cash-management instruments.
- Stage 5: recent positioning shifts from employment dependence toward optionality: ability to stop salary work without immediate lifestyle impairment.

## Practical Portfolio Frame To Test Against Full ASR

This is not a recommendation yet; it is a research hypothesis to validate once raw text coverage improves.

- Foundation: emergency cash and short-duration safe yield before taking concentrated risk.
- Market core: broad equity exposure or a diversified stock basket to prevent life-changing downside from one name.
- Concentrated satellite: a small, capped sleeve for high-conviction single names only after the foundation is funded.
- Income overlay: options income such as covered calls only against positions the investor can tolerate owning or trimming, with explicit roll/assignment rules.
- Real-asset/cash-flow sleeve: rental or business cash flow only where operations, leverage, and manager quality are understood.
- Crypto sleeve: capped and custody-aware; separate Bitcoin-like long-term exposure from platform, lending, and altcoin risk.
- Human-capital engine: career income, consulting, product building, or creator/business assets are treated as part of the portfolio because they fund investing and reduce forced selling.

## Practical Learning Plan To Test Against Full ASR

- Start from cash-flow literacy: income, expenses, runway, tax-aware account setup, and where idle cash sits.
- Learn broad-market investing before stock picking; measure any active idea against an index baseline.
- Study one concentrated-name case deeply, including valuation, drawdown, dilution, and exit rules.
- Learn options only after understanding stock ownership; covered calls come before complex spreads or leverage.
- Learn real estate through cash-flow math, vacancy, financing, operating burden, and manager incentives.
- Learn crypto in layers: custody, Bitcoin, stablecoins, exchanges, lending/platform risk, then higher-risk assets.
- Build a written portfolio policy that defines sizing, rebalancing, income targets, and what happens when a holding goes to zero.

## Evidence Gaps

- Full transcript coverage is missing for {asr_queue_count} videos.
- Publish dates for most videos are not yet normalized into the title inventory.
- Current allocation percentages, position sizes, net worth, tax location, leverage, and realized option/rental returns are not established.
- The final ordinary-person portfolio should wait for ASR coverage across explicit videos such as `公開我的全部身家，資產配置`, `分享我的被動收入`, `我把現金都放那了`, `為什麼你投資賺不到錢？該選股還是投大盤？`, and `其實退休沒那麼難`.
"""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(markdown, encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target-dir", type=Path, default=DEFAULT_TARGET_DIR)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    media_dir = args.target_dir / "evidence" / "media"
    artifact_dir = args.target_dir / "artifacts" / "decision-frames"
    videos = load_json(media_dir / "youtube-video-index.json")
    title_rows = classify_titles(videos)
    signals = extract_transcript_signals(args.target_dir)
    count_payload = counters(title_rows, signals)

    write_json(media_dir / "2026-07-13-title-theme-map.json", title_rows)
    write_title_csv(media_dir / "2026-07-13-title-theme-map.csv", title_rows)
    write_json(media_dir / "2026-07-13-transcript-signal-extract.json", signals)
    write_json(media_dir / "2026-07-13-corpus-signal-counts.json", count_payload)
    write_gap_priority(args.target_dir, title_rows)
    write_markdown(
        args.target_dir,
        artifact_dir / "2026-07-13-preliminary-portfolio-learning-frame.md",
        title_rows,
        signals,
        count_payload,
    )
    print(f"analyzed {len(videos)} titles and {len(signals)} transcript signal lines")


if __name__ == "__main__":
    main()

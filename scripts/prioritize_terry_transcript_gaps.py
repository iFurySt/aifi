#!/usr/bin/env python3
"""Prioritize remaining Terry transcript gaps for online-provider retries."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any


DEFAULT_TARGET_DIR = Path("research/targets/terry-chen-youtube")
OUTPUT_JSON = "2026-07-14-transcript-gap-priority.json"
OUTPUT_MD = "2026-07-14-transcript-gap-priority.md"


CATEGORIES: dict[str, dict[str, Any]] = {
    "portfolio_allocation": {
        "weight": 10,
        "keywords": ["投資組合", "資產配置", "配置", "倉位", "持倉", "投資", "portfolio", "allocation"],
        "why": "directly informs Terry's allocation, position sizing, and what not to copy",
    },
    "wealth_path": {
        "weight": 8,
        "keywords": ["財富", "自由", "退休", "成功", "收入", "賺", "年薪", "薪水", "工程師", "面試", "career", "財務"],
        "why": "connects human-capital income, career optionality, and wealth development",
    },
    "asset_equity": {
        "weight": 7,
        "keywords": ["股票", "美股", "Tesla", "特斯拉", "NVIDIA", "Palantir", "AI", "泡沫", "市場", "震盪", "BNB"],
        "why": "adds context for equity concentration and market-risk views",
    },
    "crypto_yield": {
        "weight": 7,
        "keywords": ["加密", "比特幣", "Bitcoin", "Crypto", "幣", "USDT", "鏈", "區塊鏈", "網格"],
        "why": "adds context for crypto allocation, custody, yield, and risk boundaries",
    },
    "real_estate": {
        "weight": 7,
        "keywords": ["房地產", "房", "買房", "租", "Airbnb", "日本房地產", "房車"],
        "why": "adds operating-asset and rental/real-estate evidence",
    },
    "ordinary_learning": {
        "weight": 5,
        "keywords": ["教學", "完整教學", "心法", "準備", "了解", "怎麼", "如何", "為什麼", "普通", "學習"],
        "why": "helps turn Terry's practice into a general learning sequence",
    },
    "risk": {
        "weight": 6,
        "keywords": ["保護", "風險", "危機", "歸零", "失敗", "震盪", "泡沫"],
        "why": "improves failure-case and risk-control guidance",
    },
}

RECENT_BONUS = 3
LONG_FORM_BONUS = 2
LONG_FORM_SECONDS = 1800


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def title_matches(title: str, keywords: list[str]) -> list[str]:
    lowered = title.lower()
    return [keyword for keyword in keywords if keyword.lower() in lowered]


def score_gap(row: dict[str, Any]) -> dict[str, Any]:
    title = row.get("title") or ""
    matched_categories: list[dict[str, Any]] = []
    score = 0
    for name, config in CATEGORIES.items():
        matches = title_matches(title, config["keywords"])
        if not matches:
            continue
        matched_categories.append(
            {
                "category": name,
                "matched_keywords": matches,
                "weight": config["weight"],
                "why": config["why"],
            }
        )
        score += int(config["weight"])

    bonuses: list[str] = []
    if int(row.get("index") or 9999) < 80:
        score += RECENT_BONUS
        bonuses.append("recent-current-relevance")
    if float(row.get("duration_seconds") or 0) >= LONG_FORM_SECONDS:
        score += LONG_FORM_BONUS
        bonuses.append("long-form-depth")

    return {
        **row,
        "score": score,
        "matched_categories": matched_categories,
        "bonuses": bonuses,
        "priority_tier": priority_tier(score),
    }


def priority_tier(score: int) -> str:
    if score >= 20:
        return "tier_1_next_manual_or_hardcase_provider"
    if score >= 15:
        return "tier_2_next_changed_provider_state"
    if score >= 10:
        return "tier_3_thematic_backlog"
    if score > 0:
        return "tier_4_low_priority_research_context"
    return "unscored"


def prioritize(target_dir: Path) -> list[dict[str, Any]]:
    queue = load_json(target_dir / "evidence" / "media" / "asr" / "queue.json")
    rows = [score_gap(row) for row in queue]
    rows = [row for row in rows if row["score"] > 0]
    return sorted(rows, key=lambda row: (-row["score"], row["index"]))


def write_markdown(path: Path, rows: list[dict[str, Any]]) -> None:
    tier_counts = Counter(row["priority_tier"] for row in rows)
    category_counts = Counter(
        category["category"]
        for row in rows
        for category in row["matched_categories"]
    )
    top_rows = rows[:40]

    lines = [
        "# Terry Transcript Gap Priority",
        "",
        "## Metadata",
        "",
        "- Target: Terry Chen YouTube channel",
        "- Artifact type: Remaining transcript gap priority queue",
        "- Generated: 2026-07-14",
        "- Constraint: Prioritizes online YouTube-link-to-transcript/manual export routes; it does not authorize video/audio download or local ASR.",
        "- Source queue: `evidence/media/asr/queue.json`",
        "- Companion routing: `evidence/media/2026-07-14-provider-routing-matrix.md`",
        "",
        "## Summary",
        "",
        f"- Scored fallback videos: {len(rows)}",
        "- Priority tiers:",
    ]
    for tier, count in tier_counts.most_common():
        lines.append(f"  - `{tier}`: {count}")
    lines.extend(["", "- Category counts:"])
    for category, count in category_counts.most_common():
        lines.append(f"  - `{category}`: {count}")
    lines.extend(
        [
            "",
            "## Top Provider / Manual Export Queue",
            "",
            "| Rank | Score | Tier | Video | Title | Categories | Why it matters |",
            "| ---: | ---: | --- | --- | --- | --- | --- |",
        ]
    )
    for rank, row in enumerate(top_rows, start=1):
        categories = ", ".join(category["category"] for category in row["matched_categories"])
        why = "; ".join(category["why"] for category in row["matched_categories"][:3])
        video = f"[{row['id']}]({row['url']})"
        title = str(row["title"]).replace("|", "\\|")
        lines.append(
            f"| {rank} | {row['score']} | `{row['priority_tier']}` | {video} | {title} | {categories} | {why} |"
        )
    lines.extend(
        [
            "",
            "## Routing Guidance",
            "",
            "- Tier 1 should be the first batch for a changed AI Video Summarizer session, authenticated NoteGPT/manual export, or a newly verified Q59-positive URL-only no-caption provider.",
            "- Tier 2 should be used only after Tier 1 is exhausted or when a provider has topic-specific evidence that it can handle those videos.",
            "- Tier 3 is a thematic backlog for strengthening the ordinary-investor template after the portfolio and wealth-path gaps are filled.",
            "- Do not use this queue to trigger video/audio download or local ASR under the current user constraint.",
        ]
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target-dir", type=Path, default=DEFAULT_TARGET_DIR)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows = prioritize(args.target_dir)
    media_dir = args.target_dir / "evidence" / "media"
    write_json(media_dir / OUTPUT_JSON, rows)
    write_markdown(media_dir / OUTPUT_MD, rows)
    print(f"wrote {len(rows)} scored transcript gaps")


if __name__ == "__main__":
    main()

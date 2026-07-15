#!/usr/bin/env python3
"""Extract a structured investment evidence ledger from archived Terry transcripts."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


DEFAULT_TARGET_DIR = Path("research/targets/terry-chen-youtube")


CATEGORY_RULES: dict[str, dict[str, Any]] = {
    "holdings_and_assets": {
        "description": "Named holdings, asset classes, or investable instruments mentioned in archived transcripts.",
        "keywords": [
            "Tesla",
            "TSLA",
            "特斯拉",
            "Nvidia",
            "NVDA",
            "輝達",
            "Palantir",
            "PLTR",
            "SpaceX",
            "台積電",
            "TSM",
            "Bitcoin",
            "BTC",
            "比特幣",
            "BNB",
            "穩定幣",
            "QQQI",
            "IB01",
            "國債",
            "短期國債",
            "ETF",
            "大盤",
            "Airbnb",
            "房地產",
            "租金",
        ],
    },
    "income_streams": {
        "description": "Income sources and cash-flow engines Terry explicitly discusses.",
        "keywords": [
            "covered call",
            "Covered Call",
            "賣 covered call",
            "選擇權",
            "期權",
            "被動收入",
            "收入",
            "薪水",
            "Airbnb",
            "房租",
            "租金",
            "side project",
            "副業",
            "生意",
            "YouTube",
            "利息",
            "放貸",
            "穩定幣",
            "國債",
            "QQQI",
        ],
    },
    "portfolio_rules": {
        "description": "Portfolio-construction, sizing, diversification, or risk-management rules.",
        "keywords": [
            "資產配置",
            "配置",
            "大盤",
            "ETF",
            "指數",
            "index",
            "分散",
            "風險",
            "波動",
            "現金",
            "持有",
            "買進",
            "賣出",
            "恐慌",
            "不要",
            "適合",
            "普通人",
            "一般人",
            "長期",
        ],
    },
    "wealth_development": {
        "description": "Career, frugality, education, business, and transition markers in Terry's wealth path.",
        "keywords": [
            "工程師",
            "軟體",
            "職場",
            "退休",
            "離開職場",
            "薪水",
            "Offer",
            "面試",
            "跳槽",
            "裁員",
            "實習",
            "獎學金",
            "補助",
            "房租",
            "省",
            "諮詢",
            "consulting",
            "創業",
            "公司",
            "團隊",
        ],
    },
    "learning_principles": {
        "description": "Practice-first learning, research, behavioral discipline, and decision-process advice.",
        "keywords": [
            "學",
            "學習",
            "研究",
            "理解",
            "教學",
            "一次搞懂",
            "回測",
            "分析",
            "經驗",
            "犯錯",
            "紀律",
            "心態",
            "普通人",
            "一般人",
            "適合",
            "不要",
            "建議",
        ],
    },
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", "", text).lower()


def snippet(text: str, limit: int = 120) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= limit:
        return text
    return text[:limit].rstrip() + "..."


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


def transcript_paths(target_dir: Path) -> list[Path]:
    transcript_dir = target_dir / "evidence" / "media" / "transcripts"
    manifest_path = transcript_dir / "manifest.json"
    ok_ids: set[str] = set()
    if manifest_path.exists():
        manifest = load_json(manifest_path)
        ok_ids = {row["id"] for row in manifest if row.get("status") == "ok" and row.get("id")}
    candidates: dict[str, Path] = {}
    for path in sorted(transcript_dir.glob("*.txt")):
        if path.name.startswith("manifest"):
            continue
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


def load_metadata(txt_path: Path) -> dict[str, Any]:
    json_path = txt_path.with_suffix(".json")
    if not json_path.exists():
        return {}
    try:
        return load_json(json_path)
    except json.JSONDecodeError:
        return {}


def extract_entries(target_dir: Path) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str]] = set()
    media_dir = target_dir / "evidence" / "media"
    videos = load_json(media_dir / "youtube-video-index.json") if (media_dir / "youtube-video-index.json").exists() else []
    video_by_id = {video["id"]: video for video in videos if video.get("id")}

    for txt_path in transcript_paths(target_dir):
        metadata = load_metadata(txt_path)
        video = metadata.get("video", {})
        video_id = video.get("id") or metadata.get("transcript", {}).get("videoId") or txt_path.stem.split(".")[0]
        current_video = video_by_id.get(video_id, {})
        title = current_video.get("title") or video.get("title") or metadata.get("transcript", {}).get("title") or ""
        url = current_video.get("url") or video.get("url") or metadata.get("source_url") or ""
        video_index = current_video.get("index") or video.get("index")
        provider = metadata.get("provider", {}).get("name") or metadata.get("source") or "unknown"
        lines = txt_path.read_text(encoding="utf-8").splitlines()

        for line_no, line in enumerate(lines, start=1):
            clean = line.strip()
            if not clean:
                continue
            context_start = max(1, line_no - 1)
            context_end = min(len(lines), line_no + 1)
            context = " ".join(part.strip() for part in lines[context_start - 1 : context_end] if part.strip())
            for category, rule in CATEGORY_RULES.items():
                matches = matching_keywords(clean, rule["keywords"])
                if not matches:
                    continue
                # Cross-provider positive controls can duplicate the same statement many times.
                # Deduplicate by category, video, and normalized local context while retaining source provenance.
                key = (category, str(video_id), normalize_text(context)[:220])
                if key in seen:
                    continue
                seen.add(key)
                entries.append(
                    {
                        "category": category,
                        "matched_keywords": matches,
                        "video_id": video_id,
                        "video_index": video_index,
                        "title": title,
                        "url": url,
                        "provider": provider,
                        "source_file": str(txt_path),
                        "line": line_no,
                        "evidence_ref": f"{txt_path}:{line_no}",
                        "snippet": snippet(clean),
                        "context": snippet(context, limit=240),
                    }
                )
    entries.sort(key=lambda row: (row["category"], row.get("video_index") or 999999, row["video_id"], row["line"]))
    return entries


def summarize(entries: list[dict[str, Any]]) -> dict[str, Any]:
    by_category: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for entry in entries:
        by_category[entry["category"]].append(entry)

    category_counts = {category: len(rows) for category, rows in sorted(by_category.items())}
    video_counts = Counter(entry["video_id"] for entry in entries)
    keyword_counts = Counter(keyword for entry in entries for keyword in entry["matched_keywords"])
    return {
        "category_counts": category_counts,
        "top_videos_by_evidence_count": dict(video_counts.most_common(20)),
        "top_keywords": dict(keyword_counts.most_common(40)),
    }


def markdown_table(rows: list[dict[str, Any]], limit: int = 18) -> str:
    if not rows:
        return "| Video | Title | Source | Evidence |\n| --- | --- | --- | --- |\n| - | - | - | - |"
    lines = ["| Video | Title | Source | Evidence |", "| --- | --- | --- | --- |"]
    for row in rows[:limit]:
        source = f"`{Path(row['source_file']).name}:{row['line']}`"
        title = row["title"] or row["video_id"]
        lines.append(f"| `{row['video_id']}` | {title} | {source} | {row['snippet']} |")
    return "\n".join(lines)


def write_markdown(target_dir: Path, entries: list[dict[str, Any]], summary: dict[str, Any]) -> None:
    by_category: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for entry in entries:
        by_category[entry["category"]].append(entry)

    sections: list[str] = []
    for category, rule in CATEGORY_RULES.items():
        rows = by_category.get(category, [])
        sections.append(
            f"""## {category}

{rule['description']}

{markdown_table(rows)}
"""
        )

    markdown = f"""# Terry Chen Investment Evidence Ledger

## Metadata

- Target: Terry Chen YouTube channel
- Artifact type: Structured transcript evidence ledger
- Source: archived raw transcript text under `evidence/media/transcripts/`
- Generated: 2026-07-13
- Evidence entries: {len(entries)}
- Confidence: Medium for line-level transcript evidence; entries are keyword-routed and should be read in context before final claims.

## Summary

```json
{json.dumps(summary, ensure_ascii=False, indent=2)}
```

{chr(10).join(sections)}
"""
    output = target_dir / "artifacts" / "decision-frames" / "2026-07-13-investment-evidence-ledger.md"
    output.write_text(markdown, encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target-dir", type=Path, default=DEFAULT_TARGET_DIR)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    entries = extract_entries(args.target_dir)
    summary = summarize(entries)
    output_json = args.target_dir / "artifacts" / "decision-frames" / "2026-07-13-investment-evidence-ledger.json"
    write_json(
        output_json,
        {
            "target": "Terry Chen YouTube channel",
            "artifact_type": "structured transcript evidence ledger",
            "generated": "2026-07-13",
            "category_definitions": {key: value["description"] for key, value in CATEGORY_RULES.items()},
            "summary": summary,
            "entries": entries,
        },
    )
    write_markdown(args.target_dir, entries, summary)
    print(f"wrote {len(entries)} evidence entries")


if __name__ == "__main__":
    main()

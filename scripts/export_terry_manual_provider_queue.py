#!/usr/bin/env python3
"""Export a manual/authenticated provider queue for Terry transcript gaps."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any
from urllib.parse import quote_plus


DEFAULT_TARGET_DIR = Path("research/targets/terry-chen-youtube")
PRIORITY_JSON = "2026-07-14-transcript-gap-priority.json"
OUTPUT_CSV = "2026-07-14-manual-provider-export-queue.csv"
OUTPUT_MD = "2026-07-14-manual-provider-export-queue.md"

PROVIDER_LINKS = {
    "YouTLDR": "https://you-tldr.com/",
    "AI Video Summarizer": "https://aivideosummarizer.io/youtube-subtitle-downloader/",
    "NoteGPT Subtitle Downloader": "https://notegpt.io/youtube-subtitle-downloader",
    "NoteGPT Transcript Downloader": "https://notegpt.io/youtube-transcript-downloader",
    "BibiGPT Subtitle Downloader": "https://bibigpt.co/en/features/youtube-subtitle-downloader",
    "YoutubeToText.ai": "https://youtubetotext.ai/",
    "VideoToBe": "https://videotobe.com/youtube-transcript",
    "YouVideoToText": "https://www.youvideototext.com/",
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def provider_search_url(provider_url: str, youtube_url: str) -> str:
    return f"{provider_url}?q={quote_plus(youtube_url)}"


def selected_rows(priority_rows: list[dict[str, Any]], tier: str, limit: int) -> list[dict[str, Any]]:
    rows = [row for row in priority_rows if row.get("priority_tier") == tier]
    return rows[:limit]


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=[
                "rank",
                "score",
                "priority_tier",
                "video_id",
                "title",
                "youtube_url",
                "categories",
                "aivideosummarizer",
                "youtldr",
                "notegpt_subtitle",
                "notegpt_transcript",
                "bibigpt_subtitle",
                "youtubetotext_ai",
                "videotobe",
                "youvideototext",
                "expected_action",
            ],
        )
        writer.writeheader()
        for rank, row in enumerate(rows, start=1):
            youtube_url = row["url"]
            categories = ";".join(category["category"] for category in row["matched_categories"])
            writer.writerow(
                {
                    "rank": rank,
                    "score": row["score"],
                    "priority_tier": row["priority_tier"],
                    "video_id": row["id"],
                    "title": row["title"],
                    "youtube_url": youtube_url,
                    "categories": categories,
                    "aivideosummarizer": PROVIDER_LINKS["AI Video Summarizer"],
                    "youtldr": PROVIDER_LINKS["YouTLDR"],
                    "notegpt_subtitle": PROVIDER_LINKS["NoteGPT Subtitle Downloader"],
                    "notegpt_transcript": PROVIDER_LINKS["NoteGPT Transcript Downloader"],
                    "bibigpt_subtitle": PROVIDER_LINKS["BibiGPT Subtitle Downloader"],
                    "youtubetotext_ai": PROVIDER_LINKS["YoutubeToText.ai"],
                    "videotobe": PROVIDER_LINKS["VideoToBe"],
                    "youvideototext": PROVIDER_LINKS["YouVideoToText"],
                    "expected_action": "Paste youtube_url into an authenticated/manual provider page and export TXT when available.",
                }
            )


def youtldr_provider_state(media_dir: Path) -> tuple[int, str]:
    manifest_path = media_dir / "provider-probes" / "youtldr-manifest.json"
    if not manifest_path.exists():
        return 0, "none recorded"
    rows = load_json(manifest_path)
    transcript_manifest_path = media_dir / "transcripts" / "manifest.json"
    solved_by_any_provider: set[str] = set()
    if transcript_manifest_path.exists():
        transcript_rows = load_json(transcript_manifest_path)
        solved_by_any_provider = {
            row["id"]
            for row in transcript_rows
            if row.get("status") == "ok" and row.get("id")
        }
    solved = {
        row.get("id") or row.get("video_id")
        for row in rows
        if row.get("status") == "ok" and (row.get("id") or row.get("video_id"))
    }
    failed: list[str] = []
    seen: set[str] = set()
    for row in reversed(rows):
        if row.get("status") != "provider_failed":
            continue
        video_id = row.get("id") or row.get("video_id")
        if not video_id or video_id in seen:
            continue
        if video_id in solved_by_any_provider:
            continue
        failed.append(str(video_id))
        seen.add(str(video_id))
        if len(failed) == 7:
            break
    failed.reverse()
    return len(solved), ", ".join(f"`{video_id}`" for video_id in failed) or "none recorded"


def write_markdown(path: Path, rows: list[dict[str, Any]], media_dir: Path) -> None:
    youtldr_solved_count, latest_youtldr_failures = youtldr_provider_state(media_dir)
    lines = [
        "# Terry Manual Provider Export Queue",
        "",
        "## Metadata",
        "",
        "- Target: Terry Chen YouTube channel",
        "- Artifact type: Manual/authenticated online-provider export queue",
        "- Generated: 2026-07-14",
        "- Constraint: Use YouTube links in online provider pages only; do not download video/audio and do not run local ASR.",
        "- Source priority artifact: `2026-07-14-transcript-gap-priority.json`",
        "",
        "## Provider Pages",
        "",
    ]
    for name, url in PROVIDER_LINKS.items():
        lines.append(f"- [{name}]({url})")
    lines.extend(
        [
            "",
            "## How To Use",
            "",
            "1. Open one provider page in an authenticated browser session if needed.",
            "2. Paste the YouTube URL from the table.",
            "3. Export or copy TXT/SRT/VTT transcript text if the provider returns it.",
            "4. Save the text with the video id in the filename, then import it through the archive's external transcript import path.",
            "5. Skip any flow that asks for local video/audio download or local file upload unless the user explicitly approves a separate ASR route.",
            "",
            "## Tier 1 Queue",
            "",
            "| Rank | Score | Video | Title | Categories | YouTube URL |",
            "| ---: | ---: | --- | --- | --- | --- |",
        ]
    )
    for rank, row in enumerate(rows, start=1):
        categories = ", ".join(category["category"] for category in row["matched_categories"])
        title = str(row["title"]).replace("|", "\\|")
        lines.append(
            f"| {rank} | {row['score']} | `{row['id']}` | {title} | {categories} | {row['url']} |"
        )
    lines.extend(
        [
            "",
            "## Current Provider State",
            "",
            f"- YouTLDR solved {youtldr_solved_count} hard-case / Tier 2 videos through anonymous URL ingestion and provider-side `whisper` transcripts.",
            "- `diU75OZiuX8`, `e0CJBzGa0hQ`, and `1PEjeshVbZw` initially failed with provider-side HTTP 403 but later succeeded, so YouTLDR failures can be transient; the Tier 1 manual/provider queue is currently empty.",
            f"- The latest Tier 2 / Tier 3 YouTLDR failures are {latest_youtldr_failures}; keep them for a later bounded retry or authenticated/manual provider path.",
            "- AI Video Summarizer remains useful after quota/login state changes, but the latest guest-state retry reached `Your daily guest limit has been reached. Please log in to continue.`",
        ]
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target-dir", type=Path, default=DEFAULT_TARGET_DIR)
    parser.add_argument("--tier", default="tier_1_next_manual_or_hardcase_provider")
    parser.add_argument("--limit", type=int, default=14)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    media_dir = args.target_dir / "evidence" / "media"
    rows = selected_rows(load_json(media_dir / PRIORITY_JSON), args.tier, args.limit)
    write_csv(media_dir / OUTPUT_CSV, rows)
    write_markdown(media_dir / OUTPUT_MD, rows, media_dir)
    print(f"wrote {len(rows)} manual provider queue rows")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Collect YouTube transcripts through SubtitlesYT's no-login TXT endpoint."""

from __future__ import annotations

import argparse
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


DEFAULT_TARGET_DIR = Path("research/targets/terry-chen-youtube")
DEFAULT_PRIORITY_LIST = Path("research/targets/terry-chen-youtube/evidence/media/asr/2026-07-13-priority-run-list.md")
PROVIDER_NAME = "SubtitlesYT"
PROVIDER_SLUG = "subtitlesyt"
PROVIDER_PAGE = "https://subtitlesyt.com/"
PROVIDER_ENDPOINT = "https://subtitlesyt.com/download_subtitles"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def video_index(target_dir: Path) -> list[dict[str, Any]]:
    return load_json(target_dir / "evidence" / "media" / "youtube-video-index.json")


def transcript_status(target_dir: Path) -> dict[str, str]:
    manifest_path = target_dir / "evidence" / "media" / "transcripts" / "manifest.json"
    statuses: dict[str, str] = {}
    if manifest_path.exists():
        for item in load_json(manifest_path):
            statuses[item["id"]] = item["status"]

    transcript_dir = target_dir / "evidence" / "media" / "transcripts"
    if transcript_dir.exists():
        for path in transcript_dir.glob("*.json"):
            if path.name == "manifest.json":
                continue
            try:
                payload = load_json(path)
            except json.JSONDecodeError:
                continue
            video_id = payload.get("video", {}).get("id") or payload.get("transcript", {}).get("videoId")
            if video_id:
                statuses.setdefault(video_id, "ok")
    return statuses


def priority_video_ids(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    seen: set[str] = set()
    ids: list[str] = []
    for video_id in re.findall(r"`([A-Za-z0-9_-]{11})`", text):
        if video_id in seen:
            continue
        seen.add(video_id)
        ids.append(video_id)
    return ids


def investment_like_video_ids(target_dir: Path) -> list[str]:
    queue_path = target_dir / "evidence" / "media" / "asr" / "queue.json"
    if not queue_path.exists():
        return []
    pattern = re.compile(
        r"投資|股票|美股|比特幣|加密|crypto|bitcoin|Tesla|特斯拉|房地產|資產|財富|FIRE|退休|"
        r"被動收入|收入|市場|泡沫|倉位|大盤|ETF|選股|網格|期權|option|BNB|AI 泡沫|保護",
        re.IGNORECASE,
    )
    return [item["id"] for item in load_json(queue_path) if pattern.search(item["title"])]


def select_videos(args: argparse.Namespace, videos: list[dict[str, Any]]) -> list[dict[str, Any]]:
    statuses = transcript_status(args.target_dir)
    selected = videos if args.include_existing else [video for video in videos if statuses.get(video["id"]) != "ok"]
    if args.priority_list:
        priority_ids = priority_video_ids(args.priority_list)
        order = {video_id: index for index, video_id in enumerate(priority_ids)}
        selected = [video for video in selected if video["id"] in order]
        selected.sort(key=lambda video: order[video["id"]])
    if args.investment_like:
        wanted_ids = investment_like_video_ids(args.target_dir)
        order = {video_id: index for index, video_id in enumerate(wanted_ids)}
        selected = [video for video in selected if video["id"] in order]
        selected.sort(key=lambda video: order[video["id"]])
    if args.video_id:
        wanted = set(args.video_id)
        selected = [video for video in selected if video["id"] in wanted]
    if args.start_at:
        selected = [video for video in selected if video["index"] >= args.start_at]
    if args.limit:
        selected = selected[: args.limit]
    return selected


def fetch_transcript(video_url: str, fmt: str, timeout: int) -> tuple[int | None, str | None, dict[str, str], str | None]:
    params = urllib.parse.urlencode({"youtube_url": video_url, "format": fmt})
    request = urllib.request.Request(
        f"{PROVIDER_ENDPOINT}?{params}",
        headers={
            "Accept": "text/plain,text/html,*/*",
            "Referer": PROVIDER_PAGE,
            "User-Agent": "Mozilla/5.0 (compatible; AIFi transcript research)",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            text = response.read().decode("utf-8", errors="replace")
            return response.status, text, dict(response.headers.items()), None
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        return exc.code, raw[:4000], dict(exc.headers.items()), None
    except (urllib.error.URLError, TimeoutError) as exc:
        return None, None, {}, str(exc)


def normalize_segments(text: str) -> list[dict[str, Any]]:
    segments: list[dict[str, Any]] = []
    for line in text.splitlines():
        clean = line.strip()
        if not clean:
            continue
        segments.append({"index": len(segments), "text": clean})
    return segments


def write_transcript(args: argparse.Namespace, video: dict[str, Any], text: str, headers: dict[str, str]) -> dict[str, Any]:
    text = text.strip()
    segments = normalize_segments(text)
    if len(text) < args.min_characters or len(segments) < args.min_segments:
        raise ValueError("provider returned no usable transcript text")
    if text.lower().startswith("<!doctype html") or "<html" in text[:200].lower():
        raise ValueError("provider returned HTML instead of transcript text")

    transcript_dir = args.target_dir / "evidence" / "media" / "transcripts"
    transcript_dir.mkdir(parents=True, exist_ok=True)
    stem = f"{video['id']}.provider-{PROVIDER_SLUG}"
    txt_path = transcript_dir / f"{stem}.txt"
    json_path = transcript_dir / f"{stem}.json"
    payload = {
        "source": f"Online transcript provider: {PROVIDER_NAME}",
        "source_url": video["url"],
        "provider": {
            "name": PROVIDER_NAME,
            "page_url": PROVIDER_PAGE,
            "endpoint": PROVIDER_ENDPOINT,
            "retrieved": time.strftime("%Y-%m-%d"),
            "extraction": "Direct GET endpoint from SubtitlesYT web form",
            "content_disposition": headers.get("Content-Disposition") or headers.get("content-disposition"),
        },
        "video_index": video.get("index"),
        "video": video,
        "transcript": {
            "videoId": video["id"],
            "title": video["title"],
            "text": text,
            "segments": segments,
            "format": args.format,
            "confidence": "online provider transcript; cross-check against another provider or YouTube panel when possible",
        },
    }
    txt_path.write_text(text + "\n", encoding="utf-8")
    write_json(json_path, payload)
    return {"output_txt": str(txt_path), "output_json": str(json_path), "segments": len(segments), "characters": len(text)}


def collect(args: argparse.Namespace) -> list[dict[str, Any]]:
    selected = select_videos(args, video_index(args.target_dir))
    transcript_dir = args.target_dir / "evidence" / "media" / "transcripts"
    rows: list[dict[str, Any]] = []

    for video in selected:
        stem = f"{video['id']}.provider-{PROVIDER_SLUG}"
        json_path = transcript_dir / f"{stem}.json"
        if json_path.exists() and not args.force:
            row = {
                "id": video["id"],
                "index": video["index"],
                "title": video["title"],
                "provider": PROVIDER_NAME,
                "status": "ok_existing",
            }
            rows.append(row)
            print(f"{video['index']:03d} {video['id']} ok_existing", flush=True)
            continue

        status_code, text, headers, error = fetch_transcript(video["url"], args.format, args.timeout)
        row = {
            "id": video["id"],
            "index": video["index"],
            "title": video["title"],
            "url": video["url"],
            "provider": PROVIDER_NAME,
            "provider_url": PROVIDER_ENDPOINT,
            "http_status": status_code,
            "status": "error",
            "error": error,
            "content_type": headers.get("Content-Type") or headers.get("content-type"),
            "content_disposition": headers.get("Content-Disposition") or headers.get("content-disposition"),
        }
        if isinstance(text, str):
            row["text_chars"] = len(text.strip())
            row["segments_returned"] = len(normalize_segments(text))
            if status_code and status_code >= 400:
                row["provider_error"] = text[:500]
        try:
            if status_code == 200 and text:
                row.update(write_transcript(args, video, text, headers))
                row["status"] = "ok"
                row["error"] = None
            elif error is None:
                row["status"] = "provider_failed"
        except ValueError as exc:
            row["status"] = "provider_failed"
            row["error"] = str(exc)
        rows.append(row)
        print(f"{video['index']:03d} {video['id']} {row['status']}", flush=True)
        time.sleep(args.delay)
    return rows


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target-dir", type=Path, default=DEFAULT_TARGET_DIR)
    parser.add_argument("--priority-list", type=Path, nargs="?", const=DEFAULT_PRIORITY_LIST)
    parser.add_argument("--investment-like", action="store_true")
    parser.add_argument("--video-id", action="append")
    parser.add_argument("--start-at", type=int)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--include-existing", action="store_true")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--timeout", type=int, default=60)
    parser.add_argument("--delay", type=float, default=13.0, help="Seconds between requests; provider allows about 5 per minute.")
    parser.add_argument("--format", default="txt")
    parser.add_argument("--min-characters", type=int, default=500)
    parser.add_argument("--min-segments", type=int, default=10)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows = collect(args)
    manifest_path = args.target_dir / "evidence" / "media" / "provider-probes" / "subtitlesyt-manifest.json"
    prior = load_json(manifest_path) if manifest_path.exists() else []
    write_json(manifest_path, [*prior, *rows])
    ok = sum(1 for row in rows if row.get("status") == "ok")
    print(f"{PROVIDER_NAME}: collected {ok}/{len(rows)} transcripts")


if __name__ == "__main__":
    main()

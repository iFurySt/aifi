#!/usr/bin/env python3
"""Collect YouTube transcripts through SHRP's no-login captions endpoint."""

from __future__ import annotations

import argparse
import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


DEFAULT_TARGET_DIR = Path("research/targets/terry-chen-youtube")
DEFAULT_PRIORITY_LIST = Path("research/targets/terry-chen-youtube/evidence/media/asr/2026-07-13-priority-run-list.md")
PROVIDER_NAME = "SHRP"
PROVIDER_SLUG = "shrp"
PROVIDER_PAGE = "https://shrp.app/youtube-to-text"
PROVIDER_ENDPOINT = "https://shrp.app/api/youtube-captions"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def transcript_status(target_dir: Path) -> dict[str, str]:
    manifest_path = target_dir / "evidence" / "media" / "transcripts" / "manifest.json"
    statuses: dict[str, str] = {}
    if manifest_path.exists():
        for item in load_json(manifest_path):
            statuses[item["id"]] = item["status"]
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


def select_videos(args: argparse.Namespace) -> list[dict[str, Any]]:
    videos = load_json(args.target_dir / "evidence" / "media" / "youtube-video-index.json")
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


def post_transcript(video_url: str, language: str, timeout: int) -> tuple[int | None, dict[str, Any] | None, dict[str, str], str | None]:
    body = json.dumps({"url": video_url, "language": language}).encode("utf-8")
    request = urllib.request.Request(
        PROVIDER_ENDPOINT,
        data=body,
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Origin": "https://shrp.app",
            "Referer": PROVIDER_PAGE,
            "User-Agent": "Mozilla/5.0 (compatible; AIFi transcript research)",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8", errors="replace")
            return response.status, json.loads(raw) if raw.strip() else {}, dict(response.headers.items()), None
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw) if raw.strip() else {}
        except json.JSONDecodeError:
            payload = {"raw": raw[:4000]}
        return exc.code, payload, dict(exc.headers.items()), None
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        return None, None, {}, str(exc)


def srt_segments(srt_text: str) -> list[dict[str, Any]]:
    segments: list[dict[str, Any]] = []
    blocks = re.split(r"\n\s*\n", srt_text.strip())
    for block in blocks:
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if len(lines) < 3:
            continue
        if "-->" not in lines[1]:
            continue
        start, end = [part.strip() for part in lines[1].split("-->", 1)]
        text = " ".join(lines[2:]).strip()
        if text:
            segments.append({"index": len(segments), "start": start, "end": end, "text": text})
    return segments


def write_transcript(args: argparse.Namespace, video: dict[str, Any], payload: dict[str, Any], headers: dict[str, str]) -> dict[str, Any]:
    text = str(payload.get("text") or "").strip()
    segments = srt_segments(str(payload.get("srt") or ""))
    if len(text) < args.min_characters or len(segments) < args.min_segments:
        raise ValueError("provider returned no usable transcript text")

    transcript_dir = args.target_dir / "evidence" / "media" / "transcripts"
    transcript_dir.mkdir(parents=True, exist_ok=True)
    stem = f"{video['id']}.provider-{PROVIDER_SLUG}"
    txt_path = transcript_dir / f"{stem}.txt"
    json_path = transcript_dir / f"{stem}.json"
    out = {
        "source": f"Online transcript provider: {PROVIDER_NAME}",
        "source_url": video["url"],
        "provider": {
            "name": PROVIDER_NAME,
            "page_url": PROVIDER_PAGE,
            "endpoint": PROVIDER_ENDPOINT,
            "retrieved": time.strftime("%Y-%m-%d"),
            "extraction": "Direct POST endpoint from SHRP YouTube-to-text web tool",
            "content_type": headers.get("Content-Type") or headers.get("content-type"),
        },
        "video_index": video.get("index"),
        "video": video,
        "transcript": {
            "videoId": payload.get("videoId") or video["id"],
            "title": payload.get("videoTitle") or video["title"],
            "text": text,
            "segments": segments,
            "language": payload.get("language"),
            "language_name": payload.get("languageName"),
            "available_languages": payload.get("availableLangs") or [],
            "srt": payload.get("srt"),
            "vtt": payload.get("vtt"),
            "confidence": "online provider caption transcript; cross-check against another provider or YouTube panel when possible",
        },
        "raw_provider_payload": {
            key: value
            for key, value in payload.items()
            if key not in {"text", "srt", "vtt"}
        },
    }
    txt_path.write_text(text + "\n", encoding="utf-8")
    write_json(json_path, out)
    return {
        "output_txt": str(txt_path),
        "output_json": str(json_path),
        "segments": len(segments),
        "characters": len(text),
        "language": payload.get("language"),
    }


def collect(args: argparse.Namespace) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    transcript_dir = args.target_dir / "evidence" / "media" / "transcripts"
    for video in select_videos(args):
        json_path = transcript_dir / f"{video['id']}.provider-{PROVIDER_SLUG}.json"
        if json_path.exists() and not args.force:
            row = {"id": video["id"], "index": video["index"], "title": video["title"], "provider": PROVIDER_NAME, "status": "ok_existing"}
            rows.append(row)
            print(f"{video['index']:03d} {video['id']} ok_existing", flush=True)
            continue

        status_code, payload, headers, error = post_transcript(video["url"], args.language, args.timeout)
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
        }
        if payload:
            row["provider_error"] = payload.get("error")
            row["no_captions"] = payload.get("noCaptions")
            row["success"] = payload.get("success")
            row["text_chars"] = len(str(payload.get("text") or ""))
            row["segments_returned"] = len(srt_segments(str(payload.get("srt") or "")))
            row["available_languages"] = payload.get("availableLangs")
            row["language"] = payload.get("language")
        try:
            if status_code == 200 and payload and payload.get("success"):
                row.update(write_transcript(args, video, payload, headers))
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
    parser.add_argument("--delay", type=float, default=1.0)
    parser.add_argument("--language", default="en")
    parser.add_argument("--min-characters", type=int, default=500)
    parser.add_argument("--min-segments", type=int, default=10)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows = collect(args)
    manifest_path = args.target_dir / "evidence" / "media" / "provider-probes" / "shrp-manifest.json"
    prior = load_json(manifest_path) if manifest_path.exists() else []
    write_json(manifest_path, [*prior, *rows])
    ok = sum(1 for row in rows if row.get("status") == "ok")
    print(f"{PROVIDER_NAME}: collected {ok}/{len(rows)} transcripts")


if __name__ == "__main__":
    main()

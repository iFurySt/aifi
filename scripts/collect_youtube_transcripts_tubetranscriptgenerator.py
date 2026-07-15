#!/usr/bin/env python3
"""Collect YouTube transcripts through TubeTranscriptGenerator's online endpoint."""

from __future__ import annotations

import argparse
import json
import os
import re
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


DEFAULT_TARGET_DIR = Path("research/targets/terry-chen-youtube")
DEFAULT_PRIORITY_LIST = Path("research/targets/terry-chen-youtube/evidence/media/asr/2026-07-13-priority-run-list.md")
PROVIDER_NAME = "TubeTranscriptGenerator"
PROVIDER_SLUG = "tubetranscriptgenerator"
PROVIDER_PAGE = "https://tubetranscriptgenerator.com/"
PROVIDER_ENDPOINT = "https://tvxvlzbezcckcichatzv.supabase.co/functions/v1/fetch-transcript"
PROVIDER_ANON_KEY_ENV = "TUBETRANSCRIPTGENERATOR_ANON_KEY"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def video_index(target_dir: Path) -> list[dict[str, Any]]:
    return load_json(target_dir / "evidence" / "media" / "youtube-video-index.json")


def provider_manifest_path(target_dir: Path) -> Path:
    return target_dir / "evidence" / "media" / "provider-probes" / f"{PROVIDER_SLUG}-manifest.json"


def append_manifest_row(target_dir: Path, row: dict[str, Any]) -> None:
    path = provider_manifest_path(target_dir)
    rows = load_json(path) if path.exists() else []
    rows.append(row)
    write_json(path, rows)


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


def fetch_transcript(video_url: str, timeout: int) -> tuple[int | None, dict[str, Any] | None, str | None]:
    provider_anon_key = os.environ.get(PROVIDER_ANON_KEY_ENV)
    if not provider_anon_key:
        return None, None, f"missing {PROVIDER_ANON_KEY_ENV}"
    body = json.dumps({"url": video_url}).encode("utf-8")
    request = urllib.request.Request(
        PROVIDER_ENDPOINT,
        data=body,
        headers={
            "Accept": "application/json,text/plain,*/*",
            "Content-Type": "application/json",
            "Origin": PROVIDER_PAGE.rstrip("/"),
            "Referer": PROVIDER_PAGE,
            "apikey": provider_anon_key,
            "Authorization": f"Bearer {provider_anon_key}",
            "User-Agent": "Mozilla/5.0 (compatible; AIFi transcript research)",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8", errors="replace"))
            return response.status, payload, None
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            payload: dict[str, Any] | None = json.loads(raw)
        except json.JSONDecodeError:
            payload = {"body": raw[:2000]}
        return exc.code, payload, None
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        return None, None, str(exc)


def normalize_segments(items: list[Any]) -> list[dict[str, Any]]:
    segments: list[dict[str, Any]] = []
    for index, item in enumerate(items):
        if not isinstance(item, dict):
            continue
        text = str(item.get("text") or "").strip()
        if not text:
            continue
        segments.append(
            {
                "index": index,
                "time": item.get("time"),
                "text": text,
            }
        )
    return segments


def write_transcript(args: argparse.Namespace, video: dict[str, Any], provider_payload: dict[str, Any]) -> dict[str, Any]:
    transcript_items = provider_payload.get("transcript")
    if not isinstance(transcript_items, list) or not transcript_items:
        raise ValueError("provider returned no transcript items")
    segments = normalize_segments(transcript_items)
    text = "\n".join(segment["text"] for segment in segments).strip()
    if len(text) < args.min_characters or len(segments) < args.min_segments:
        raise ValueError("provider returned no usable transcript text")

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
            "extraction": "Supabase Edge Function exposed by TubeTranscriptGenerator web app",
        },
        "video_index": video.get("index"),
        "video": video,
        "transcript": {
            "videoId": video["id"],
            "title": provider_payload.get("videoTitle") or video["title"],
            "text": text,
            "segments": segments,
            "language": provider_payload.get("language"),
            "available_languages": provider_payload.get("availableLanguages"),
            "confidence": "online provider transcript; cross-check against another provider or YouTube panel when possible",
        },
        "raw_provider_payload": {
            key: value for key, value in provider_payload.items() if key != "transcript"
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
                "status": "ok_existing",
                "provider": PROVIDER_NAME,
            }
            rows.append(row)
            print(f"{video['index']:03d} {video['id']} ok_existing", flush=True)
            continue

        status_code, payload, error = fetch_transcript(video["url"], args.timeout)
        row = {
            "id": video["id"],
            "index": video["index"],
            "title": video["title"],
            "url": video["url"],
            "provider": PROVIDER_NAME,
            "provider_url": PROVIDER_PAGE,
            "http_status": status_code,
            "status": "error",
            "error": error,
        }
        if isinstance(payload, dict):
            row["provider_message"] = payload.get("error") or payload.get("message")
            transcript_items = payload.get("transcript")
            if isinstance(transcript_items, list):
                row["segments_returned"] = len(transcript_items)
                row["characters_returned"] = sum(
                    len(str(item.get("text") or "")) for item in transcript_items if isinstance(item, dict)
                )
            row["video_title_returned"] = payload.get("videoTitle")
            row["language_returned"] = payload.get("language")
        try:
            if status_code == 200 and isinstance(payload, dict) and isinstance(payload.get("transcript"), list):
                row.update(write_transcript(args, video, payload))
                row["status"] = "ok"
                row["error"] = None
            elif error is None:
                row["status"] = "provider_failed"
        except ValueError as exc:
            row["status"] = "provider_failed"
            row["error"] = str(exc)
        rows.append(row)
        append_manifest_row(args.target_dir, row)
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
    parser.add_argument("--timeout", type=int, default=45)
    parser.add_argument("--delay", type=float, default=1.0)
    parser.add_argument("--min-characters", type=int, default=500)
    parser.add_argument("--min-segments", type=int, default=10)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows = collect(args)
    ok = sum(1 for row in rows if row.get("status") == "ok")
    print(f"{PROVIDER_NAME}: collected {ok}/{len(rows)} transcripts")


if __name__ == "__main__":
    main()

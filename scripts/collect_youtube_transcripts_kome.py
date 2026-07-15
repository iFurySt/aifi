#!/usr/bin/env python3
"""Collect YouTube transcripts through Kome's online transcript endpoint."""

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
PROVIDER_NAME = "Kome"
PROVIDER_SLUG = "kome"
PROVIDER_ENDPOINT = "https://kome.ai/api/transcript"
UNAVAILABLE_MESSAGE = "Transcripts aren't available for this video"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


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


def select_videos(args: argparse.Namespace, videos: list[dict[str, Any]]) -> list[dict[str, Any]]:
    statuses = transcript_status(args.target_dir)
    selected = videos if args.include_existing else [video for video in videos if statuses.get(video["id"]) != "ok"]
    if args.priority_list:
        priority_ids = priority_video_ids(args.priority_list)
        order = {video_id: index for index, video_id in enumerate(priority_ids)}
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


def fetch_transcript(video: dict[str, Any], timeout: int) -> tuple[int | None, dict[str, Any] | None, str | None]:
    body = json.dumps({"video_id": video["url"], "format": True, "source": "tool"}).encode("utf-8")
    request = urllib.request.Request(
        PROVIDER_ENDPOINT,
        data=body,
        headers={
            "content-type": "application/json",
            "accept": "application/json,text/plain,*/*",
            "user-agent": "Mozilla/5.0 (compatible; AIFi transcript research)",
        },
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


def normalize_segments(text: str) -> list[dict[str, Any]]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return [{"index": index, "text": line} for index, line in enumerate(lines)]


def write_transcript(args: argparse.Namespace, video: dict[str, Any], provider_payload: dict[str, Any]) -> dict[str, Any]:
    text = str(provider_payload.get("transcript") or "").strip()
    if len(text) < args.min_characters or UNAVAILABLE_MESSAGE in text:
        raise ValueError("provider returned no usable transcript text")

    segments = normalize_segments(text)
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
            "endpoint": PROVIDER_ENDPOINT,
            "retrieved": time.strftime("%Y-%m-%d"),
        },
        "video_index": video.get("index"),
        "video": video,
        "transcript": {
            "videoId": video["id"],
            "title": video["title"],
            "text": text,
            "segments": segments,
            "confidence": "online provider transcript; cross-check against another provider or YouTube panel when possible",
        },
        "raw_provider_payload": provider_payload,
    }
    txt_path.write_text(text, encoding="utf-8")
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

        status_code, payload, error = fetch_transcript(video, args.timeout)
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
        }
        if isinstance(payload, dict):
            transcript = str(payload.get("transcript") or "")
            row["provider_message"] = transcript[:300] if UNAVAILABLE_MESSAGE in transcript else payload.get("message")
            row["characters_returned"] = len(transcript)
        try:
            if status_code == 200 and isinstance(payload, dict):
                row.update(write_transcript(args, video, payload))
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
    parser.add_argument("--video-id", action="append")
    parser.add_argument("--start-at", type=int)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--include-existing", action="store_true")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--timeout", type=int, default=45)
    parser.add_argument("--delay", type=float, default=1.0)
    parser.add_argument("--min-characters", type=int, default=500)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows = collect(args)
    manifest_path = args.target_dir / "evidence" / "media" / "provider-probes" / "kome-manifest.json"
    prior = load_json(manifest_path) if manifest_path.exists() else []
    write_json(manifest_path, [*prior, *rows])
    ok = sum(1 for row in rows if row.get("status") == "ok")
    print(f"{PROVIDER_NAME}: collected {ok}/{len(rows)} transcripts")


if __name__ == "__main__":
    main()

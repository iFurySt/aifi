#!/usr/bin/env python3
"""Collect YouTube transcripts through online link-to-transcript providers."""

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
PROVIDER_NAME = "youtubetranscript.pro"
PROVIDER_BASE_URL = "https://youtubetranscript.pro"


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


def provider_url(args: argparse.Namespace, video_id: str) -> str:
    query = urllib.parse.urlencode({"videoId": video_id, "sessionId": args.session_id})
    return f"{args.provider_base_url.rstrip('/')}/api/youtube/transcript?{query}"


def fetch_json(url: str, timeout: int) -> tuple[int | None, Any, str | None]:
    request = urllib.request.Request(
        url,
        headers={
            "accept": "application/json,text/plain,*/*",
            "user-agent": "Mozilla/5.0 (compatible; AIFi transcript research)",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8", errors="replace")
            return response.status, json.loads(body), None
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        try:
            payload: Any = json.loads(body)
        except json.JSONDecodeError:
            payload = {"body": body[:2000]}
        return exc.code, payload, None
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        return None, None, str(exc)


def normalize_segments(response: list[dict[str, Any]]) -> list[dict[str, Any]]:
    segments: list[dict[str, Any]] = []
    for item in response:
        text = str(item.get("text") or "").strip()
        if not text:
            continue
        offset = item.get("offset")
        segment = {
            "text": text,
            "offset": offset,
            "duration": item.get("duration"),
            "lang": item.get("lang"),
        }
        if isinstance(offset, (int, float)):
            minutes = int(offset // 60)
            seconds = int(offset % 60)
            segment["time"] = f"{minutes}:{seconds:02d}"
        segments.append(segment)
    return segments


def write_transcript(args: argparse.Namespace, video: dict[str, Any], provider_payload: Any) -> dict[str, Any]:
    response = provider_payload.get("data", {}).get("response")
    if not isinstance(response, list):
        raise ValueError("provider payload did not contain data.response list")
    segments = normalize_segments(response)
    if not segments:
        raise ValueError("provider returned no transcript segments")

    text = "\n".join(segment["text"] for segment in segments)
    transcript_dir = args.target_dir / "evidence" / "media" / "transcripts"
    transcript_dir.mkdir(parents=True, exist_ok=True)
    stem = f"{video['id']}.provider-youtubetranscript-pro"
    txt_path = transcript_dir / f"{stem}.txt"
    json_path = transcript_dir / f"{stem}.json"
    payload = {
        "source": f"Online transcript provider: {PROVIDER_NAME}",
        "source_url": video["url"],
        "provider": {
            "name": PROVIDER_NAME,
            "endpoint": args.provider_base_url,
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
    rows: list[dict[str, Any]] = []
    transcript_dir = args.target_dir / "evidence" / "media" / "transcripts"
    selected = select_videos(args, video_index(args.target_dir))
    for video in selected:
        stem = f"{video['id']}.provider-youtubetranscript-pro"
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

        url = provider_url(args, video["id"])
        status_code, payload, error = fetch_json(url, args.timeout)
        row = {
            "id": video["id"],
            "index": video["index"],
            "title": video["title"],
            "url": video["url"],
            "provider": PROVIDER_NAME,
            "provider_url": url,
            "http_status": status_code,
            "status": "error",
            "error": error,
        }
        if payload is not None:
            row["provider_message"] = (
                payload.get("message")
                or payload.get("details")
                or payload.get("data", {}).get("message")
                if isinstance(payload, dict)
                else None
            )
        try:
            if status_code == 200 and isinstance(payload, dict) and payload.get("success") is True:
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
    parser.add_argument("--provider-base-url", default=PROVIDER_BASE_URL)
    parser.add_argument("--session-id", default="codex-terry-research")
    parser.add_argument("--priority-list", type=Path, nargs="?", const=DEFAULT_PRIORITY_LIST)
    parser.add_argument("--video-id", action="append")
    parser.add_argument("--start-at", type=int)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--include-existing", action="store_true")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--timeout", type=int, default=45)
    parser.add_argument("--delay", type=float, default=1.0)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows = collect(args)
    manifest_path = args.target_dir / "evidence" / "media" / "provider-probes" / "youtubetranscript-pro-manifest.json"
    prior = load_json(manifest_path) if manifest_path.exists() else []
    write_json(manifest_path, [*prior, *rows])
    ok = sum(1 for row in rows if row.get("status") == "ok")
    print(f"{PROVIDER_NAME}: collected {ok}/{len(rows)} transcripts")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Collect YouTube transcripts through youtube-transcript.ai's online endpoint."""

from __future__ import annotations

import argparse
import html
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
PROVIDER_NAME = "youtube-transcript.ai"
PROVIDER_SLUG = "youtubetranscript-ai"
PROVIDER_ENDPOINT = "https://youtube-transcript.ai/api/subtitles"


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


def provider_url(video_id: str) -> str:
    return f"{PROVIDER_ENDPOINT}?{urllib.parse.urlencode({'v': video_id})}"


def fetch_subtitles(video_id: str, timeout: int) -> tuple[int | None, dict[str, Any] | None, str | None]:
    request = urllib.request.Request(
        provider_url(video_id),
        headers={
            "accept": "application/json,text/plain,*/*",
            "referer": "https://youtube-transcript.ai/",
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


def parse_vtt(vtt: str) -> list[dict[str, Any]]:
    segments: list[dict[str, Any]] = []
    current_time: str | None = None
    current_text: list[str] = []

    def flush() -> None:
        nonlocal current_time, current_text
        text = " ".join(part.strip() for part in current_text if part.strip())
        text = re.sub(r"<[^>]+>", "", text)
        text = html.unescape(re.sub(r"\s+", " ", text)).strip()
        if current_time and text:
            segments.append({"index": len(segments), "time": current_time, "text": text})
        current_time = None
        current_text = []

    for raw_line in vtt.splitlines():
        line = raw_line.strip()
        if not line:
            flush()
            continue
        if line.startswith(("WEBVTT", "Kind:", "Language:", "NOTE")):
            continue
        if "-->" in line:
            flush()
            current_time = line.split("-->", 1)[0].strip()
            continue
        if current_time:
            current_text.append(line)
    flush()
    return segments


def preferred_track(payload: dict[str, Any]) -> dict[str, Any] | None:
    subtitles = payload.get("subtitles")
    if not isinstance(subtitles, list) or not subtitles:
        return None
    for track in subtitles:
        if track.get("langCode") in {"zh", "zh-Hant", "zh-TW", "zh-CN"}:
            return track
    for track in subtitles:
        if track.get("isAsr"):
            return track
    return subtitles[0]


def write_transcript(args: argparse.Namespace, video: dict[str, Any], provider_payload: dict[str, Any]) -> dict[str, Any]:
    track = preferred_track(provider_payload)
    if not track:
        raise ValueError("provider returned no subtitle tracks")
    vtt_content = str(track.get("vttContent") or "").strip()
    if not vtt_content:
        raise ValueError("provider returned subtitle track without inline VTT")

    segments = parse_vtt(vtt_content)
    text = "\n".join(segment["text"] for segment in segments)
    if len(text) < args.min_characters:
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
            "endpoint": provider_url(video["id"]),
            "retrieved": time.strftime("%Y-%m-%d"),
        },
        "video_index": video.get("index"),
        "video": video,
        "transcript": {
            "videoId": video["id"],
            "title": video["title"],
            "text": text,
            "segments": segments,
            "track": {
                "langCode": track.get("langCode"),
                "langName": track.get("langName"),
                "isAsr": track.get("isAsr"),
                "isTranslatable": track.get("isTranslatable"),
            },
            "confidence": "online provider transcript; cross-check against another provider or YouTube panel when possible",
        },
        "raw_provider_payload": {
            key: value for key, value in provider_payload.items() if key != "subtitles"
        },
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

        status_code, payload, error = fetch_subtitles(video["id"], args.timeout)
        row = {
            "id": video["id"],
            "index": video["index"],
            "title": video["title"],
            "url": video["url"],
            "provider": PROVIDER_NAME,
            "provider_url": provider_url(video["id"]),
            "http_status": status_code,
            "status": "error",
            "error": error,
        }
        if isinstance(payload, dict):
            subtitles = payload.get("subtitles")
            row["video_title_returned"] = payload.get("videoTitle")
            row["subtitle_tracks"] = len(subtitles) if isinstance(subtitles, list) else None
            row["publish_date"] = payload.get("publishDate")
            row["provider_source"] = payload.get("_source")
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
    manifest_path = args.target_dir / "evidence" / "media" / "provider-probes" / "youtubetranscript-ai-manifest.json"
    prior = load_json(manifest_path) if manifest_path.exists() else []
    write_json(manifest_path, [*prior, *rows])
    ok = sum(1 for row in rows if row.get("status") == "ok")
    print(f"{PROVIDER_NAME}: collected {ok}/{len(rows)} transcripts")


if __name__ == "__main__":
    main()

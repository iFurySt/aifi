#!/usr/bin/env python3
"""Collect YouTube transcripts through YouTLDR's URL ingestion endpoint."""

from __future__ import annotations

import argparse
import json
import re
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path
from typing import Any


DEFAULT_TARGET_DIR = Path("research/targets/terry-chen-youtube")
DEFAULT_GAP_PRIORITY = Path("research/targets/terry-chen-youtube/evidence/media/2026-07-14-transcript-gap-priority.md")
PROVIDER_NAME = "YouTLDR"
PROVIDER_SLUG = "youtldr"
PROVIDER_PAGE = "https://you-tldr.com/"
INGESTION_ENDPOINT = "https://you-tldr.com/api/ingestions"


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
    return statuses


def video_ids_from_markdown(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    seen: set[str] = set()
    ids: list[str] = []
    patterns = [
        r"`([A-Za-z0-9_-]{11})`",
        r"youtube\.com/watch\?v=([A-Za-z0-9_-]{11})",
        r"youtu\.be/([A-Za-z0-9_-]{11})",
    ]
    for video_id in [match for pattern in patterns for match in re.findall(pattern, text)]:
        if video_id in seen:
            continue
        seen.add(video_id)
        ids.append(video_id)
    return ids


def select_videos(args: argparse.Namespace, videos: list[dict[str, Any]]) -> list[dict[str, Any]]:
    statuses = transcript_status(args.target_dir)
    selected = videos if args.include_existing else [video for video in videos if statuses.get(video["id"]) != "ok"]
    if args.priority_list:
        priority_ids = video_ids_from_markdown(args.priority_list)
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


def request_json(
    url: str,
    *,
    method: str = "GET",
    body: dict[str, Any] | None = None,
    token: str | None = None,
    timeout: int,
) -> tuple[int | None, dict[str, Any] | None, str | None]:
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {
        "Accept": "application/json,text/plain,*/*",
        "Referer": PROVIDER_PAGE,
        "User-Agent": "Mozilla/5.0 (compatible; AIFi transcript research)",
    }
    if body is not None:
        headers["Content-Type"] = "application/json"
        headers["Origin"] = PROVIDER_PAGE.rstrip("/")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
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


def start_ingestion(video: dict[str, Any], language: str, timeout: int) -> tuple[int | None, dict[str, Any] | None, str | None]:
    return request_json(
        INGESTION_ENDPOINT,
        method="POST",
        timeout=timeout,
        body={
            "requestId": str(uuid.uuid4()),
            "url": video["url"],
            "videoId": video["id"],
            "language": language,
        },
    )


def poll_ingestion(status_url: str, token: str, args: argparse.Namespace) -> tuple[dict[str, Any] | None, str | None]:
    deadline = time.time() + args.max_wait
    last_payload: dict[str, Any] | None = None
    while time.time() < deadline:
        status_code, payload, error = request_json(
            f"https://you-tldr.com{status_url}",
            token=token,
            timeout=args.timeout,
        )
        if error:
            return last_payload, error
        if not isinstance(payload, dict):
            return last_payload, "provider status payload was not JSON object"
        last_payload = payload
        status = payload.get("status")
        if status in {"completed", "failed", "errored", "error"}:
            return payload, None
        retry_after = payload.get("retryAfterMs")
        sleep_seconds = args.poll_interval
        if isinstance(retry_after, (int, float)) and retry_after > 0:
            sleep_seconds = max(sleep_seconds, min(float(retry_after) / 1000, 10))
        time.sleep(sleep_seconds)
    return last_payload, f"timed out after {args.max_wait} seconds"


def format_time(seconds: int | float | None) -> str | None:
    if seconds is None:
        return None
    total = int(float(seconds))
    hours, remainder = divmod(total, 3600)
    minutes, sec = divmod(remainder, 60)
    if hours:
        return f"{hours:02d}:{minutes:02d}:{sec:02d}"
    return f"{minutes:02d}:{sec:02d}"


def normalize_segments(items: list[Any]) -> list[dict[str, Any]]:
    segments: list[dict[str, Any]] = []
    for index, item in enumerate(items):
        if not isinstance(item, dict):
            continue
        text = str(item.get("text") or "").strip()
        if not text:
            continue
        start = item.get("start")
        segments.append(
            {
                "index": index,
                "time": format_time(start),
                "start": start,
                "duration": item.get("duration"),
                "text": text,
            }
        )
    return segments


def transcript_items(payload: dict[str, Any]) -> list[Any]:
    result = payload.get("result")
    if not isinstance(result, dict):
        return []
    response = result.get("response")
    if not isinstance(response, dict):
        return []
    transcript = response.get("transcript")
    return transcript if isinstance(transcript, list) else []


def response_meta(payload: dict[str, Any]) -> dict[str, Any]:
    result = payload.get("result")
    if not isinstance(result, dict):
        return {}
    response = result.get("response")
    if not isinstance(response, dict):
        return {}
    return response


def write_transcript(args: argparse.Namespace, video: dict[str, Any], provider_payload: dict[str, Any]) -> dict[str, Any]:
    segments = normalize_segments(transcript_items(provider_payload))
    text = "\n".join(segment["text"] for segment in segments).strip()
    if len(text) < args.min_characters or len(segments) < args.min_segments:
        raise ValueError("provider returned no usable transcript text")

    meta = response_meta(provider_payload)
    result = provider_payload.get("result") if isinstance(provider_payload.get("result"), dict) else {}
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
            "endpoint": INGESTION_ENDPOINT,
            "retrieved": time.strftime("%Y-%m-%d"),
            "extraction": "Anonymous URL ingestion endpoint; may use provider-side Whisper fallback for no-caption videos",
        },
        "video_index": video.get("index"),
        "video": video,
        "transcript": {
            "videoId": provider_payload.get("videoId") or video["id"],
            "title": meta.get("videoTitle") or video["title"],
            "text": text,
            "segments": segments,
            "language": {
                "requested": provider_payload.get("languageCode"),
                "used": provider_payload.get("usedLanguageCode"),
            },
            "source": meta.get("source"),
            "fallback": meta.get("fallback"),
            "confidence": "online provider transcript; provider-side cloud transcription should be cross-checked when another source appears",
        },
        "raw_provider_payload": provider_payload,
    }
    txt_path.write_text(text + "\n", encoding="utf-8")
    write_json(json_path, payload)
    return {
        "output_txt": str(txt_path),
        "output_json": str(json_path),
        "segments": len(segments),
        "characters": len(text),
        "provider_source": meta.get("source"),
        "provider_fallback": meta.get("fallback"),
        "cache_hit": result.get("cacheHit"),
    }


def provider_manifest_path(target_dir: Path) -> Path:
    return target_dir / "evidence" / "media" / "provider-probes" / f"{PROVIDER_SLUG}-manifest.json"


def append_manifest_row(target_dir: Path, row: dict[str, Any]) -> None:
    path = provider_manifest_path(target_dir)
    rows = load_json(path) if path.exists() else []
    rows.append(row)
    write_json(path, rows)


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

        row = {
            "id": video["id"],
            "index": video["index"],
            "title": video["title"],
            "url": video["url"],
            "provider": PROVIDER_NAME,
            "provider_url": PROVIDER_PAGE,
            "language": args.language,
            "status": "error",
            "error": None,
        }
        status_code, start_payload, error = start_ingestion(video, args.language, args.timeout)
        row["start_http_status"] = status_code
        if error:
            row["error"] = error
        elif not isinstance(start_payload, dict):
            row["error"] = "provider start payload was not JSON object"
        else:
            row["run_id"] = start_payload.get("runId")
            row["requires_auth"] = start_payload.get("requiresAuth")
            row["start_status"] = start_payload.get("status")
            status_url = start_payload.get("statusUrl")
            token = start_payload.get("accessToken")
            if not status_url or not token:
                row["status"] = "provider_failed"
                row["provider_message"] = start_payload.get("message") or start_payload.get("error")
            else:
                final_payload, poll_error = poll_ingestion(str(status_url), str(token), args)
                if poll_error:
                    row["error"] = poll_error
                if isinstance(final_payload, dict):
                    row["final_status"] = final_payload.get("status")
                    row["used_language"] = final_payload.get("usedLanguageCode")
                    row["provider_error"] = final_payload.get("error")
                    meta = response_meta(final_payload)
                    row["provider_message"] = meta.get("reason") or meta.get("error")
                    row["provider_source"] = meta.get("source")
                    row["provider_fallback"] = meta.get("fallback")
                    row["video_title_returned"] = meta.get("videoTitle")
                    items = transcript_items(final_payload)
                    row["segments_returned"] = len(items)
                    row["characters_returned"] = sum(
                        len(str(item.get("text") or "")) for item in items if isinstance(item, dict)
                    )
                    try:
                        if final_payload.get("status") == "completed":
                            row.update(write_transcript(args, video, final_payload))
                            row["status"] = "ok"
                            row["error"] = None
                        else:
                            row["status"] = "provider_failed"
                    except ValueError as exc:
                        row["status"] = "provider_failed"
                        row["error"] = str(exc)
                else:
                    row["status"] = "provider_failed"
        if row["status"] == "error" and not row.get("error"):
            row["status"] = "provider_failed"
        rows.append(row)
        append_manifest_row(args.target_dir, row)
        print(f"{video['index']:03d} {video['id']} {row['status']}", flush=True)
        time.sleep(args.delay)
    return rows


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target-dir", type=Path, default=DEFAULT_TARGET_DIR)
    parser.add_argument("--priority-list", type=Path, nargs="?", const=DEFAULT_GAP_PRIORITY)
    parser.add_argument("--video-id", action="append")
    parser.add_argument("--start-at", type=int)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--include-existing", action="store_true")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--language", default="zh")
    parser.add_argument("--timeout", type=int, default=45)
    parser.add_argument("--max-wait", type=int, default=240)
    parser.add_argument("--poll-interval", type=float, default=10.0)
    parser.add_argument("--delay", type=float, default=2.0)
    parser.add_argument("--min-characters", type=int, default=500)
    parser.add_argument("--min-segments", type=int, default=3)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows = collect(args)
    ok = sum(1 for row in rows if row.get("status") == "ok")
    print(f"{PROVIDER_NAME}: collected {ok}/{len(rows)} transcripts")


if __name__ == "__main__":
    main()

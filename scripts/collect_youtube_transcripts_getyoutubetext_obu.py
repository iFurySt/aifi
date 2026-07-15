#!/usr/bin/env python3
"""Collect YouTube transcripts from GetYouTubeText through a browser Turnstile token."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import time
from pathlib import Path
from typing import Any


DEFAULT_TARGET_DIR = Path("research/targets/terry-chen-youtube")
DEFAULT_PRIORITY_LIST = Path("research/targets/terry-chen-youtube/evidence/media/asr/2026-07-13-priority-run-list.md")
PROVIDER_NAME = "GetYouTubeText"
PROVIDER_SLUG = "getyoutubetext"
PROVIDER_PAGE = "https://getyoutubetext.com/"
PROVIDER_ENDPOINT = "https://getyoutubetext.com/api/transcript"


def run(cmd: list[str], *, timeout: int = 30) -> Any:
    proc = subprocess.run(cmd, text=True, capture_output=True, timeout=timeout)
    if proc.returncode != 0:
        raise RuntimeError((proc.stderr or proc.stdout).strip())
    return json.loads(proc.stdout)


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


def obu_base(args: argparse.Namespace) -> list[str]:
    return ["obu", "--session-id", args.obu_session_id, "--browser", args.browser, "--profile", args.profile]


def cdp_eval(args: argparse.Namespace, tab_id: int, expression: str, *, timeout: int = 60) -> Any:
    payload = json.dumps({"expression": expression, "awaitPromise": True, "returnByValue": True})
    result = run(
        [
            *obu_base(args),
            "cdp",
            "--tab-id",
            str(tab_id),
            "--method",
            "Runtime.evaluate",
            "--params",
            payload,
        ],
        timeout=timeout,
    )
    value = result.get("result", {}).get("result", {}).get("value")
    if isinstance(value, str):
        return json.loads(value)
    return value


def setup_obu(args: argparse.Namespace) -> int:
    run([*obu_base(args), "ping"], timeout=30)
    run([*obu_base(args), "name-session", "--name", "Terry GetYouTubeText Provider - OBU"], timeout=30)
    opened = run([*obu_base(args), "open-tab", "--url", PROVIDER_PAGE], timeout=30)
    return int(opened["tab"]["id"])


def fetch_transcript(args: argparse.Namespace, tab_id: int, video: dict[str, Any]) -> dict[str, Any]:
    run([*obu_base(args), "navigate", "--tab-id", str(tab_id), "--url", PROVIDER_PAGE], timeout=30)
    time.sleep(args.page_wait_seconds)
    expression = f"""
    (async () => {{
      const token = document.querySelector('input[type=hidden]')?.value || '';
      const url = {json.dumps(video["url"])};
      const result = {{ tokenLength: token.length }};
      try {{
        const response = await fetch(`/api/transcript?url=${{encodeURIComponent(url)}}`, {{
          headers: {{ 'x-turnstile-token': token }}
        }});
        const payload = await response.json().catch(() => ({{}}));
        result.ok = response.ok;
        result.status = response.status;
        result.payload = payload;
      }} catch (error) {{
        result.ok = false;
        result.status = null;
        result.error = String(error);
      }}
      return JSON.stringify(result);
    }})()
    """
    return cdp_eval(args, tab_id, expression, timeout=args.timeout)


def normalize_segments(provider_payload: dict[str, Any]) -> list[dict[str, Any]]:
    raw_segments = provider_payload.get("transcript")
    if not isinstance(raw_segments, list):
        return []
    segments: list[dict[str, Any]] = []
    for index, segment in enumerate(raw_segments):
        if not isinstance(segment, dict):
            continue
        text = str(segment.get("text") or "").strip()
        if not text:
            continue
        row: dict[str, Any] = {"index": index, "text": text}
        if "offset" in segment:
            row["offset"] = segment["offset"]
        if "duration" in segment:
            row["duration"] = segment["duration"]
        segments.append(row)
    return segments


def write_transcript(args: argparse.Namespace, video: dict[str, Any], provider_payload: dict[str, Any]) -> dict[str, Any]:
    segments = normalize_segments(provider_payload)
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
            "extraction": "Open Browser Use page token plus provider API",
        },
        "video_index": video.get("index"),
        "video": video,
        "transcript": {
            "videoId": video["id"],
            "title": provider_payload.get("title") or video["title"],
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
    tab_id = setup_obu(args)
    try:
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

            row = {
                "id": video["id"],
                "index": video["index"],
                "title": video["title"],
                "url": video["url"],
                "provider": PROVIDER_NAME,
                "provider_url": PROVIDER_ENDPOINT,
                "status": "error",
                "error": None,
            }
            try:
                result = fetch_transcript(args, tab_id, video)
                payload = result.get("payload") if isinstance(result, dict) else None
                row["http_status"] = result.get("status") if isinstance(result, dict) else None
                row["turnstile_token_length"] = result.get("tokenLength") if isinstance(result, dict) else None
                if isinstance(payload, dict):
                    row["provider_message"] = payload.get("error") or payload.get("detail") or payload.get("message")
                    transcript = payload.get("transcript")
                    if isinstance(transcript, list):
                        row["segments_returned"] = len(transcript)
                        row["characters_returned"] = sum(
                            len(str(segment.get("text") or "")) for segment in transcript if isinstance(segment, dict)
                        )
                if isinstance(result, dict) and result.get("ok") and isinstance(payload, dict):
                    row.update(write_transcript(args, video, payload))
                    row["status"] = "ok"
                else:
                    row["status"] = "provider_failed"
                    row["error"] = result.get("error") if isinstance(result, dict) else "invalid provider result"
            except Exception as exc:  # noqa: BLE001 - provider probes should continue per video.
                row["status"] = "error"
                row["error"] = str(exc)[-1000:]
            rows.append(row)
            print(f"{video['index']:03d} {video['id']} {row['status']}", flush=True)
            time.sleep(args.delay)
    finally:
        if args.finalize_tabs:
            run([*obu_base(args), "finalize-tabs", "--keep", "[]"], timeout=30)
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
    parser.add_argument("--obu-session-id", default="terry-getyoutubetext-provider")
    parser.add_argument("--browser", default="chrome")
    parser.add_argument("--profile", default="Default")
    parser.add_argument("--timeout", type=int, default=75)
    parser.add_argument("--delay", type=float, default=1.0)
    parser.add_argument("--page-wait-seconds", type=float, default=5.0)
    parser.add_argument("--min-characters", type=int, default=500)
    parser.add_argument("--min-segments", type=int, default=10)
    parser.add_argument("--finalize-tabs", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows = collect(args)
    manifest_path = args.target_dir / "evidence" / "media" / "provider-probes" / "getyoutubetext-manifest.json"
    prior = load_json(manifest_path) if manifest_path.exists() else []
    write_json(manifest_path, [*prior, *rows])
    ok = sum(1 for row in rows if row.get("status") == "ok")
    print(f"{PROVIDER_NAME}: collected {ok}/{len(rows)} transcripts")


if __name__ == "__main__":
    main()

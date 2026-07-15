#!/usr/bin/env python3
"""Collect YouTube transcripts from Tactiq's browser-rendered transcript page."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import time
import urllib.parse
from pathlib import Path
from typing import Any


DEFAULT_TARGET_DIR = Path("research/targets/terry-chen-youtube")
DEFAULT_PRIORITY_LIST = Path("research/targets/terry-chen-youtube/evidence/media/asr/2026-07-13-priority-run-list.md")
PROVIDER_NAME = "Tactiq"
PROVIDER_SLUG = "tactiq"
TIMESTAMP_RE = re.compile(r"^\d{2}:\d{2}:\d{2}\.\d{3}$")


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


def tactiq_url(video: dict[str, Any]) -> str:
    return "https://tactiq.io/tools/run/youtube_transcript?" + urllib.parse.urlencode({"yt": video["url"]})


def cdp_eval(args: argparse.Namespace, tab_id: int, expression: str, *, timeout: int = 30) -> Any:
    payload = json.dumps({"expression": expression, "returnByValue": True})
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


def parse_segments(page_text: str) -> list[dict[str, Any]]:
    lines = [line.strip() for line in page_text.splitlines()]
    segments: list[dict[str, Any]] = []
    index = 0
    while index < len(lines):
        line = lines[index]
        if TIMESTAMP_RE.match(line) and index + 1 < len(lines):
            text = lines[index + 1].strip()
            if text:
                segments.append({"time": line, "text": text})
            index += 2
            continue
        index += 1
    return segments


def write_transcript(args: argparse.Namespace, video: dict[str, Any], page_url: str, segments: list[dict[str, Any]]) -> dict[str, Any]:
    text = "\n".join(segment["text"] for segment in segments)
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
            "page_url": page_url,
            "retrieved": time.strftime("%Y-%m-%d"),
            "extraction": "Open Browser Use DOM parse",
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
    }
    txt_path.write_text(text, encoding="utf-8")
    write_json(json_path, payload)
    return {"output_txt": str(txt_path), "output_json": str(json_path), "segments": len(segments), "characters": len(text)}


def setup_obu(args: argparse.Namespace) -> None:
    run([*obu_base(args), "ping"], timeout=30)
    run([*obu_base(args), "name-session", "--name", "Terry Tactiq Provider - OBU"], timeout=30)


def collect(args: argparse.Namespace) -> list[dict[str, Any]]:
    setup_obu(args)
    selected = select_videos(args, video_index(args.target_dir))
    transcript_dir = args.target_dir / "evidence" / "media" / "transcripts"
    rows: list[dict[str, Any]] = []
    tab_id: int | None = None
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

        url = tactiq_url(video)
        row = {
            "id": video["id"],
            "index": video["index"],
            "title": video["title"],
            "url": video["url"],
            "provider": PROVIDER_NAME,
            "provider_url": url,
            "status": "provider_failed",
            "error": None,
        }
        try:
            if tab_id is None:
                opened = run([*obu_base(args), "open-tab", "--url", url], timeout=30)
                tab_id = opened["tab"]["id"]
            else:
                run([*obu_base(args), "navigate", "--tab-id", str(tab_id), "--url", url], timeout=30)

            page = {}
            segments: list[dict[str, Any]] = []
            for _ in range(args.wait_attempts):
                time.sleep(args.wait_seconds)
                page = cdp_eval(
                    args,
                    tab_id,
                    "JSON.stringify({url: location.href, title: document.title, text: document.body.innerText})",
                    timeout=30,
                )
                segments = parse_segments(page.get("text") or "")
                if len(segments) >= args.min_segments:
                    break
            if len(segments) >= args.min_segments:
                row.update(write_transcript(args, video, page.get("url") or url, segments))
                row["status"] = "ok"
            else:
                row["error"] = f"no timestamped transcript segments found; parsed {len(segments)} segments"
        except Exception as exc:  # noqa: BLE001 - provider probes should continue per video.
            row["status"] = "error"
            row["error"] = str(exc)[-1000:]
        rows.append(row)
        print(f"{video['index']:03d} {video['id']} {row['status']}", flush=True)
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
    parser.add_argument("--obu-session-id", default="terry-tactiq-provider")
    parser.add_argument("--browser", default="chrome")
    parser.add_argument("--profile", default="Default")
    parser.add_argument("--wait-attempts", type=int, default=6)
    parser.add_argument("--wait-seconds", type=float, default=5)
    parser.add_argument("--min-segments", type=int, default=10)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows = collect(args)
    manifest_path = args.target_dir / "evidence" / "media" / "provider-probes" / "tactiq-manifest.json"
    prior = load_json(manifest_path) if manifest_path.exists() else []
    write_json(manifest_path, [*prior, *rows])
    ok = sum(1 for row in rows if row.get("status") == "ok")
    print(f"{PROVIDER_NAME}: collected {ok}/{len(rows)} transcripts")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Collect transcripts with youtube-transcript-api when network/proxy permits."""

from __future__ import annotations

import argparse
import json
import shlex
import subprocess
import time
from pathlib import Path
from typing import Any


DEFAULT_TARGET_DIR = Path("research/targets/terry-chen-youtube")
DEFAULT_COMMAND = "uvx --from youtube-transcript-api youtube_transcript_api"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def transcript_ids(target_dir: Path) -> set[str]:
    transcript_dir = target_dir / "evidence" / "media" / "transcripts"
    return {
        path.stem.split(".")[0]
        for path in transcript_dir.glob("*.json")
        if path.name != "manifest.json"
    }


def selected_videos(args: argparse.Namespace) -> list[dict[str, Any]]:
    videos = load_json(args.target_dir / "evidence" / "media" / "youtube-video-index.json")
    existing = transcript_ids(args.target_dir)
    selected = [video for video in videos if args.include_existing or video["id"] not in existing]
    if args.start_at:
        selected = [video for video in selected if video["index"] >= args.start_at]
    if args.video_id:
        wanted = set(args.video_id)
        selected = [video for video in selected if video["id"] in wanted]
    if args.limit:
        selected = selected[: args.limit]
    return selected


def parse_transcript_stdout(stdout: str) -> list[dict[str, Any]]:
    data = json.loads(stdout)
    if isinstance(data, dict):
        if "transcripts" in data and isinstance(data["transcripts"], list):
            return data["transcripts"]
        if "text" in data:
            return [data]
    if isinstance(data, list):
        return data
    raise ValueError("unsupported youtube-transcript-api JSON shape")


def normalize_segments(raw: list[dict[str, Any]]) -> list[dict[str, Any]]:
    segments: list[dict[str, Any]] = []
    for row in raw:
        text = str(row.get("text") or "").replace("\n", " ").strip()
        if not text:
            continue
        segments.append(
            {
                "time": row.get("start"),
                "duration": row.get("duration"),
                "text": text,
            }
        )
    return segments


def command_for(args: argparse.Namespace, video_id: str) -> list[str]:
    cmd = shlex.split(args.command)
    cmd.extend(["--format", "json"])
    cmd.append(video_id)
    if args.languages:
        cmd.append("--languages")
        cmd.extend(args.languages)
    if args.translate:
        cmd.extend(["--translate", args.translate])
    if args.http_proxy:
        cmd.extend(["--http-proxy", args.http_proxy])
    if args.https_proxy:
        cmd.extend(["--https-proxy", args.https_proxy])
    return cmd


def collect_one(args: argparse.Namespace, video: dict[str, Any]) -> dict[str, Any]:
    cmd = command_for(args, video["id"])
    proc = subprocess.run(cmd, text=True, capture_output=True, timeout=args.timeout)
    result = {
        "id": video["id"],
        "index": video["index"],
        "title": video["title"],
        "url": video["url"],
        "status": "error",
        "error": None,
    }
    if proc.returncode != 0:
        result["status"] = "request_failed"
        result["error"] = (proc.stderr or proc.stdout)[-2000:]
        return result

    try:
        raw = parse_transcript_stdout(proc.stdout)
        segments = normalize_segments(raw)
    except Exception as exc:
        if "YouTube is blocking requests from your IP" in proc.stdout:
            result["status"] = "request_blocked"
        else:
            result["status"] = "parse_failed"
        result["error"] = f"{exc}; stdout head: {proc.stdout[:500]}"
        return result

    if not segments:
        result["status"] = "empty"
        return result

    transcript_dir = args.target_dir / "evidence" / "media" / "transcripts"
    payload = {
        "source": "youtube-transcript-api CLI",
        "source_url": video["url"],
        "retrieved": time.strftime("%Y-%m-%d"),
        "video_index": video.get("index"),
        "video": video,
        "transcript": {
            "videoId": video["id"],
            "title": video["title"],
            "segments": segments,
            "text": "\n".join(segment["text"] for segment in segments),
        },
    }
    write_json(transcript_dir / f"{video['id']}.json", payload)
    (transcript_dir / f"{video['id']}.txt").write_text(payload["transcript"]["text"], encoding="utf-8")
    result["status"] = "ok"
    result["segments"] = len(segments)
    return result


def update_manifest(args: argparse.Namespace, rows: list[dict[str, Any]]) -> None:
    path = args.target_dir / "evidence" / "media" / "transcript-api-manifest.json"
    prior: dict[str, dict[str, Any]] = {}
    if path.exists():
        for row in load_json(path):
            prior[row["id"]] = row
    for row in rows:
        prior[row["id"]] = row
    ordered = sorted(prior.values(), key=lambda row: (row.get("index") or 999999, row.get("id") or ""))
    write_json(path, ordered)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target-dir", type=Path, default=DEFAULT_TARGET_DIR)
    parser.add_argument("--command", default=DEFAULT_COMMAND)
    parser.add_argument("--languages", nargs="*", default=["zh-Hant", "zh-TW", "zh", "en"])
    parser.add_argument("--translate")
    parser.add_argument("--http-proxy")
    parser.add_argument("--https-proxy")
    parser.add_argument("--start-at", type=int)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--video-id", action="append")
    parser.add_argument("--include-existing", action="store_true")
    parser.add_argument("--timeout", type=int, default=120)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows: list[dict[str, Any]] = []
    for video in selected_videos(args):
        row = collect_one(args, video)
        rows.append(row)
        update_manifest(args, rows)
        print(f"{video['index']:03d} {video['id']} {row['status']}", flush=True)


if __name__ == "__main__":
    main()

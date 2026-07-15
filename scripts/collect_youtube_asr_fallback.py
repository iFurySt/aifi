#!/usr/bin/env python3
"""Prepare and run ASR fallback jobs for YouTube videos without transcripts."""

from __future__ import annotations

import argparse
import csv
import json
import re
import shlex
import subprocess
import sys
import time
from pathlib import Path
from typing import Any


DEFAULT_TARGET_DIR = Path("research/targets/terry-chen-youtube")
DEFAULT_AUDIO_CACHE = Path(".cache/terry-youtube-audio")
DEFAULT_PRIORITY_LIST = Path("research/targets/terry-chen-youtube/evidence/media/asr/2026-07-13-priority-run-list.md")
AUDIO_EXTENSIONS = (
    ".m4a",
    ".mp3",
    ".wav",
    ".webm",
    ".opus",
    ".ogg",
    ".flac",
    ".aac",
    ".mp4",
)


def run(cmd: list[str], *, timeout: int | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, text=True, capture_output=True, timeout=timeout)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


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
                video_id = payload.get("video", {}).get("id") or payload.get("transcript", {}).get("videoId") or path.stem
                statuses.setdefault(video_id, "ok")
            except Exception:
                statuses.setdefault(path.stem, "ok")
    return statuses


def build_full_queue(args: argparse.Namespace) -> list[dict[str, Any]]:
    videos = load_json(args.target_dir / "evidence" / "media" / "youtube-video-index.json")
    statuses = transcript_status(args.target_dir)
    queue: list[dict[str, Any]] = []
    for video in videos:
        status = statuses.get(video["id"], "not_checked")
        if args.include_existing or status != "ok":
            queue.append(
                {
                    "index": video["index"],
                    "id": video["id"],
                    "title": video["title"],
                    "url": video["url"],
                    "duration_seconds": video.get("duration_seconds"),
                    "transcript_status": status,
                    "asr_status": "pending",
                }
            )
    return queue


def select_queue(args: argparse.Namespace, queue: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if args.priority_list:
        priority_ids = priority_video_ids(args.priority_list)
        order = {video_id: idx for idx, video_id in enumerate(priority_ids)}
        queue = [item for item in queue if item["id"] in order]
        queue.sort(key=lambda item: order[item["id"]])
    if args.video_id:
        wanted = set(args.video_id)
        queue = [item for item in queue if item["id"] in wanted]
    if args.start_at:
        queue = [item for item in queue if item["index"] >= args.start_at]
    if args.limit:
        queue = queue[: args.limit]
    return queue


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


def write_queue_files(target_dir: Path, queue: list[dict[str, Any]], *, stem: str = "queue") -> None:
    asr_dir = target_dir / "evidence" / "media" / "asr"
    write_json(asr_dir / f"{stem}.json", queue)
    with (asr_dir / f"{stem}.csv").open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=[
                "index",
                "id",
                "title",
                "url",
                "duration_seconds",
                "transcript_status",
                "asr_status",
            ],
        )
        writer.writeheader()
        writer.writerows(queue)


def audio_stem(item: dict[str, Any]) -> str:
    return f"{item['index']:03d}-{item['id']}"


def preferred_audio_path(args: argparse.Namespace, item: dict[str, Any]) -> Path:
    return args.audio_cache / f"{audio_stem(item)}.{args.audio_format}"


def find_audio_file(args: argparse.Namespace, item: dict[str, Any]) -> Path | None:
    preferred = preferred_audio_path(args, item)
    if preferred.exists():
        return preferred
    matches = sorted(
        path
        for path in args.audio_cache.glob(f"{audio_stem(item)}.*")
        if path.is_file() and path.suffix.lower() in AUDIO_EXTENSIONS
    )
    return matches[0] if matches else None


def download_audio(args: argparse.Namespace, item: dict[str, Any]) -> tuple[str, str | None, Path | None]:
    args.audio_cache.mkdir(parents=True, exist_ok=True)
    output_template = str(args.audio_cache / f"{audio_stem(item)}.%(ext)s")
    cmd = [
        "yt-dlp",
        "-x",
        "--audio-format",
        args.audio_format,
        "--audio-quality",
        args.audio_quality,
        "-o",
        output_template,
    ]
    if args.download_section:
        cmd.extend(["--download-sections", args.download_section])
    if args.cookies_from_browser:
        cmd.extend(["--cookies-from-browser", args.cookies_from_browser])
    cmd.append(item["url"])

    proc = run(cmd, timeout=args.download_timeout)
    downloaded = find_audio_file(args, item)
    if proc.returncode == 0:
        if downloaded:
            return "downloaded", None, downloaded
        return "download_failed", "yt-dlp completed but no supported audio file was found", None
    return "download_failed", (proc.stderr or proc.stdout)[-2000:], None


def transcribe_with_whisper(args: argparse.Namespace, item: dict[str, Any], path: Path) -> tuple[str, str | None]:
    out_dir = args.target_dir / "evidence" / "media" / "asr" / "raw-whisper"
    out_dir.mkdir(parents=True, exist_ok=True)
    cmd = [
        "whisper",
        str(path),
        "--model",
        args.whisper_model,
        "--language",
        args.language,
        "--output_dir",
        str(out_dir),
        "--output_format",
        "all",
    ]
    proc = run(cmd, timeout=args.asr_timeout)
    txt_candidates = sorted(out_dir.glob(f"{path.stem}*.txt"))
    if proc.returncode != 0:
        return "asr_failed", (proc.stderr or proc.stdout)[-2000:]
    if not txt_candidates:
        return "asr_failed", "whisper completed but no txt output was found"

    txt = txt_candidates[0].read_text(encoding="utf-8").strip()
    payload = {
        "source": "ASR fallback via OpenAI Whisper CLI",
        "source_url": item["url"],
        "retrieved": time.strftime("%Y-%m-%d"),
        "video": item,
        "asr": {
            "engine": "whisper-cli",
            "model": args.whisper_model,
            "language": args.language,
            "audio_cache_file": str(path),
            "raw_output_dir": str(out_dir),
        },
        "transcript": {
            "videoId": item["id"],
            "title": item["title"],
            "text": txt,
            "segments": [],
            "confidence": "machine-generated ASR; requires spot-checking",
        },
    }
    transcript_dir = args.target_dir / "evidence" / "media" / "transcripts"
    transcript_dir.mkdir(parents=True, exist_ok=True)
    write_json(transcript_dir / f"{item['id']}.asr.json", payload)
    (transcript_dir / f"{item['id']}.asr.txt").write_text(txt, encoding="utf-8")
    return "asr_ok", None


def transcribe_with_command(args: argparse.Namespace, item: dict[str, Any], path: Path) -> tuple[str, str | None]:
    transcript_dir = args.target_dir / "evidence" / "media" / "transcripts"
    transcript_dir.mkdir(parents=True, exist_ok=True)
    txt_path = transcript_dir / f"{item['id']}.asr.txt"
    json_path = transcript_dir / f"{item['id']}.asr.json"
    command = args.asr_command.format(
        audio=shlex.quote(str(path)),
        txt=shlex.quote(str(txt_path)),
        json=shlex.quote(str(json_path)),
        video_id=shlex.quote(item["id"]),
        title=shlex.quote(item["title"]),
    )
    proc = subprocess.run(command, shell=True, text=True, capture_output=True, timeout=args.asr_timeout)
    if proc.returncode != 0:
        return "asr_failed", (proc.stderr or proc.stdout)[-2000:]
    if not txt_path.exists():
        return "asr_failed", "custom ASR command completed but did not create {txt}"
    if not json_path.exists():
        txt = txt_path.read_text(encoding="utf-8").strip()
        payload = {
            "source": "ASR fallback via custom command",
            "source_url": item["url"],
            "retrieved": time.strftime("%Y-%m-%d"),
            "video": item,
            "asr": {
                "engine": "custom-command",
                "command_template": args.asr_command,
                "audio_cache_file": str(path),
            },
            "transcript": {
                "videoId": item["id"],
                "title": item["title"],
                "text": txt,
                "segments": [],
                "confidence": "machine-generated ASR; requires spot-checking",
            },
        }
        write_json(json_path, payload)
    return "asr_ok", None


def run_jobs(args: argparse.Namespace, queue: list[dict[str, Any]]) -> list[dict[str, Any]]:
    manifest_path = args.target_dir / "evidence" / "media" / "asr" / "manifest.json"
    manifest: list[dict[str, Any]] = load_json(manifest_path) if manifest_path.exists() and not args.force else []
    terminal = {"asr_ok"} if args.retry_failed else {"asr_ok", "download_failed", "asr_failed"}
    done = {item["id"] for item in manifest if item.get("asr_status") in terminal or item.get("audio_status") in terminal}

    for item in queue:
        if item["id"] in done and not args.force:
            continue

        result = {
            "index": item["index"],
            "id": item["id"],
            "title": item["title"],
            "url": item["url"],
            "transcript_status": item["transcript_status"],
            "audio_status": "not_requested",
            "asr_status": "not_requested",
            "error": None,
        }

        path = find_audio_file(args, item)
        if args.download:
            audio_status, error, downloaded_path = download_audio(args, item)
            result["audio_status"] = audio_status
            result["error"] = error
            if audio_status != "downloaded":
                manifest.append(result)
                write_json(manifest_path, manifest)
                print(f"{item['index']:03d} {item['id']} {audio_status}", flush=True)
                continue
            path = downloaded_path
        elif path:
            result["audio_status"] = "existing"
        else:
            manifest.append(result)
            write_json(manifest_path, manifest)
            print(f"{item['index']:03d} {item['id']} queued", flush=True)
            continue

        if args.transcribe:
            if path is None:
                result["asr_status"] = "asr_failed"
                result["error"] = "audio was marked available but no supported audio file path was found"
                manifest.append(result)
                write_json(manifest_path, manifest)
                print(f"{item['index']:03d} {item['id']} {result['audio_status']} {result['asr_status']}", flush=True)
                continue
            if args.asr_command:
                asr_status, error = transcribe_with_command(args, item, path)
            else:
                asr_status, error = transcribe_with_whisper(args, item, path)
            result["asr_status"] = asr_status
            result["error"] = error

        manifest.append(result)
        write_json(manifest_path, manifest)
        print(f"{item['index']:03d} {item['id']} {result['audio_status']} {result['asr_status']}", flush=True)

    return manifest


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target-dir", type=Path, default=DEFAULT_TARGET_DIR)
    parser.add_argument("--audio-cache", type=Path, default=DEFAULT_AUDIO_CACHE)
    parser.add_argument("--start-at", type=int)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--video-id", action="append", help="Limit queue/jobs to one or more video ids.")
    parser.add_argument(
        "--priority-list",
        type=Path,
        nargs="?",
        const=DEFAULT_PRIORITY_LIST,
        help="Use ASR priority markdown order. Defaults to the Terry first-batch priority list when no path is given.",
    )
    parser.add_argument("--include-existing", action="store_true", help="Include videos that already have transcript files.")
    parser.add_argument("--download", action="store_true", help="Download audio for queued videos with yt-dlp.")
    parser.add_argument("--download-section", help="yt-dlp --download-sections value, e.g. '*00:00-01:00'.")
    parser.add_argument("--cookies-from-browser", help="Explicit opt-in for yt-dlp --cookies-from-browser, e.g. chrome.")
    parser.add_argument("--audio-format", default="m4a")
    parser.add_argument("--audio-quality", default="5")
    parser.add_argument("--download-timeout", type=int, default=600)
    parser.add_argument("--transcribe", action="store_true")
    parser.add_argument("--whisper-model", default="small")
    parser.add_argument("--language", default="Chinese")
    parser.add_argument("--asr-command", help="Custom shell command template. Available: {audio}, {txt}, {json}, {video_id}, {title}.")
    parser.add_argument("--asr-timeout", type=int, default=1800)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--retry-failed", action="store_true", help="Retry prior download_failed/asr_failed rows without requiring --force.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    full_queue = build_full_queue(args)
    queue = select_queue(args, full_queue)
    write_queue_files(args.target_dir, full_queue)
    if queue != full_queue:
        write_queue_files(args.target_dir, queue, stem="selected-queue")
    if args.download or args.transcribe:
        run_jobs(args, queue)
    else:
        print(f"queued {len(queue)} ASR fallback jobs")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("interrupted", file=sys.stderr)
        raise

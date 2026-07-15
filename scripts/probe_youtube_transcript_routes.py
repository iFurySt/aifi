#!/usr/bin/env python3
"""Probe non-cookie YouTube subtitle routes for archived videos."""

from __future__ import annotations

import argparse
import json
import shlex
import subprocess
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


DEFAULT_TARGET_DIR = Path("research/targets/terry-chen-youtube")
DEFAULT_CLIENTS = ["default", "android", "ios", "tv", "android_vr", "web_embedded", "mweb", "web_safari"]
DEFAULT_TIMEDTEXT_LANGS = ["zh-Hant", "zh-TW", "zh", "en"]


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def selected_videos(args: argparse.Namespace) -> list[dict[str, Any]]:
    videos = load_json(args.target_dir / "evidence" / "media" / "youtube-video-index.json")
    if args.video_id:
        wanted = set(args.video_id)
        videos = [video for video in videos if video["id"] in wanted]
    if args.start_at:
        videos = [video for video in videos if video["index"] >= args.start_at]
    if args.limit:
        videos = videos[: args.limit]
    return videos


def command_for(args: argparse.Namespace, video: dict[str, Any], client: str) -> list[str]:
    cmd = [
        *args.yt_dlp_command,
        "--list-subs",
        "--skip-download",
        "--no-update",
    ]
    if client != "default":
        cmd.extend(["--extractor-args", f"youtube:player_client={client}"])
    cmd.append(video["url"])
    return cmd


def timedtext_urls(video_id: str, langs: list[str]) -> list[tuple[str, str]]:
    urls = [("list", f"https://video.google.com/timedtext?type=list&v={urllib.parse.quote(video_id)}")]
    for lang in langs:
        query = urllib.parse.urlencode({"v": video_id, "lang": lang, "fmt": "json3"})
        urls.append((f"json3:{lang}", f"https://www.youtube.com/api/timedtext?{query}"))
    return urls


def classify(proc: subprocess.CompletedProcess[str]) -> str:
    output = f"{proc.stdout}\n{proc.stderr}"
    if "PO Token" in output or "po_token" in output:
        if "missing subtitles languages" in output or "subtitles require a PO Token" in output:
            return "missing_po_token"
    if proc.returncode == 0:
        return "ok"
    if "Sign in to confirm" in output or "not a bot" in output:
        return "bot_check"
    if "HTTP Error 403" in output or "Forbidden" in output:
        return "forbidden"
    if "No subtitles" in output:
        return "no_subtitles"
    return "error"


def probe(args: argparse.Namespace) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for video in selected_videos(args):
        if args.route == "timedtext":
            for label, request_url in timedtext_urls(video["id"], args.timedtext_lang):
                started = time.time()
                try:
                    with urllib.request.urlopen(request_url, timeout=args.timeout) as response:
                        body = response.read().decode("utf-8", errors="replace")
                    stripped = body.strip()
                    status = "empty"
                    if label == "list" and "<track" in stripped:
                        status = "list_ok"
                    elif label.startswith("json3") and stripped.startswith("{") and "events" in stripped:
                        status = "text_ok"
                    rows.append(
                        {
                            "retrieved": time.strftime("%Y-%m-%d"),
                            "id": video["id"],
                            "index": video["index"],
                            "title": video["title"],
                            "url": video["url"],
                            "route": "timedtext",
                            "client": label,
                            "status": status,
                            "elapsed_seconds": round(time.time() - started, 2),
                            "request_url": request_url,
                            "body_head": body[:1000],
                        }
                    )
                    print(f"{video['index']:03d} {video['id']} timedtext:{label} {status}", flush=True)
                except Exception as exc:
                    rows.append(
                        {
                            "retrieved": time.strftime("%Y-%m-%d"),
                            "id": video["id"],
                            "index": video["index"],
                            "title": video["title"],
                            "url": video["url"],
                            "route": "timedtext",
                            "client": label,
                            "status": "error",
                            "elapsed_seconds": round(time.time() - started, 2),
                            "request_url": request_url,
                            "error": str(exc)[-2000:],
                        }
                    )
                    print(f"{video['index']:03d} {video['id']} timedtext:{label} error", flush=True)
            continue
        for client in args.client:
            cmd = command_for(args, video, client)
            started = time.time()
            try:
                proc = subprocess.run(cmd, text=True, capture_output=True, timeout=args.timeout)
            except subprocess.TimeoutExpired as exc:
                row = {
                    "retrieved": time.strftime("%Y-%m-%d"),
                    "id": video["id"],
                    "index": video["index"],
                    "title": video["title"],
                    "url": video["url"],
                    "route": "yt-dlp",
                    "client": client,
                    "status": "timeout",
                    "elapsed_seconds": round(time.time() - started, 2),
                    "command": cmd,
                    "error": str(exc)[-2000:],
                }
                rows.append(row)
                print(f"{video['index']:03d} {video['id']} {client} timeout", flush=True)
                continue

            status = classify(proc)
            row = {
                "retrieved": time.strftime("%Y-%m-%d"),
                "id": video["id"],
                "index": video["index"],
                "title": video["title"],
                "url": video["url"],
                "route": "yt-dlp",
                "client": client,
                "status": status,
                "elapsed_seconds": round(time.time() - started, 2),
                "command": cmd,
                "stdout_tail": proc.stdout[-2000:],
                "stderr_tail": proc.stderr[-2000:],
            }
            rows.append(row)
            print(f"{video['index']:03d} {video['id']} {client} {status}", flush=True)
    return rows


def merge_manifest(args: argparse.Namespace, rows: list[dict[str, Any]]) -> None:
    path = args.target_dir / "evidence" / "media" / "yt-dlp-route-probes.json"
    prior: dict[tuple[str, str, str, str], dict[str, Any]] = {}
    if path.exists():
        for row in load_json(path):
            route = row.get("route") or "yt-dlp"
            command_key = " ".join(row.get("command", [])[:2]) if row.get("command") else row.get("request_url", "")
            prior[(row["id"], row["client"], route, command_key)] = row
    for row in rows:
        route = row.get("route") or "yt-dlp"
        command_key = " ".join(row.get("command", [])[:2]) if row.get("command") else row.get("request_url", "")
        prior[(row["id"], row["client"], route, command_key)] = row
    ordered = sorted(
        prior.values(),
        key=lambda row: (row.get("index") or 999999, row.get("id") or "", row.get("route") or "", row["client"]),
    )
    write_json(path, ordered)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target-dir", type=Path, default=DEFAULT_TARGET_DIR)
    parser.add_argument("--yt-dlp-command", nargs="+", default=["yt-dlp"])
    parser.add_argument("--yt-dlp-command-str", help="Shell-like command string used instead of --yt-dlp-command.")
    parser.add_argument("--route", choices=["yt-dlp", "timedtext"], default="yt-dlp")
    parser.add_argument("--timedtext-lang", action="append", default=[])
    parser.add_argument("--client", action="append", default=[])
    parser.add_argument("--video-id", action="append")
    parser.add_argument("--start-at", type=int)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--timeout", type=int, default=45)
    args = parser.parse_args()
    if args.yt_dlp_command_str:
        args.yt_dlp_command = shlex.split(args.yt_dlp_command_str)
    if not args.client:
        args.client = DEFAULT_CLIENTS
    if not args.timedtext_lang:
        args.timedtext_lang = DEFAULT_TIMEDTEXT_LANGS
    return args


def main() -> None:
    args = parse_args()
    rows = probe(args)
    merge_manifest(args, rows)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Collect YouTube transcripts from YouTubeToTranscript browser pages."""

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
PROVIDER_NAME = "YouTubeToTranscript"
PROVIDER_SLUG = "youtubetotranscript"
PROVIDER_BASE_URL = "https://youtubetotranscript.com"


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


def provider_url(video_id: str) -> str:
    return f"{PROVIDER_BASE_URL}/transcript?v={video_id}"


def cdp_eval(args: argparse.Namespace, tab_id: int, expression: str, *, timeout: int = 30) -> Any:
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
    if "exceptionDetails" in result.get("result", {}):
        raise RuntimeError(json.dumps(result["result"]["exceptionDetails"], ensure_ascii=False))
    value = result.get("result", {}).get("result", {}).get("value")
    if isinstance(value, str):
        return json.loads(value)
    return value


def page_extract_js() -> str:
    return r"""
JSON.stringify({
  url: location.href,
  title: document.title,
  pageText: document.body?.innerText?.slice(0, 2000) || "",
  transcriptText: (document.querySelector("#transcript")?.innerText || "").trim(),
  segments: [...document.querySelectorAll(".transcript-segment")]
    .map((node, index) => ({index, text: (node.innerText || node.textContent || "").trim()}))
    .filter(segment => segment.text)
})
"""


def write_transcript(args: argparse.Namespace, video: dict[str, Any], page: dict[str, Any]) -> dict[str, Any]:
    raw_segments = page.get("segments") if isinstance(page.get("segments"), list) else []
    segments = [
        {"index": item.get("index"), "text": str(item.get("text") or "").strip()}
        for item in raw_segments
        if str(item.get("text") or "").strip()
    ]
    text = str(page.get("transcriptText") or "").strip()
    if not text and segments:
        text = "\n".join(segment["text"] for segment in segments)
    if not text:
        raise ValueError("provider page did not expose transcript text")

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
            "page_url": page.get("url") or provider_url(video["id"]),
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
    run([*obu_base(args), "name-session", "--name", "Terry YouTubeToTranscript Provider - OBU"], timeout=30)


def collect(args: argparse.Namespace) -> list[dict[str, Any]]:
    setup_obu(args)
    selected = select_videos(args, video_index(args.target_dir))
    transcript_dir = args.target_dir / "evidence" / "media" / "transcripts"
    rows: list[dict[str, Any]] = []
    tab_id: int | None = None
    if selected:
        opened = run([*obu_base(args), "open-tab", "--url", PROVIDER_BASE_URL], timeout=30)
        tab_id = opened["tab"]["id"]
        for _ in range(args.warmup_attempts):
            time.sleep(args.wait_seconds)
            page = cdp_eval(
                args,
                tab_id,
                'JSON.stringify({title: document.title, text: document.body?.innerText?.slice(0, 300) || ""})',
                timeout=30,
            )
            if page.get("title") and page.get("title") != "Just a moment...":
                break
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

        url = provider_url(video["id"])
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
            run([*obu_base(args), "navigate", "--tab-id", str(tab_id), "--url", url], timeout=30)

            page: dict[str, Any] = {}
            for _ in range(args.wait_attempts):
                time.sleep(args.wait_seconds)
                page = cdp_eval(args, tab_id, page_extract_js(), timeout=30)
                if len(page.get("transcriptText") or "") >= args.min_characters:
                    break
            if len(page.get("transcriptText") or "") >= args.min_characters:
                row.update(write_transcript(args, video, page))
                row["status"] = "ok"
            else:
                row["page_title"] = page.get("title")
                row["page_text_sample"] = (page.get("pageText") or "")[:800]
                row["error"] = f"no transcript text found; characters={len(page.get('transcriptText') or '')}"
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
    parser.add_argument("--obu-session-id", default="terry-youtubetotranscript-provider")
    parser.add_argument("--browser", default="chrome")
    parser.add_argument("--profile", default="Default")
    parser.add_argument("--wait-attempts", type=int, default=4)
    parser.add_argument("--wait-seconds", type=float, default=4)
    parser.add_argument("--warmup-attempts", type=int, default=5)
    parser.add_argument("--min-characters", type=int, default=500)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows = collect(args)
    manifest_path = args.target_dir / "evidence" / "media" / "provider-probes" / "youtubetotranscript-manifest.json"
    prior = load_json(manifest_path) if manifest_path.exists() else []
    write_json(manifest_path, [*prior, *rows])
    ok = sum(1 for row in rows if row.get("status") == "ok")
    print(f"{PROVIDER_NAME}: collected {ok}/{len(rows)} transcripts")


if __name__ == "__main__":
    main()

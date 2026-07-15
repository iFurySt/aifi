#!/usr/bin/env python3
"""Collect YouTube publish dates from browser-visible watch-page metadata."""

from __future__ import annotations

import argparse
import json
import subprocess
import time
from pathlib import Path
from typing import Any


DEFAULT_TARGET_DIR = Path("research/targets/terry-chen-youtube")
DEFAULT_OUTPUT = Path("research/targets/terry-chen-youtube/evidence/media/youtube-transcript-video-publish-dates-obu.json")
PROVIDER_NOTE = "Open Browser Use Chrome DOM metadata"


def run(cmd: list[str], *, timeout: int = 30) -> Any:
    proc = subprocess.run(cmd, text=True, capture_output=True, timeout=timeout)
    if proc.returncode != 0:
        raise RuntimeError((proc.stderr or proc.stdout).strip())
    return json.loads(proc.stdout)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def obu_base(args: argparse.Namespace) -> list[str]:
    return ["obu", "--session-id", args.obu_session_id, "--browser", args.browser, "--profile", args.profile]


def cdp_eval(args: argparse.Namespace, tab_id: int, expression: str, *, timeout: int = 45) -> Any:
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


def video_index(target_dir: Path) -> dict[str, dict[str, Any]]:
    return {item["id"]: item for item in load_json(target_dir / "evidence" / "media" / "youtube-video-index.json")}


def selected_videos(args: argparse.Namespace) -> list[dict[str, Any]]:
    index = video_index(args.target_dir)
    if args.video_id:
        ids = args.video_id
    elif args.transcript_ok:
        manifest = load_json(args.target_dir / "evidence" / "media" / "transcripts" / "manifest.json")
        ids = [row["id"] for row in manifest if row.get("status") == "ok"]
    else:
        ids = [item["id"] for item in sorted(index.values(), key=lambda item: item["index"])]

    seen: set[str] = set()
    videos: list[dict[str, Any]] = []
    for video_id in ids:
        if video_id in seen or video_id not in index:
            continue
        seen.add(video_id)
        videos.append(index[video_id])
    if args.start_at:
        videos = [video for video in videos if video["index"] >= args.start_at]
    if args.limit:
        videos = videos[: args.limit]
    return videos


def existing_rows(output: Path) -> dict[str, dict[str, Any]]:
    if not output.exists():
        return {}
    rows = load_json(output)
    if not isinstance(rows, list):
        return {}
    return {row["id"]: row for row in rows if isinstance(row, dict) and row.get("id")}


def setup_obu(args: argparse.Namespace) -> int:
    run([*obu_base(args), "ping"], timeout=30)
    run([*obu_base(args), "name-session", "--name", "Terry YouTube Dates - OBU"], timeout=30)
    opened = run([*obu_base(args), "open-tab", "--url", "about:blank"], timeout=30)
    return int(opened["tab"]["id"])


def read_publish_metadata(args: argparse.Namespace, tab_id: int, video: dict[str, Any]) -> dict[str, Any]:
    run([*obu_base(args), "navigate", "--tab-id", str(tab_id), "--url", video["url"]], timeout=30)
    expression = f"""
    (async () => {{
      for (let i = 0; i < {args.wait_attempts}; i++) {{
        await new Promise(resolve => setTimeout(resolve, {int(args.wait_seconds * 1000)}));
        const player = window.ytInitialPlayerResponse || {{}};
        const microformat = player.microformat?.playerMicroformatRenderer || {{}};
        const details = player.videoDetails || {{}};
        const metaDate = document.querySelector('meta[itemprop="datePublished"]')?.content || null;
        const metaUpload = document.querySelector('meta[itemprop="uploadDate"]')?.content || null;
        const ldDates = [];
        for (const node of document.querySelectorAll('script[type="application/ld+json"]')) {{
          try {{
            const data = JSON.parse(node.textContent || 'null');
            const items = Array.isArray(data) ? data : [data];
            for (const item of items) {{
              if (item && typeof item === 'object') {{
                if (item.uploadDate) ldDates.push(String(item.uploadDate));
                if (item.datePublished) ldDates.push(String(item.datePublished));
              }}
            }}
          }} catch {{}}
        }}
        const datePublished = metaDate || microformat.publishDate || microformat.uploadDate || ldDates[0] || null;
        const uploadDate = metaUpload || microformat.uploadDate || microformat.publishDate || ldDates[0] || null;
        if (datePublished || uploadDate || details.title) {{
          return {{
            ok: Boolean(datePublished || uploadDate),
            page_url: location.href,
            document_title: document.title,
            title: details.title || document.querySelector('meta[itemprop="name"]')?.content || document.title.replace(/ - YouTube$/, ''),
            channel_id: details.channelId || null,
            length_seconds: details.lengthSeconds || null,
            view_count: details.viewCount || null,
            date_published: datePublished,
            upload_date: uploadDate,
            fields: [
              metaDate ? 'meta[itemprop=datePublished]' : null,
              metaUpload ? 'meta[itemprop=uploadDate]' : null,
              microformat.publishDate ? 'ytInitialPlayerResponse.microformat.publishDate' : null,
              microformat.uploadDate ? 'ytInitialPlayerResponse.microformat.uploadDate' : null,
              ldDates.length ? 'script[type=application/ld+json]' : null
            ].filter(Boolean),
            body_sample: document.body.innerText.slice(0, 500)
          }};
        }}
      }}
      return {{
        ok: false,
        page_url: location.href,
        document_title: document.title,
        date_published: null,
        upload_date: null,
        fields: [],
        body_sample: document.body.innerText.slice(0, 1000)
      }};
    }})()
    """
    result = cdp_eval(args, tab_id, expression, timeout=args.timeout)
    if not isinstance(result, dict):
        result = {"ok": False, "error": "invalid cdp result", "raw": result}
    return {
        "id": video["id"],
        "title": video["title"],
        "url": video["url"],
        "channel_index": video["index"],
        "date_published": result.get("date_published"),
        "upload_date": result.get("upload_date"),
        "source": PROVIDER_NOTE,
        "fields": result.get("fields") or [],
        "retrieved": time.strftime("%Y-%m-%d"),
        "status": "ok" if result.get("date_published") or result.get("upload_date") else "missing",
        "page_url": result.get("page_url"),
        "page_title": result.get("title") or result.get("document_title"),
        "channel_id": result.get("channel_id"),
        "length_seconds": result.get("length_seconds"),
        "view_count": result.get("view_count"),
        "error": result.get("error"),
    }


def collect(args: argparse.Namespace) -> list[dict[str, Any]]:
    videos = selected_videos(args)
    rows_by_id = existing_rows(args.output)
    tab_id = setup_obu(args)
    try:
        for video in videos:
            existing = rows_by_id.get(video["id"])
            if existing and existing.get("status") == "ok" and not args.force:
                print(f"{video['index']:03d} {video['id']} ok_existing", flush=True)
                continue
            try:
                row = read_publish_metadata(args, tab_id, video)
            except Exception as exc:  # noqa: BLE001 - metadata probes should continue per video.
                row = {
                    "id": video["id"],
                    "title": video["title"],
                    "url": video["url"],
                    "channel_index": video["index"],
                    "date_published": None,
                    "upload_date": None,
                    "source": PROVIDER_NOTE,
                    "fields": [],
                    "retrieved": time.strftime("%Y-%m-%d"),
                    "status": "error",
                    "error": str(exc)[-1000:],
                }
            rows_by_id[video["id"]] = row
            print(f"{video['index']:03d} {video['id']} {row['status']} {row.get('date_published') or ''}", flush=True)
            time.sleep(args.delay)
    finally:
        if args.finalize_tabs:
            run([*obu_base(args), "finalize-tabs", "--keep", "[]"], timeout=30)
    return sorted(rows_by_id.values(), key=lambda row: row.get("channel_index", 10**9))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target-dir", type=Path, default=DEFAULT_TARGET_DIR)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--transcript-ok", action="store_true", help="Collect dates only for videos with ok transcript coverage.")
    parser.add_argument("--video-id", action="append")
    parser.add_argument("--start-at", type=int)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--obu-session-id", default="terry-youtube-publish-dates")
    parser.add_argument("--browser", default="chrome")
    parser.add_argument("--profile", default="Default")
    parser.add_argument("--timeout", type=int, default=60)
    parser.add_argument("--wait-attempts", type=int, default=12)
    parser.add_argument("--wait-seconds", type=float, default=1.0)
    parser.add_argument("--delay", type=float, default=0.3)
    parser.add_argument("--finalize-tabs", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows = collect(args)
    write_json(args.output, rows)
    ok = sum(1 for row in rows if row.get("status") == "ok")
    print(f"wrote {args.output} with {ok}/{len(rows)} dated videos")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Collect YouTube transcripts from Noteey's browser-rendered subtitle page."""

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
PROVIDER_NAME = "Noteey"
PROVIDER_SLUG = "noteey"
PROVIDER_PAGE = "https://www.noteey.com/youtube-subtitle-downloader"
TIMESTAMP_RE = re.compile(r"^\d{2}:\d{2}(?::\d{2})?$")


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


def video_index(target_dir: Path) -> list[dict[str, Any]]:
    return load_json(target_dir / "evidence" / "media" / "youtube-video-index.json")


def transcript_status(target_dir: Path) -> dict[str, str]:
    manifest_path = target_dir / "evidence" / "media" / "transcripts" / "manifest.json"
    statuses: dict[str, str] = {}
    if manifest_path.exists():
        for item in load_json(manifest_path):
            statuses[item["id"]] = item["status"]
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


def investment_like_video_ids(target_dir: Path) -> list[str]:
    queue_path = target_dir / "evidence" / "media" / "asr" / "queue.json"
    if not queue_path.exists():
        return []
    pattern = re.compile(
        r"投資|股票|美股|比特幣|加密|crypto|bitcoin|Tesla|特斯拉|房地產|資產|財富|FIRE|退休|"
        r"被動收入|收入|市場|泡沫|倉位|大盤|ETF|選股|網格|期權|option|BNB|AI 泡沫|保護",
        re.IGNORECASE,
    )
    return [item["id"] for item in load_json(queue_path) if pattern.search(item["title"])]


def select_videos(args: argparse.Namespace, videos: list[dict[str, Any]]) -> list[dict[str, Any]]:
    statuses = transcript_status(args.target_dir)
    selected = videos if args.include_existing else [video for video in videos if statuses.get(video["id"]) != "ok"]
    if args.priority_list:
        priority_ids = priority_video_ids(args.priority_list)
        order = {video_id: index for index, video_id in enumerate(priority_ids)}
        selected = [video for video in selected if video["id"] in order]
        selected.sort(key=lambda video: order[video["id"]])
    if args.investment_like:
        wanted_ids = investment_like_video_ids(args.target_dir)
        order = {video_id: index for index, video_id in enumerate(wanted_ids)}
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
    run([*obu_base(args), "name-session", "--name", "Terry Noteey Provider - OBU"], timeout=30)
    opened = run([*obu_base(args), "open-tab", "--url", PROVIDER_PAGE], timeout=30)
    tab_id = int(opened["tab"]["id"])
    try:
        wait_for_tool(args, tab_id)
    except Exception:
        run([*obu_base(args), "navigate", "--tab-id", str(tab_id), "--url", PROVIDER_PAGE], timeout=30)
        wait_for_tool(args, tab_id)
    return tab_id


def wait_for_tool(args: argparse.Namespace, tab_id: int) -> None:
    last_result: Any = None
    expression = """
    (() => {
      const input = [...document.querySelectorAll('input')]
        .find(el => /youtube/i.test(el.placeholder || ''));
      return {
        ok: Boolean(input),
        url: location.href,
        ready: document.readyState,
        body: document.body.innerText.slice(0, 1000)
      };
    })()
    """
    for _ in range(args.page_wait_attempts):
        time.sleep(args.page_wait_seconds)
        last_result = cdp_eval(args, tab_id, expression, timeout=args.timeout)
        if isinstance(last_result, dict) and last_result.get("ok"):
            return
    raise RuntimeError(f"Noteey tool input did not load: {last_result}")


def parse_segments(page_text: str) -> list[dict[str, Any]]:
    lines = [line.strip() for line in page_text.splitlines() if line.strip()]
    segments: list[dict[str, Any]] = []
    index = 0
    while index < len(lines):
        line = lines[index]
        if TIMESTAMP_RE.match(line) and index + 1 < len(lines):
            text = lines[index + 1].strip()
            if text and not TIMESTAMP_RE.match(text):
                segments.append({"time": line, "text": text})
            index += 2
            continue
        index += 1
    return segments


def fetch_transcript(args: argparse.Namespace, tab_id: int, video: dict[str, Any]) -> dict[str, Any]:
    run([*obu_base(args), "navigate", "--tab-id", str(tab_id), "--url", PROVIDER_PAGE], timeout=30)
    wait_for_tool(args, tab_id)
    expression = f"""
    (async () => {{
      const videoUrl = {json.dumps(video["url"])};
      const input = [...document.querySelectorAll('input')]
        .find(el => /youtube/i.test(el.placeholder || '')) || document.querySelector('input');
      if (!input) return {{ ok: false, status: 'no_input', body: document.body.innerText.slice(0, 2000) }};
      const boxBefore = document.querySelector('.desktop-transcript-container')?.innerText || '';
      input.value = videoUrl;
      input.dispatchEvent(new Event('input', {{ bubbles: true }}));
      input.dispatchEvent(new Event('change', {{ bubbles: true }}));
      const submitScope = input.parentElement || document;
      const button = [...submitScope.querySelectorAll('button')]
        .find(el => /Get Subtitle/i.test(el.innerText || ''));
      if (!button) return {{ ok: false, status: 'no_button', body: document.body.innerText.slice(0, 2000) }};
      button.click();
      for (let i = 0; i < {args.wait_attempts}; i++) {{
        await new Promise(resolve => setTimeout(resolve, {int(args.wait_seconds * 1000)}));
        if (/\\/account(?:$|[?#])/.test(location.pathname)) {{
          return {{ ok: false, status: 'login_redirect', url: location.href, body: document.body.innerText.slice(0, 2000) }};
        }}
        const box = document.querySelector('.desktop-transcript-container');
        const transcriptText = box?.innerText || '';
        const body = document.body.innerText || '';
        if (transcriptText.length > {args.min_characters} && /\\d\\d:\\d\\d/.test(transcriptText) && transcriptText !== boxBefore) {{
          return {{ ok: true, status: 'ok', url: location.href, transcriptText, body: body.slice(0, 1000) }};
        }}
        if (/No transcript found for the video/i.test(body)) {{
          return {{ ok: false, status: 'no_transcript', url: location.href, body: body.slice(0, 2000) }};
        }}
      }}
      return {{
        ok: false,
        status: 'timeout',
        url: location.href,
        transcriptText: document.querySelector('.desktop-transcript-container')?.innerText || '',
        body: document.body.innerText.slice(0, 2000)
      }};
    }})()
    """
    return cdp_eval(args, tab_id, expression, timeout=args.timeout)


def write_transcript(args: argparse.Namespace, video: dict[str, Any], result: dict[str, Any]) -> dict[str, Any]:
    transcript_text = str(result.get("transcriptText") or "")
    segments = parse_segments(transcript_text)
    text = "\n".join(segment["text"] for segment in segments).strip()
    if len(text) < args.min_characters or len(segments) < args.min_segments:
        raise ValueError(f"provider returned no usable transcript text; parsed {len(segments)} segments / {len(text)} chars")

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
            "retrieved": time.strftime("%Y-%m-%d"),
            "extraction": "Open Browser Use DOM parse from .desktop-transcript-container",
        },
        "video_index": video.get("index"),
        "video": video,
        "transcript": {
            "videoId": video["id"],
            "title": video["title"],
            "text": text,
            "segments": segments,
            "confidence": "online provider subtitle transcript; cross-check against another provider or YouTube panel when possible",
        },
        "raw_provider_payload": {
            "page_url": result.get("url"),
            "dom_transcript_characters": len(transcript_text),
        },
    }
    txt_path.write_text(text + "\n", encoding="utf-8")
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
                "provider_url": PROVIDER_PAGE,
                "status": "error",
                "error": None,
            }
            try:
                result = fetch_transcript(args, tab_id, video)
                row["provider_status"] = result.get("status") if isinstance(result, dict) else None
                row["provider_page_url"] = result.get("url") if isinstance(result, dict) else None
                if isinstance(result, dict) and result.get("ok"):
                    row.update(write_transcript(args, video, result))
                    row["status"] = "ok"
                else:
                    row["status"] = "provider_failed"
                    row["error"] = (result.get("status") if isinstance(result, dict) else "invalid provider result")
            except Exception as exc:  # noqa: BLE001 - provider probes should continue per video.
                row["status"] = "error"
                row["error"] = str(exc)[-1000:]
                if "Inspected target navigated or closed" in str(exc):
                    try:
                        run([*obu_base(args), "navigate", "--tab-id", str(tab_id), "--url", PROVIDER_PAGE], timeout=30)
                        wait_for_tool(args, tab_id)
                    except Exception:
                        pass
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
    parser.add_argument("--investment-like", action="store_true")
    parser.add_argument("--video-id", action="append")
    parser.add_argument("--start-at", type=int)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--include-existing", action="store_true")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--obu-session-id", default="terry-noteey-provider")
    parser.add_argument("--browser", default="chrome")
    parser.add_argument("--profile", default="Default")
    parser.add_argument("--timeout", type=int, default=90)
    parser.add_argument("--delay", type=float, default=1.0)
    parser.add_argument("--wait-attempts", type=int, default=45)
    parser.add_argument("--wait-seconds", type=float, default=1.0)
    parser.add_argument("--page-wait-attempts", type=int, default=20)
    parser.add_argument("--page-wait-seconds", type=float, default=1.0)
    parser.add_argument("--min-characters", type=int, default=500)
    parser.add_argument("--min-segments", type=int, default=10)
    parser.add_argument("--finalize-tabs", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows = collect(args)
    manifest_path = args.target_dir / "evidence" / "media" / "provider-probes" / "noteey-manifest.json"
    prior = load_json(manifest_path) if manifest_path.exists() else []
    write_json(manifest_path, [*prior, *rows])
    ok = sum(1 for row in rows if row.get("status") == "ok")
    print(f"{PROVIDER_NAME}: collected {ok}/{len(rows)} transcripts")


if __name__ == "__main__":
    main()

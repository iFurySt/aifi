#!/usr/bin/env python3
"""Collect Terry YouTube transcripts through AI Video Summarizer with OBU."""

from __future__ import annotations

import argparse
import json
import subprocess
import time
from datetime import date
from pathlib import Path
from typing import Any


DEFAULT_TARGET_DIR = Path("research/targets/terry-chen-youtube")
PROVIDER = "aivideosummarizer.io"
PROVIDER_URL = "https://aivideosummarizer.io/youtube-subtitle-downloader/"
SESSION_ID = "obu-terry-aivideosummarizer"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def run_obu(args: list[str], timeout: int = 30) -> dict[str, Any]:
    proc = subprocess.run(
        ["obu", *args],
        check=False,
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip())
    text = proc.stdout.strip()
    if not text:
        return {}
    decoder = json.JSONDecoder()
    idx = 0
    last: Any = None
    while idx < len(text):
        while idx < len(text) and text[idx].isspace():
            idx += 1
        if idx >= len(text):
            break
        try:
            obj, end = decoder.raw_decode(text, idx)
        except json.JSONDecodeError:
            break
        last = obj
        idx = end
    return last or {}


def cdp(tab_id: int, method: str, params: dict[str, Any], timeout: int = 30) -> dict[str, Any]:
    return run_obu(
        [
            "cdp",
            "--session-id",
            SESSION_ID,
            "--tab-id",
            str(tab_id),
            "--method",
            method,
            "--params",
            json.dumps(params, ensure_ascii=False),
        ],
        timeout=timeout,
    )


def evaluate(tab_id: int, expression: str, *, await_promise: bool = False, timeout: int = 30) -> Any:
    params: dict[str, Any] = {"expression": expression, "returnByValue": True}
    if await_promise:
        params["awaitPromise"] = True
    result = cdp(tab_id, "Runtime.evaluate", params, timeout=timeout)
    inner = result.get("result", {}).get("result", {})
    if "value" in inner:
        return inner["value"]
    return inner


def open_provider_tab() -> int:
    result = run_obu(
        [
            "open-tab",
            "--session-id",
            SESSION_ID,
            "--url",
            PROVIDER_URL,
        ],
        timeout=30,
    )
    tab_id = result.get("result", result).get("tab", {}).get("id")
    if not isinstance(tab_id, int):
        raise RuntimeError(f"Could not open provider tab: {result}")
    return tab_id


def submit_video(tab_id: int, video_id: str) -> None:
    url = f"https://youtu.be/{video_id}"
    evaluate(
        tab_id,
        """
        (() => {
          const input = [...document.querySelectorAll("input")]
            .find(i => (i.placeholder || "").includes("YouTube"));
          if (!input) return {ok:false, reason:"input_not_found"};
          input.focus();
          input.select();
          return {ok:true, value:input.value};
        })()
        """,
    )
    cdp(tab_id, "Input.insertText", {"text": url})
    result = evaluate(
        tab_id,
        """
        (() => {
          const input = [...document.querySelectorAll("input")]
            .find(i => (i.placeholder || "").includes("YouTube"));
          const btn = [...document.querySelectorAll("button")]
            .find(b => /Try Generate Subtitle/i.test(b.innerText || ""));
          if (!input || !btn) return {ok:false, reason:"input_or_button_not_found"};
          btn.click();
          return {ok:true, value:input.value, button:btn.innerText};
        })()
        """,
    )
    if not result.get("ok"):
        raise RuntimeError(f"Could not submit video {video_id}: {result}")


def indexeddb_record(tab_id: int, video_id: str) -> dict[str, Any] | None:
    key = f"/youtube-subtitle-downloader/:1:1:{video_id}"
    expression = f"""
    new Promise((resolve) => {{
      const req = indexedDB.open("aivideosummarizer");
      req.onerror = () => resolve(null);
      req.onsuccess = () => {{
        const db = req.result;
        if (![...db.objectStoreNames].includes("tr-history")) {{
          resolve(null);
          return;
        }}
        const tx = db.transaction("tr-history", "readonly");
        const store = tx.objectStore("tr-history");
        const get = store.get({json.dumps(key)});
        get.onsuccess = () => resolve(get.result || null);
        get.onerror = () => resolve(null);
      }};
    }})
    """
    record = evaluate(tab_id, expression, await_promise=True, timeout=30)
    if isinstance(record, dict):
        return record
    return None


def page_status(tab_id: int) -> dict[str, Any]:
    return evaluate(
        tab_id,
        """
        ({
          title: document.title,
          url: location.href,
          text: document.body ? document.body.innerText.slice(0, 2000) : ""
        })
        """,
    )


def wait_for_record(tab_id: int, video_id: str, timeout_seconds: int) -> tuple[str, dict[str, Any] | None, str]:
    deadline = time.time() + timeout_seconds
    last_text = ""
    while time.time() < deadline:
        record = indexeddb_record(tab_id, video_id)
        subtitles = record.get("subtitles") if record else None
        if isinstance(subtitles, list) and len(subtitles) >= 20:
            return "ok", record, ""
        status = page_status(tab_id)
        last_text = str(status.get("text", ""))
        lower = last_text.lower()
        if "invalid youtube url" in lower:
            return "provider_failed", None, "invalid_youtube_url"
        if "generation failed" in lower or "failed" in lower and "ai generation" not in lower:
            return "provider_failed", None, last_text[:500]
        time.sleep(8)
    return "error", None, last_text[:500] or "timeout_waiting_for_indexeddb_record"


def video_rows(target_dir: Path, args: argparse.Namespace) -> list[dict[str, Any]]:
    media_dir = target_dir / "evidence" / "media"
    index = load_json(media_dir / "youtube-video-index.json")
    by_id = {row["id"]: row for row in index}
    if args.video_id:
        return [by_id[video_id] for video_id in args.video_id if video_id in by_id]
    queue_path = media_dir / "asr" / "selected-queue.json"
    queue = load_json(queue_path)
    return [by_id[row["id"]] for row in queue if row["id"] in by_id]


def write_transcript(target_dir: Path, video: dict[str, Any], record: dict[str, Any]) -> tuple[Path, Path]:
    transcripts_dir = target_dir / "evidence" / "media" / "transcripts"
    txt_path = transcripts_dir / f"{video['id']}.provider-aivideosummarizer.txt"
    json_path = transcripts_dir / f"{video['id']}.provider-aivideosummarizer.json"
    subtitles = record.get("subtitles") or []
    text = "\n".join(str(row.get("text", "")).strip() for row in subtitles if str(row.get("text", "")).strip())
    txt_path.write_text(text + "\n", encoding="utf-8")
    payload = {
        "source": "Online transcript provider: AI Video Summarizer",
        "source_url": video["url"],
        "provider": {
            "name": PROVIDER,
            "endpoint": PROVIDER_URL,
            "retrieved": date.today().isoformat(),
            "route": "OBU browser page -> IndexedDB tr-history",
        },
        "video_index": video["index"],
        "video": video,
        "transcript": {
            "videoId": video["id"],
            "title": video["title"],
            "text": text,
            "segments": [
                {"time": row.get("time"), "text": row.get("text")}
                for row in subtitles
                if row.get("text")
            ],
        },
        "raw_provider_payload": record,
    }
    write_json(json_path, payload)
    return txt_path, json_path


def upsert_manifest(target_dir: Path, rows: list[dict[str, Any]]) -> None:
    manifest_path = target_dir / "evidence" / "media" / "provider-probes" / "aivideosummarizer-manifest.json"
    existing = load_json(manifest_path) if manifest_path.exists() else []
    merged = {row.get("video_id"): row for row in existing if row.get("video_id")}
    for row in rows:
        merged[row["video_id"]] = row
    ordered = sorted(merged.values(), key=lambda row: (row.get("video_index", 999999), row.get("video_id", "")))
    write_json(manifest_path, ordered)


def manifest_row(
    video: dict[str, Any],
    status: str,
    *,
    record: dict[str, Any] | None = None,
    txt_path: Path | None = None,
    json_path: Path | None = None,
    detail_url: str | None = None,
    note: str = "",
) -> dict[str, Any]:
    row: dict[str, Any] = {
        "video_id": video["id"],
        "video_index": video["index"],
        "title": video["title"],
        "url": video["url"],
        "provider": PROVIDER,
        "status": status,
        "retrieved": date.today().isoformat(),
    }
    if record is not None:
        row["segments"] = len(record.get("subtitles") or [])
    if txt_path is not None:
        row["text_file"] = f"../transcripts/{txt_path.name}"
    if json_path is not None:
        row["json_file"] = f"../transcripts/{json_path.name}"
    if detail_url:
        row["detail_url"] = detail_url
    row["notes"] = note
    return row


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target-dir", type=Path, default=DEFAULT_TARGET_DIR)
    parser.add_argument("--video-id", action="append", help="Specific video id to collect; defaults to selected queue.")
    parser.add_argument("--timeout-seconds", type=int, default=150)
    parser.add_argument("--keep-tabs", action="store_true")
    args = parser.parse_args()

    target_dir = args.target_dir
    rows = video_rows(target_dir, args)
    run_obu(["name-session", "--session-id", SESSION_ID, "--name", "Terry AI Video Summarizer - OBU"])
    manifest_rows: list[dict[str, Any]] = []
    try:
        for video in rows:
            video_id = video["id"]
            tab_id = open_provider_tab()
            time.sleep(7)
            status = "error"
            record: dict[str, Any] | None = None
            note = ""
            try:
                submit_video(tab_id, video_id)
                status, record, note = wait_for_record(tab_id, video_id, args.timeout_seconds)
                if status == "ok" and record:
                    txt_path, json_path = write_transcript(target_dir, video, record)
                    manifest_rows.append(
                        manifest_row(
                            video,
                            "ok",
                            record=record,
                            txt_path=txt_path,
                            json_path=json_path,
                            detail_url=page_status(tab_id).get("url"),
                            note="OBU browser extraction from AI Video Summarizer IndexedDB tr-history after link submission.",
                        )
                    )
                    upsert_manifest(target_dir, [manifest_rows[-1]])
                    print(f"ok {video_id} segments={len(record.get('subtitles') or [])}")
                else:
                    manifest_rows.append(
                        manifest_row(video, status, note=note)
                    )
                    upsert_manifest(target_dir, [manifest_rows[-1]])
                    print(f"{status} {video_id} {note[:120]}")
            except Exception as exc:  # Keep batch progress resumable.
                manifest_rows.append(
                    manifest_row(video, "error", note=str(exc)[:500])
                )
                upsert_manifest(target_dir, [manifest_rows[-1]])
                print(f"error {video_id} {exc}")
        upsert_manifest(target_dir, manifest_rows)
    finally:
        if not args.keep_tabs:
            try:
                run_obu(["finalize-tabs", "--session-id", SESSION_ID, "--keep", "[]"], timeout=30)
            except Exception as exc:
                print(f"warning: could not finalize OBU tabs: {exc}")


if __name__ == "__main__":
    main()

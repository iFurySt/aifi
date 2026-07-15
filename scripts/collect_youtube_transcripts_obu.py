#!/usr/bin/env python3
"""Collect a YouTube channel video index and visible transcript text via OBU."""

from __future__ import annotations

import argparse
import csv
import json
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Any


DEFAULT_CHANNEL_URL = "https://www.youtube.com/@hackbearterry/videos"
DEFAULT_TARGET_DIR = Path("research/targets/terry-chen-youtube")
DEFAULT_SESSION_ID = "obu-terry-research-20260713"
MIN_PROVIDER_TRANSCRIPT_CHARS = 500


def run(cmd: list[str], *, timeout: int = 60) -> str:
    proc = subprocess.run(cmd, text=True, capture_output=True, timeout=timeout)
    if proc.returncode != 0:
        raise RuntimeError(
            f"command failed ({proc.returncode}): {' '.join(cmd)}\n"
            f"stdout:\n{proc.stdout}\nstderr:\n{proc.stderr}"
        )
    return proc.stdout


def run_obu(args: argparse.Namespace, subcommand: list[str], *, timeout: int = 60) -> Any:
    cmd = ["obu", *subcommand, "--session-id", args.session_id]
    if args.browser:
        cmd.extend(["--browser", args.browser])
    if args.profile:
        cmd.extend(["--profile", args.profile])
    output = run(cmd, timeout=timeout)
    payload = json.loads(output)
    if "error" in payload:
        raise RuntimeError(json.dumps(payload["error"], ensure_ascii=False))
    return payload.get("result", payload)


def cdp_eval(args: argparse.Namespace, tab_id: int, expression: str, *, timeout: int = 60) -> Any:
    params = {
        "expression": expression,
        "awaitPromise": True,
        "returnByValue": True,
    }
    result = run_obu(
        args,
        [
            "cdp",
            "--tab-id",
            str(tab_id),
            "--method",
            "Runtime.evaluate",
            "--params",
            json.dumps(params),
        ],
        timeout=timeout,
    )
    if "exceptionDetails" in result:
        raise RuntimeError(json.dumps(result["exceptionDetails"], ensure_ascii=False))
    return result.get("result", {}).get("value")


def collect_video_index(args: argparse.Namespace, media_dir: Path) -> list[dict[str, Any]]:
    raw = run(
        [
            "yt-dlp",
            "--flat-playlist",
            "--dump-single-json",
            args.channel_url,
        ],
        timeout=180,
    )
    playlist = json.loads(raw)
    entries = playlist.get("entries") or []
    videos: list[dict[str, Any]] = []
    for idx, entry in enumerate(entries, start=1):
        video_id = entry.get("id")
        videos.append(
            {
                "index": idx,
                "id": video_id,
                "title": entry.get("title"),
                "url": entry.get("url") or f"https://www.youtube.com/watch?v={video_id}",
                "duration_seconds": entry.get("duration"),
                "channel": playlist.get("channel") or playlist.get("uploader"),
                "channel_id": playlist.get("channel_id") or playlist.get("id"),
                "source_playlist_url": args.channel_url,
            }
        )

    (media_dir / "youtube-video-index.raw.json").write_text(
        json.dumps(playlist, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (media_dir / "youtube-video-index.json").write_text(
        json.dumps(videos, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    with (media_dir / "youtube-video-index.csv").open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=[
                "index",
                "id",
                "title",
                "url",
                "duration_seconds",
                "channel",
                "channel_id",
                "source_playlist_url",
            ],
        )
        writer.writeheader()
        writer.writerows(videos)
    return videos


TRANSCRIPT_JS = r"""
(async () => {
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const normalizeText = (text) => (text || "")
    .replace(/\u00a0/g, " ")
    .replace(/^\d+\s+seconds?\s+/i, "")
    .replace(/^\d+\s+minutes?,\s+\d+\s+seconds?\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const formatTime = (milliseconds) => {
    const totalSeconds = Math.max(0, Math.floor((Number(milliseconds) || 0) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  const clickShowTranscript = () => {
    const buttons = [...document.querySelectorAll("button")];
    const button = buttons.find(el => {
      const label = (el.getAttribute("aria-label") || el.innerText || "").trim();
      return label === "Show transcript" || label === "顯示轉錄稿" || label === "显示转录文本";
    });
    if (button) {
      button.click();
      return true;
    }
    return false;
  };

  const started = Date.now();
  while (!document.querySelector("transcript-segment-view-model") && Date.now() - started < 8000) {
    clickShowTranscript();
    await sleep(250);
  }

  const seen = new Map();
  const collectVisible = () => {
    const nodes = [...document.querySelectorAll("transcript-segment-view-model")];
    for (const node of nodes) {
      const lines = (node.innerText || "").trim().split(/\n+/).map(line => line.trim()).filter(Boolean);
      const time = lines[0] || "";
      const text = normalizeText(lines.slice(1).join(" "));
      if (time && text) {
        seen.set(`${time} ${text}`, {time, text});
      }
    }
  };

  const panel = document.querySelector("ytd-engagement-panel-section-list-renderer[target-id='engagement-panel-searchable-transcript']")
    || document.querySelector("ytd-engagement-panel-section-list-renderer");
  const scroller = panel?.querySelector("#content")
    || panel?.querySelector("yt-section-list-renderer")
    || panel
    || document.scrollingElement;

  for (let i = 0; i < 80; i++) {
    const before = seen.size;
    collectVisible();
    if (!scroller) break;
    const oldTop = scroller.scrollTop || 0;
    scroller.scrollTop = (scroller.scrollHeight || 0);
    scroller.dispatchEvent(new Event("scroll", {bubbles: true}));
    await sleep(150);
    collectVisible();
    const atBottom = Math.abs((scroller.scrollTop || 0) - oldTop) < 2;
    if (seen.size === before && atBottom) break;
  }

  const player = window.ytInitialPlayerResponse || window.ytplayer?.config?.args?.raw_player_response || {};
  const microformat = player.microformat?.playerMicroformatRenderer || window.ytInitialData?.microformat?.playerMicroformatRenderer || {};
  const details = player.videoDetails || {};
  let segments = [...seen.values()];
  let transcriptSource = segments.length ? "visible_transcript_panel" : null;
  let captionTrack = null;

  const captionTracks = player.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  const preferredTrack = () => {
    const score = (track) => {
      const lang = `${track.languageCode || ""} ${track.name?.simpleText || ""} ${track.name?.runs?.map(run => run.text).join(" ") || ""}`.toLowerCase();
      if (lang.includes("zh-hant") || lang.includes("繁")) return 100;
      if (lang.includes("zh-tw")) return 95;
      if (lang.includes("zh-hans") || lang.includes("简")) return 90;
      if (lang.match(/\bzh\b/) || lang.includes("中文")) return 85;
      if (lang.match(/\ben\b/) || lang.includes("english")) return 70;
      return 0;
    };
    return [...captionTracks].sort((a, b) => score(b) - score(a))[0] || null;
  };

  const fetchCaptionSegments = async (track) => {
    if (!track?.baseUrl) return [];
    const url = new URL(track.baseUrl);
    url.searchParams.set("fmt", "json3");
    const response = await fetch(url.toString(), {credentials: "include"});
    if (!response.ok) throw new Error(`caption fetch failed ${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    const body = await response.text();
    if (contentType.includes("json") || body.trim().startsWith("{")) {
      const data = JSON.parse(body);
      return (data.events || []).flatMap(event => {
        const text = normalizeText((event.segs || []).map(seg => seg.utf8 || "").join(""));
        if (!text) return [];
        return [{
          time: formatTime(event.tStartMs),
          startMs: event.tStartMs,
          durationMs: event.dDurationMs,
          text,
        }];
      });
    }

    const xml = new DOMParser().parseFromString(body, "text/xml");
    return [...xml.querySelectorAll("text")].flatMap(node => {
      const text = normalizeText(node.textContent || "");
      if (!text) return [];
      const startMs = Math.round(Number(node.getAttribute("start") || 0) * 1000);
      const durationMs = Math.round(Number(node.getAttribute("dur") || 0) * 1000);
      return [{time: formatTime(startMs), startMs, durationMs, text}];
    });
  };

  if (!segments.length && captionTracks.length) {
    captionTrack = preferredTrack();
    try {
      segments = await fetchCaptionSegments(captionTrack);
      if (segments.length) transcriptSource = "caption_track";
    } catch (error) {
      return {
        ok: false,
        url: location.href,
        title: details.title || document.title.replace(/ - YouTube$/, ""),
        videoId: details.videoId || new URLSearchParams(location.search).get("v"),
        author: details.author,
        channelId: details.channelId,
        lengthSeconds: details.lengthSeconds,
        viewCount: details.viewCount,
        publishDate: microformat.publishDate || microformat.uploadDate || null,
        description: details.shortDescription || null,
        captionTracks: captionTracks.map(track => ({
          languageCode: track.languageCode,
          kind: track.kind,
          name: track.name?.simpleText || track.name?.runs?.map(run => run.text).join(" ") || null,
        })),
        segments: [],
        text: "",
        reason: String(error),
      };
    }
  }

  return {
    ok: segments.length > 0,
    url: location.href,
    title: details.title || document.title.replace(/ - YouTube$/, ""),
    videoId: details.videoId || new URLSearchParams(location.search).get("v"),
    author: details.author,
    channelId: details.channelId,
    lengthSeconds: details.lengthSeconds,
    viewCount: details.viewCount,
    publishDate: microformat.publishDate || microformat.uploadDate || null,
    description: details.shortDescription || null,
    transcriptSource,
    captionTrack: captionTrack ? {
      languageCode: captionTrack.languageCode,
      kind: captionTrack.kind,
      name: captionTrack.name?.simpleText || captionTrack.name?.runs?.map(run => run.text).join(" ") || null,
    } : null,
    segments,
    text: segments.map(segment => segment.text).join("\n"),
    reason: segments.length ? null : (captionTracks.length ? "caption tracks present but no transcript segments fetched" : "no transcript segments rendered and no caption tracks found"),
  };
})()
"""


def write_transcript(transcript_dir: Path, item: dict[str, Any], data: dict[str, Any]) -> None:
    video_id = item["id"]
    payload = {
        "source": f"YouTube {data.get('transcriptSource') or 'transcript'} via Open Browser Use",
        "source_url": item["url"],
        "retrieved": time.strftime("%Y-%m-%d"),
        "video_index": item.get("index"),
        "video": item,
        "transcript": data,
    }
    (transcript_dir / f"{video_id}.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (transcript_dir / f"{video_id}.txt").write_text(data.get("text", ""), encoding="utf-8")


def rebuild_manifest(args: argparse.Namespace, videos: list[dict[str, Any]], transcript_dir: Path) -> list[dict[str, Any]]:
    manifest_path = transcript_dir / "manifest.json"
    prior_by_id: dict[str, dict[str, Any]] = {}
    if manifest_path.exists():
        try:
            for row in json.loads(manifest_path.read_text(encoding="utf-8")):
                if "id" in row:
                    prior_by_id[row["id"]] = row
        except json.JSONDecodeError:
            prior_by_id = {}

    video_by_id = {video["id"]: video for video in videos}
    for json_path in transcript_dir.glob("*.json"):
        if json_path.name == "manifest.json":
            continue
        try:
            payload = json.loads(json_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        video = payload.get("video") or video_by_id.get(json_path.stem) or {}
        transcript = payload.get("transcript") or {}
        video_id = video.get("id") or transcript.get("videoId") or json_path.stem
        source = (
            "asr"
            if json_path.name.endswith(".asr.json")
            else "online_transcript_provider"
            if ".provider-" in json_path.name
            else "youtube_transcript_panel"
        )
        txt_path = json_path.with_suffix(".txt")
        text_chars = 0
        if txt_path.exists():
            text_chars = len(txt_path.read_text(encoding="utf-8").strip())
        status = "ok"
        notes = ""
        if source == "online_transcript_provider" and text_chars < MIN_PROVIDER_TRANSCRIPT_CHARS:
            status = "partial"
            notes = (
                "Provider text is shorter than the minimum useful transcript "
                f"threshold ({text_chars}/{MIN_PROVIDER_TRANSCRIPT_CHARS} chars)."
            )
        row = {
            "id": video_id,
            "index": video.get("index") or video_by_id.get(video_id, {}).get("index"),
            "status": status,
            "source": source,
            "segments": len(transcript.get("segments") or []),
            "text_chars": text_chars,
            "publishDate": transcript.get("publishDate"),
        }
        if notes:
            row["notes"] = notes
        prior_by_id[video_id] = row

    ordered = sorted(prior_by_id.values(), key=lambda row: (row.get("index") or 999999, row.get("id") or ""))
    manifest_path.write_text(json.dumps(ordered, ensure_ascii=False, indent=2), encoding="utf-8")
    return ordered


def collect_transcripts(args: argparse.Namespace, videos: list[dict[str, Any]], transcript_dir: Path) -> list[dict[str, Any]]:
    run_obu(args, ["ping"], timeout=30)
    run_obu(args, ["name-session", "--name", "Terry Research - OBU"], timeout=30)

    selected = videos
    if args.start_at:
        selected = [item for item in selected if item["index"] >= args.start_at]
    if args.video_id:
        wanted = set(args.video_id)
        selected = [item for item in selected if item["id"] in wanted]
    if args.limit:
        selected = selected[: args.limit]

    tab_id: int | None = None
    manifest_path = transcript_dir / "manifest.json"
    manifest_by_id: dict[str, dict[str, Any]] = {}
    if manifest_path.exists():
        try:
            for prior in json.loads(manifest_path.read_text(encoding="utf-8")):
                if "id" in prior:
                    manifest_by_id[prior["id"]] = prior
        except json.JSONDecodeError:
            manifest_by_id = {}

    def record(item: dict[str, Any]) -> None:
        manifest_by_id[item["id"]] = item
        ordered = sorted(manifest_by_id.values(), key=lambda row: (row.get("index") or 999999, row.get("id") or ""))
        manifest_path.write_text(json.dumps(ordered, ensure_ascii=False, indent=2), encoding="utf-8")

    for item in selected:
        video_id = item["id"]
        json_path = transcript_dir / f"{video_id}.json"
        if json_path.exists() and not args.force:
            try:
                payload = json.loads(json_path.read_text(encoding="utf-8"))
                transcript = payload.get("transcript") or {}
                record(
                    {
                        "id": video_id,
                        "index": item["index"],
                        "status": "ok",
                        "source": "youtube_transcript_panel",
                        "segments": len(transcript.get("segments") or []),
                        "publishDate": transcript.get("publishDate"),
                    }
                )
            except json.JSONDecodeError:
                record({"id": video_id, "index": item["index"], "status": "ok", "source": "youtube_transcript_panel"})
            print(f"{item['index']:03d} {video_id} ok_existing", flush=True)
            continue

        try:
            if tab_id is None:
                opened = run_obu(args, ["open-tab", "--url", item["url"]], timeout=30)
                tab_id = opened["tab"]["id"]
            else:
                run_obu(args, ["navigate", "--tab-id", str(tab_id), "--url", item["url"]], timeout=30)

            for _ in range(30):
                ready = cdp_eval(
                    args,
                    tab_id,
                    (
                        "(() => ({ready: document.readyState, href: location.href, "
                        "videoId: window.ytInitialPlayerResponse?.videoDetails?.videoId || null}))()"
                    ),
                    timeout=15,
                )
                if (
                    isinstance(ready, dict)
                    and ready.get("ready") == "complete"
                    and (ready.get("videoId") == video_id or video_id in (ready.get("href") or ""))
                ):
                    break
                time.sleep(0.5)

            data = cdp_eval(args, tab_id, TRANSCRIPT_JS, timeout=30)
            if data and data.get("ok"):
                write_transcript(transcript_dir, item, data)
                record(
                    {
                        "id": video_id,
                        "index": item["index"],
                        "status": "ok",
                        "source": "youtube_transcript_panel",
                        "segments": len(data.get("segments") or []),
                        "publishDate": data.get("publishDate"),
                    }
                )
            else:
                record(
                    {
                        "id": video_id,
                        "index": item["index"],
                        "status": "missing",
                        "reason": (data or {}).get("reason") if isinstance(data, dict) else "no data",
                    }
                )
        except Exception as exc:  # keep batch collection resumable
            record({"id": video_id, "index": item["index"], "status": "error", "error": str(exc)})
            print(f"[warn] {video_id}: {exc}", file=sys.stderr)

        print(f"{item['index']:03d} {video_id} {manifest_by_id[video_id]['status']}", flush=True)

    if not args.keep_tab and tab_id is not None:
        try:
            run_obu(args, ["finalize-tabs", "--keep", "[]"], timeout=30)
        except Exception as exc:
            print(f"[warn] finalize-tabs failed: {exc}", file=sys.stderr)

    return sorted(manifest_by_id.values(), key=lambda row: (row.get("index") or 999999, row.get("id") or ""))


def write_target_docs(target_dir: Path, media_dir: Path, transcript_dir: Path, videos: list[dict[str, Any]]) -> None:
    target_dir.mkdir(parents=True, exist_ok=True)
    profile = target_dir / "profile.md"
    index = target_dir / "index.md"
    if not profile.exists():
        profile.write_text(
            "\n".join(
                [
                    "# Terry Chen YouTube Research Profile",
                    "",
                    "## Identity",
                    "",
                    "- Target: Terry Chen 泰瑞 YouTube channel",
                    "- Channel handle: `@hackbearterry`",
                    "- Channel URL: https://www.youtube.com/@hackbearterry",
                    "- Research use: longitudinal investment, wealth-building, and portfolio education analysis from public video transcripts.",
                    "",
                    "## Source Scope",
                    "",
                    "- Public YouTube videos only.",
                    "- Transcript text is treated as raw evidence, not final analysis.",
                    "- Retrieval preserves source URLs and dates for future verification.",
                    "",
                ]
            ),
            encoding="utf-8",
        )

    if not index.exists():
        transcript_count = len(
            [
                path
                for path in transcript_dir.glob("*.json")
                if path.name != "manifest.json" and not path.name.endswith(".asr.json")
            ]
        ) if transcript_dir.exists() else 0
        index.write_text(
            "\n".join(
                [
                    "# Terry Chen YouTube Research Index",
                    "",
                    "## Latest Artifacts",
                    "",
                    "| Date | Artifact | Notes |",
                    "| --- | --- | --- |",
                    f"| 2026-07-13 | [YouTube video index](evidence/media/youtube-video-index.json) | {len(videos)} public videos from `@hackbearterry/videos`. |",
                    f"| 2026-07-13 | [Transcript manifest](evidence/media/transcripts/manifest.json) | {transcript_count} transcript JSON files currently stored. |",
                    "",
                    "## Evidence Coverage",
                    "",
                    "| Area | Latest file | Coverage | Gaps |",
                    "| --- | --- | --- | --- |",
                    "| Media source inventory | [youtube-video-index.json](evidence/media/youtube-video-index.json) | Full channel video-link inventory collected with `yt-dlp --flat-playlist`. | Publish dates require per-video metadata or transcript panel extraction. |",
                    "| Transcript raw text | [transcripts/](evidence/media/transcripts/) | OBU-driven YouTube transcript panel extraction, resumable by video id. | Videos without visible transcript panels require fallback ASR or alternate source. |",
                    "",
                    "## Reusable Facts",
                    "",
                    "- The channel inventory currently contains 291 videos from Terry Chen 泰瑞 (`UC_whOg3XES3Fihic53fvo4Q`).",
                    "- Raw transcript text should be analyzed separately for portfolio disclosures, wealth timeline, and generalizable learning patterns.",
                    "",
                    "## Open Questions",
                    "",
                    "- Which videos contain explicit portfolio holdings, allocation percentages, option strategies, real estate, crypto, or cash-flow disclosures?",
                    "- How did the disclosed portfolio and income mix change over time?",
                    "- Which disclosed practices are robust enough to translate into a general-person investment and learning plan?",
                    "",
                ]
            ),
            encoding="utf-8",
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--channel-url", default=DEFAULT_CHANNEL_URL)
    parser.add_argument("--target-dir", type=Path, default=DEFAULT_TARGET_DIR)
    parser.add_argument("--session-id", default=DEFAULT_SESSION_ID)
    parser.add_argument("--browser", default=None)
    parser.add_argument("--profile", default=None)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--start-at", type=int, default=None)
    parser.add_argument("--video-id", action="append")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--skip-index", action="store_true")
    parser.add_argument("--skip-transcripts", action="store_true")
    parser.add_argument("--rebuild-manifest", action="store_true")
    parser.add_argument("--keep-tab", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    media_dir = args.target_dir / "evidence" / "media"
    transcript_dir = media_dir / "transcripts"
    transcript_dir.mkdir(parents=True, exist_ok=True)

    if args.skip_index and (media_dir / "youtube-video-index.json").exists():
        videos = json.loads((media_dir / "youtube-video-index.json").read_text(encoding="utf-8"))
    else:
        videos = collect_video_index(args, media_dir)

    write_target_docs(args.target_dir, media_dir, transcript_dir, videos)

    if args.rebuild_manifest:
        manifest = rebuild_manifest(args, videos, transcript_dir)
        print(f"rebuilt transcript manifest with {len(manifest)} rows")
        return

    if not args.skip_transcripts:
        collect_transcripts(args, videos, transcript_dir)


if __name__ == "__main__":
    main()

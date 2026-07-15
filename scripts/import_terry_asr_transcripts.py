#!/usr/bin/env python3
"""Import externally generated ASR transcripts into the Terry archive."""

from __future__ import annotations

import argparse
import json
import re
import time
from pathlib import Path
from typing import Any


DEFAULT_TARGET_DIR = Path("research/targets/terry-chen-youtube")
VIDEO_ID_RE = re.compile(r"(?P<id>[A-Za-z0-9_-]{11})")


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def video_index(target_dir: Path) -> dict[str, dict[str, Any]]:
    videos = load_json(target_dir / "evidence" / "media" / "youtube-video-index.json")
    return {video["id"]: video for video in videos}


def candidate_files(input_dir: Path) -> list[Path]:
    suffixes = {".txt", ".md", ".srt", ".vtt", ".json"}
    return sorted(path for path in input_dir.rglob("*") if path.is_file() and path.suffix.lower() in suffixes)


def id_from_path(path: Path, videos: dict[str, dict[str, Any]]) -> str | None:
    match = VIDEO_ID_RE.search(path.name)
    if match and match.group("id") in videos:
        return match.group("id")
    return None


def clean_caption_text(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text)
    return text.replace("&nbsp;", " ").strip()


def parse_subtitle_timecode(line: str) -> tuple[str | None, str | None]:
    left, _, right = line.partition("-->")
    if not right:
        return None, None
    return left.strip(), right.strip().split()[0]


def parse_subtitle(path: Path) -> dict[str, Any]:
    raw = path.read_text(encoding="utf-8-sig")
    blocks = re.split(r"\n\s*\n", raw.replace("\r\n", "\n").replace("\r", "\n"))
    segments: list[dict[str, Any]] = []
    loose_lines: list[str] = []
    for block in blocks:
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if not lines:
            continue
        upper_first = lines[0].upper()
        if upper_first.startswith(("WEBVTT", "STYLE", "REGION", "NOTE")):
            continue
        time_index = next((index for index, line in enumerate(lines) if "-->" in line), None)
        if time_index is None:
            loose_lines.extend(clean_caption_text(line) for line in lines)
            continue
        start, end = parse_subtitle_timecode(lines[time_index])
        text_lines = [clean_caption_text(line) for line in lines[time_index + 1 :]]
        text = "\n".join(line for line in text_lines if line)
        if text:
            segments.append({"start": start, "end": end, "text": text})
    text_parts = [segment["text"] for segment in segments]
    text_parts.extend(line for line in loose_lines if line)
    return {"text": "\n".join(text_parts).strip(), "segments": segments, "format": path.suffix.lower().lstrip(".")}


def segment_text(segment: Any) -> str:
    if isinstance(segment, dict):
        value = segment.get("text") or segment.get("transcript") or segment.get("sentence")
        return str(value).strip() if value is not None else ""
    return str(segment).strip()


def normalize_json_segment(segment: Any) -> dict[str, Any] | None:
    text = segment_text(segment)
    if not text:
        return None
    normalized: dict[str, Any] = {"text": text}
    if isinstance(segment, dict):
        for key in ("start", "end"):
            if key in segment:
                normalized[key] = segment[key]
    return normalized


def parse_json_transcript(path: Path) -> dict[str, Any]:
    payload = load_json(path)
    segments_source: Any = []
    text = ""
    if isinstance(payload, dict):
        if isinstance(payload.get("segments"), list):
            segments_source = payload["segments"]
        elif isinstance(payload.get("transcript"), dict):
            transcript = payload["transcript"]
            text = str(transcript.get("text", "")).strip()
            if isinstance(transcript.get("segments"), list):
                segments_source = transcript["segments"]
        elif isinstance(payload.get("results"), list):
            segments_source = payload["results"]
        if not text and isinstance(payload.get("text"), str):
            text = payload["text"].strip()
    elif isinstance(payload, list):
        segments_source = payload

    segments = [segment for item in segments_source if (segment := normalize_json_segment(item))]
    if not text:
        text = "\n".join(segment["text"] for segment in segments)
    return {"text": text.strip(), "segments": segments, "format": "json"}


def parse_transcript_file(path: Path) -> dict[str, Any]:
    suffix = path.suffix.lower()
    if suffix in {".txt", ".md"}:
        text = path.read_text(encoding="utf-8").strip()
        return {"text": text, "segments": [], "format": suffix.lstrip(".")}
    if suffix in {".srt", ".vtt"}:
        return parse_subtitle(path)
    if suffix == ".json":
        return parse_json_transcript(path)
    raise ValueError(f"unsupported transcript format: {path.suffix}")


def import_one(args: argparse.Namespace, path: Path, video: dict[str, Any]) -> dict[str, Any]:
    try:
        parsed = parse_transcript_file(path)
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
        return {
            "input_file": str(path),
            "id": video["id"],
            "index": video["index"],
            "title": video["title"],
            "status": "skipped_parse_error",
            "error": str(exc),
        }
    text = parsed["text"]
    result = {
        "input_file": str(path),
        "input_format": parsed["format"],
        "id": video["id"],
        "index": video["index"],
        "title": video["title"],
        "status": "skipped_empty",
        "characters": len(text),
        "segments": len(parsed["segments"]),
    }
    if not text:
        return result

    transcript_dir = args.target_dir / "evidence" / "media" / "transcripts"
    txt_path = transcript_dir / f"{video['id']}.asr.txt"
    json_path = transcript_dir / f"{video['id']}.asr.json"
    if (txt_path.exists() or json_path.exists()) and not args.force:
        result["status"] = "skipped_existing"
        return result

    payload = {
        "source": args.source_label,
        "source_url": video["url"],
        "retrieved": time.strftime("%Y-%m-%d"),
        "video_index": video.get("index"),
        "video": video,
        "asr": {
            "engine": args.engine,
            "input_file": str(path),
            "input_format": parsed["format"],
            "imported_by": "scripts/import_terry_asr_transcripts.py",
        },
        "transcript": {
            "videoId": video["id"],
            "title": video["title"],
            "text": text,
            "segments": parsed["segments"],
            "confidence": args.confidence,
        },
    }
    transcript_dir.mkdir(parents=True, exist_ok=True)
    txt_path.write_text(text, encoding="utf-8")
    write_json(json_path, payload)
    result["status"] = "imported"
    result["output_txt"] = str(txt_path)
    result["output_json"] = str(json_path)
    return result


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "input_dir",
        type=Path,
        help="Directory containing external ASR .txt/.md/.srt/.vtt/.json files named with video ids.",
    )
    parser.add_argument("--target-dir", type=Path, default=DEFAULT_TARGET_DIR)
    parser.add_argument("--source-label", default="External ASR transcript import")
    parser.add_argument("--engine", default="external-asr")
    parser.add_argument("--confidence", default="machine-generated ASR; requires spot-checking")
    parser.add_argument("--force", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    videos = video_index(args.target_dir)
    results: list[dict[str, Any]] = []
    for path in candidate_files(args.input_dir):
        video_id = id_from_path(path, videos)
        if not video_id:
            results.append({"input_file": str(path), "status": "skipped_no_video_id"})
            continue
        results.append(import_one(args, path, videos[video_id]))

    manifest_path = args.target_dir / "evidence" / "media" / "asr" / "external-import-manifest.json"
    prior = load_json(manifest_path) if manifest_path.exists() else []
    write_json(manifest_path, [*prior, *results])
    imported = sum(1 for row in results if row.get("status") == "imported")
    print(f"imported {imported} external ASR transcripts from {args.input_dir}")


if __name__ == "__main__":
    main()

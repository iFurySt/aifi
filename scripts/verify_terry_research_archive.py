#!/usr/bin/env python3
"""Verify Terry YouTube research archive consistency."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any


TARGET_DIR = Path("research/targets/terry-chen-youtube")
TARGET_INDEX = TARGET_DIR / "index.md"
MEDIA_DIR = TARGET_DIR / "evidence" / "media"
TRANSCRIPT_DIR = MEDIA_DIR / "transcripts"
ARTIFACT_JSON = TARGET_DIR / "artifacts" / "decision-frames" / "2026-07-13-evidence-backed-portfolio-timeline.json"
REPORT_DRAFT = TARGET_DIR / "artifacts" / "memos" / "2026-07-13-terry-investment-learning-report-draft.md"
FINAL_SYNTHESIS = TARGET_DIR / "artifacts" / "memos" / "2026-07-14-terry-investment-synthesis.md"
PRACTICE_PLAYBOOK = TARGET_DIR / "artifacts" / "memos" / "2026-07-13-practice-derived-investor-playbook.md"
GOAL_COMPLETION_AUDIT = TARGET_DIR / "artifacts" / "decision-frames" / "2026-07-14-goal-completion-audit.md"
ASR_PRIORITY = MEDIA_DIR / "asr" / "2026-07-13-priority-run-list.md"
ASR_SELECTED_QUEUE = MEDIA_DIR / "asr" / "selected-queue.json"
ASR_EXTERNAL_IMPORT_MANIFEST = MEDIA_DIR / "asr" / "external-import-manifest.json"
YTDLP_ROUTE_PROBES = MEDIA_DIR / "yt-dlp-route-probes.json"
TRANSCRIPT_PUBLISH_DATES = MEDIA_DIR / "youtube-transcript-video-publish-dates-obu.json"
DATED_DEVELOPMENT_MAP = TARGET_DIR / "artifacts" / "decision-frames" / "2026-07-14-dated-investment-development-map.md"
HIGH_VALUE_FALLBACK_RETRY = MEDIA_DIR / "2026-07-14-high-value-fallback-provider-retry.md"
NO_CAPTION_PROVIDER_RECON = MEDIA_DIR / "2026-07-14-no-caption-provider-recon.md"
PROVIDER_ROUTING_MATRIX = MEDIA_DIR / "2026-07-14-provider-routing-matrix.md"
FINAL_FALLBACK_ONLINE_PROVIDER_RETRY = MEDIA_DIR / "2026-07-14-final-fallback-online-provider-retry.md"
FINAL_MEMBERS_ONLY_BOUNDARY = MEDIA_DIR / "2026-07-14-final-members-only-boundary.md"
FINAL_MEMBERS_ONLY_EXPORT_QUEUE_MD = MEDIA_DIR / "2026-07-14-final-members-only-export-queue.md"
FINAL_MEMBERS_ONLY_EXPORT_QUEUE_CSV = MEDIA_DIR / "2026-07-14-final-members-only-export-queue.csv"
TRANSCRIPT_GAP_PRIORITY_JSON = MEDIA_DIR / "2026-07-14-transcript-gap-priority.json"
TRANSCRIPT_GAP_PRIORITY_MD = MEDIA_DIR / "2026-07-14-transcript-gap-priority.md"
MANUAL_PROVIDER_QUEUE_CSV = MEDIA_DIR / "2026-07-14-manual-provider-export-queue.csv"
MANUAL_PROVIDER_QUEUE_MD = MEDIA_DIR / "2026-07-14-manual-provider-export-queue.md"
NOIZ_PROVIDER_RECON = MEDIA_DIR / "2026-07-14-noiz-provider-recon.md"
YOUTUBE_TO_TEXT_PROVIDER_RECON = MEDIA_DIR / "2026-07-14-youtube-to-text-provider-recon.md"
WAYIN_YOUVIDEOTOTEXT_RECON = MEDIA_DIR / "2026-07-14-wayin-youvideototext-recon.md"
API_AND_FREE_TOOL_PROVIDER_RECON = MEDIA_DIR / "2026-07-14-api-and-free-tool-provider-recon.md"
YOUTLDR_TUBETRANSCRIPTGENERATOR_RECON = MEDIA_DIR / "2026-07-14-youtldr-tubetranscriptgenerator-recon.md"
PROVIDER_PROBE_DIR = MEDIA_DIR / "provider-probes"
HIGH_VALUE_FALLBACK_IDS = {
    "AFB5JNjXjsE",
    "1PEjeshVbZw",
    "diU75OZiuX8",
    "bsN8REhmr6M",
    "BgfTSZXNUa0",
    "mkRNzJ5iasA",
    "9QRA-rCUA5U",
    "WL47wW4ail8",
    "pbzs6A-topY",
    "kXVlrSjSPUE",
    "qefEi0grWeA",
    "5TDTxHZXiLE",
}
YOUTLDR_SOLVED_IDS = {
    "AFB5JNjXjsE",
    "bsN8REhmr6M",
    "5lXsYdh4sgI",
    "kXVlrSjSPUE",
    "VLsbfzuuk6Q",
    "aS7F9IjYqGM",
    "mkRNzJ5iasA",
    "TXhmc6ryMIg",
    "S3wi54arf04",
    "5TDTxHZXiLE",
    "_9Vjc25BaW4",
    "diU75OZiuX8",
    "nOj2qKzsgLY",
    "-dRVpWPFBCg",
    "tk7WzzZ3CCQ",
    "E17LUN8uzzQ",
    "BgfTSZXNUa0",
    "P1SqFI4RMrY",
    "WL47wW4ail8",
    "e0CJBzGa0hQ",
    "1PEjeshVbZw",
    "CfM7JHJWe58",
    "8OjJp5jJQOs",
    "euRySEUNwy4",
    "7jMD0AKhW10",
    "pbzs6A-topY",
    "Pw4rPF0Gh_0",
    "HApApK3G6MA",
    "l-GLv-a9Pco",
    "lr57dn0-Zmk",
    "IAq64jL6228",
    "0xKLVJuBRCU",
    "tog6Ue7He9Q",
    "qefEi0grWeA",
    "A6TW2Oc4j7Q",
    "xS5Lv7-bMYI",
    "OjaK7nmCYCo",
    "zomYKjlvJGU",
    "Z4n70osikaw",
    "9sliXt8Zs-Y",
    "2JjXdva3mWU",
    "Bm4qkzrl-Hg",
    "9QRA-rCUA5U",
    "CxeDMF2jF9E",
    "mDpxLytPUKg",
    "295d-r85l_I",
    "iOCR2iKXhOs",
    "MvdK9at7GHE",
    "FOry3r6yuDg",
    "CNsXroT21dU",
    "_g4HRf-vwIg",
    "zWt8DOYJiTE",
    "0CV8JlhHSA4",
    "0JpAC7XvdYY",
    "ht3VXIYQIqU",
    "3NzmDiMEYP8",
    "nCticKfLCj8",
    "Y-9KCih1zOA",
    "V8-s0FE3nF4",
    "pLfpDHfKHHs",
    "SvOV80Rlpqk",
    "KVhL2RqVtiM",
    "Py1UFAAmCc4",
    "f-OOnm7pv_s",
    "-AvpXoF6O3U",
    "A8GWS00nYDQ",
    "xMUjQKn13PA",
    "94Yu6n_Hw58",
    "QuLOU6uYKyI",
    "feJf1if-r1M",
    "BkszA-MvjXA",
    "9gqqCkWaP50",
    "02_xHMc_lBg",
    "rC-vbPLmx-8",
    "ASXM4-CQG8o",
    "Q3hEnlIHhoY",
    "vJcMEojoGxY",
    "uFzesIxJA_E",
    "_5BTnJElgt8",
    "Kn82i27buV4",
    "uHyDQHlpXM8",
    "Id3-EiuDRw8",
    "PZTcQgUAGls",
    "MvdwRa5nNO4",
    "6gjoMD3qDq8",
    "dmjCg7cGlW8",
    "nUvHiUaEIOw",
    "g6jbYUdj36Y",
    "MWXffsMmz-o",
    "GfcrfcJpGbw",
    "eiqrVenTXD4",
    "SrtvkPL15R0",
    "W5ZWlX1LxEk",
    "epaBq0UIPLk",
    "4XLE6C6R7dc",
    "1-IwQm9ybsA",
    "YESQyP49-Mg",
    "PgZI0k-_j_k",
    "YWYDnDoHblc",
    "PvzgMhM7bK8",
    "NZlhYG1YIas",
    "Bo4_nVFpVps",
    "zFeCVunJOoY",
    "JH8SoCsf35g",
    "OFQbCl8mLoo",
    "hkw0_YSeaRU",
    "Ska2dPEu7EA",
    "4ZFMZUTfi4M",
    "uASW46AWEwo",
    "Awuhw2y1AgY",
    "_CjLipqZgUU",
    "MsbzY6QbRVA",
    "7DTs5W4Zmuo",
    "axpmhUKyixg",
    "_i2febc-9jY",
    "lgVir_IqQ28",
    "k4K1uNM4S_k",
    "YKcagGAZRz0",
    "7A54_5MVH-8",
    "DtoLuOysaqQ",
    "DkirUmf4Asw",
    "dT_9yuPYems",
    "g9UHIIYBOdE",
    "ckwDcHE_QJY",
    "Dgjic4BbjGs",
    "bpx08OOZmeQ",
    "cULgfb_v4GE",
    "z6RnHqSuqUo",
    "03PrnQPmi6o",
    "Ea_eEXei4c8",
    "at7uItPdu7s",
    "-A0I6qZ5cZw",
    "Ng14_K-W6wQ",
    "gnDxkZJxs4A",
    "sFWfC72WWQY",
    "51dNGqLoM00",
    "vkIh4XPu1EE",
    "R7zAMgiawks",
    "m7iFNwj_bDQ",
    "KF3fPgSQx8E",
    "uaEm4XRSAAc",
    "sDGc4fK7O_U",
    "GoDzWt6ESh8",
    "B0kUs1tZWUo",
    "BQ_mYbm6C9I",
    "YAg2OTiFHBE",
    "T5DzIzHwJvk",
    "zZGFt6K3kaY",
    "plpyrtLavn4",
    "btBFmKxSoe0",
    "lQ7cV2jkWZQ",
    "B0AT2OZcy6Q",
    "wduqrFdcZX4",
    "6gp8-XENKqk",
    "UbR6eD-1EHU",
    "ixG4OLDnHzM",
    "JoKtRXg89bk",
    "g4uA-hK_ouY",
    "2gxNM-5HaYA",
    "_kpyMxtTMCk",
    "d5vU_IcnLQY",
    "LrjIsA0qnrE",
    "-juM640BPnw",
    "OAjivEnWHcA",
    "p7FqJm0qyEM",
    "eO-XgTedlsQ",
    "Xy1VVfbBBLU",
    "yp-Wp4nIWp0",
    "235KLJfaPlQ",
    "YoS3MZVa6Cc",
    "hWb2_NEPebI",
    "FyUKux68iag",
    "e5n6XXhEK4U",
    "lAoXCHSCVT0",
    "ZKqWsYqqClg",
    "aGowhfZFpFI",
    "ixmEqAsYUas",
    "3oyROW1YKdY",
    "QJhG_17DpRU",
    "HN7f1thlGso",
    "wSc3nGM8GOY",
    "ygL6OOOdwqM",
    "2m_FB0hCdmk",
    "Pp78kf_6d3g",
    "k3Gh_5JrFa4",
    "ZxEkw_OWvxA",
    "si_Cfyj2nCg",
    "i4xNoRa20Qc",
    "G2w_6egpDvM",
    "LOZLE0oJWtY",
    "lwsFycElqrs",
    "32lXkmZM8pQ",
    "fcdUBUnfCA4",
    "Rde7K2lf1RE",
    "Cm23CquLasU",
    "lnxs2Kup3sQ",
    "ufoK9DxJt3o",
    "ofitybjcHz0",
    "z6wMUaErCxU",
    "7gdjRNSCtoI",
    "qnp7KaEimo4",
    "GbuwJ7FcmaU",
    "V4Ww3l9YFSo",
    "1SyDth2hDpE",
    "69BxQJmnaSU",
    "x9sM5rI3tW8",
    "3EkaxkNGXD8",
    "cMGT5XXAEWw",
    "44-lmGgGzv8",
    "XB89ywDAzh0",
    "EanJhw8oYzk",
    "NhiosK0JSKU",
    "f7jJU6qoxe8",
    "pSoDUFdqVOU",
    "klErNfEgW6E",
}
REMAINING_TIER_1_GAP_PRIORITY_IDS: set[str] = set()
YOUTLDR_LATEST_FAILED_IDS = {
    "sK-IzrpapTo",
    "e32UtIo0C3c",
    "erlOBf7auSE",
    "xeEd1DEizNE",
    "IXrpfHPqYfg",
    "9Ecx6g8ez1k",
    "DcXyt4C-07E",
    "FusQOi4BGYw",
    "rIupufjIp5M",
    "c24laHz3Vmo",
}
YOUTLDR_NO_SOURCE_OK_IDS = {"ASXM4-CQG8o", "-A0I6qZ5cZw", "32lXkmZM8pQ", "ofitybjcHz0", "z6wMUaErCxU"}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def fail(message: str) -> None:
    print(f"verify failed: {message}", file=sys.stderr)
    raise SystemExit(1)


def check_counts() -> None:
    videos = load_json(MEDIA_DIR / "youtube-video-index.json")
    manifest = load_json(TRANSCRIPT_DIR / "manifest.json")
    queue = load_json(MEDIA_DIR / "asr" / "queue.json")
    if len(videos) != 291:
        fail(f"expected 291 videos, found {len(videos)}")
    ok_count = sum(1 for row in manifest if row.get("status") == "ok")
    if ok_count < 6:
        fail(f"expected at least 6 ok transcript records, found {ok_count}")
    if len(queue) != len(videos) - ok_count:
        fail(f"expected ASR queue to equal videos-ok ({len(videos) - ok_count}), found {len(queue)}")


def check_evidence_refs() -> None:
    if not REPORT_DRAFT.exists():
        fail(f"missing report draft: {REPORT_DRAFT}")
    payload = load_json(ARTIFACT_JSON)
    ref_pattern = re.compile(r"^(?P<path>.+\.txt):(?P<line>\d+)$")
    for item in payload.get("confirmed_from_transcripts", []):
        for ref in item.get("evidence", []):
            match = ref_pattern.match(ref)
            if not match:
                fail(f"bad evidence ref format: {ref}")
            path = Path(match.group("path"))
            if not path.exists():
                fail(f"missing evidence file: {path}")
            line_no = int(match.group("line"))
            line_count = len(path.read_text(encoding="utf-8").splitlines())
            if line_no < 1 or line_no > line_count:
                fail(f"line {line_no} out of range for {path} ({line_count} lines)")


def check_dated_development_map_refs() -> None:
    if not DATED_DEVELOPMENT_MAP.exists():
        fail(f"missing dated development map: {DATED_DEVELOPMENT_MAP}")
    text = DATED_DEVELOPMENT_MAP.read_text(encoding="utf-8")
    required_phrases = [
        "286 useful transcript captures",
        "exact publish dates for 284 of 286 transcript-covered videos",
        "c24laHz3Vmo",
        "war/geopolitical shock",
        "5 public videos still lack useful archived transcript text",
    ]
    missing_phrases = [phrase for phrase in required_phrases if phrase not in text]
    if missing_phrases:
        fail(f"dated development map missing phrases: {', '.join(missing_phrases)}")
    ref_pattern = re.compile(r"`(?P<name>[^`]+\.txt):(?P<start>\d+)(?:-(?P<end>\d+))?`")
    matches = list(ref_pattern.finditer(text))
    if not matches:
        fail("dated development map has no transcript evidence refs")
    for match in matches:
        path = TRANSCRIPT_DIR / match.group("name")
        if not path.exists():
            fail(f"missing dated-map evidence file: {path}")
        start = int(match.group("start"))
        end = int(match.group("end") or start)
        line_count = len(path.read_text(encoding="utf-8").splitlines())
        if start < 1 or end > line_count or start > end:
            fail(f"dated-map ref out of range: {path}:{start}-{end} ({line_count} lines)")


def check_final_synthesis_current() -> None:
    if not FINAL_SYNTHESIS.exists():
        fail(f"missing final synthesis: {FINAL_SYNTHESIS}")
    text = FINAL_SYNTHESIS.read_text(encoding="utf-8")
    required_phrases = [
        "286 useful transcript captures",
        "exact publish dates for 284 of 286 transcript-covered videos",
        "5 remaining fallback videos",
        "c24laHz3Vmo.provider-aivideosummarizer.txt:6-30",
        "5 public videos still lack useful stored transcript text",
        "erlOBf7auSE.provider-tubetranscript-pro-ai.txt",
        "xeEd1DEizNE.provider-tubetranscript-pro-ai.txt",
        "e32UtIo0C3c.provider-tubetranscript-pro-ai.txt",
        "war/market-panic short",
        "## 1. Terry 的投资组合情况",
        "## 2. Terry 的财富/投资发展路径",
        "## 3. 普通人可迁移的投资组合方案",
        "## 4. Practice-First Learning Plan",
        "Latest Disclosed Allocation",
        "Practical Default",
    ]
    missing = [phrase for phrase in required_phrases if phrase not in text]
    if missing:
        fail(f"final synthesis missing current-state phrases: {', '.join(missing)}")


def check_practice_playbook_current() -> None:
    if not PRACTICE_PLAYBOOK.exists():
        fail(f"missing practice playbook: {PRACTICE_PLAYBOOK}")
    text = PRACTICE_PLAYBOOK.read_text(encoding="utf-8")
    required_phrases = [
        "286 useful transcript captures",
        "5 remaining fallback videos",
        "12,152 structured evidence-ledger entries",
        "Superseded by `artifacts/memos/2026-07-14-terry-investment-synthesis.md`",
    ]
    missing = [phrase for phrase in required_phrases if phrase not in text]
    if missing:
        fail(f"practice playbook missing current-state phrases: {', '.join(missing)}")
    stale_phrases = ["65 unique transcript captures", "4,979 canonical structured evidence-ledger entries"]
    stale = [phrase for phrase in stale_phrases if phrase in text]
    if stale:
        fail(f"practice playbook still contains stale phrases: {', '.join(stale)}")


def check_goal_completion_audit() -> None:
    if not GOAL_COMPLETION_AUDIT.exists():
        fail(f"missing goal completion audit: {GOAL_COMPLETION_AUDIT}")
    text = GOAL_COMPLETION_AUDIT.read_text(encoding="utf-8")
    required_phrases = [
        "Current status: Not complete",
        "Collect Terry's historical public YouTube video links",
        "Extract spoken-content text from YouTube links",
        "Analyze Terry's investment portfolio over time",
        "Analyze Terry's wealth / investment development path",
        "Produce an ordinary-person portfolio translation",
        "Produce a practice-first investment/finance learning plan",
        "286 `ok` useful transcript captures",
        "5 public videos still lack useful transcript text",
        "Latest URL-Only Provider Recheck",
        "HappyScribe",
        "happyscribe.com/public/anonymous_upload/url_imports",
        "HTTP 201",
        "Evernote",
        "create-from-url",
        "HTTP 500",
        "Maestra",
        "Vizard",
        "Dubverse",
        "Proactor",
        "Cloudflare access-control",
        "BibiGPT",
        "bibigpt.co/api/extract-url",
        "ScreenApp / YT Scribe",
        "api.screenapp.io/v2/files/transcripts/youtube",
        "TubeScript",
        "AI_FALLBACK_CAPACITY_EXHAUSTED",
        "YouTubeTranscriptFree",
        "youtubetranscriptfree.com/api/transcript/tracks",
        "login_required",
        "NoteLM.ai",
        "notelm.ai/api/youtube-video-info",
        "FreeScribe / GetTheScript",
        "freescribe.app/api/video-info",
        "AIYouTubeTranscript",
        "aiyoutubetranscript.com/api/transcript/segments",
        "SpeechGen",
        "speechgen.io/index.php?r=transcribe/uploadYT",
        "onlyPremium",
        "VexaScribe",
        "Public/YouTubeTranscript",
        "NovaScribe",
        "Public/VideoTranscript",
        "VOMO",
        "rapi.vomo.ai/gst/transcribe/youtube",
        "Subtitle fetch failed",
        "VocaScript",
        "BlazeScribe",
        "TubeTranscript.com Pro AI",
        "yt-to-text.com/api/p/v1/GetTranscripts",
        "USER_RESTRICTED_ACCESS",
        "erlOBf7auSE",
        "e32UtIo0C3c",
        "provider-boundary evidence",
        "Do not mark the full goal complete yet.",
        "channel-member access",
        "legally return usable text for the remaining 5",
        "Final access-rights check",
        "youtube_link_restricted",
    ]
    missing = [phrase for phrase in required_phrases if phrase not in text]
    if missing:
        fail(f"goal completion audit missing phrases: {', '.join(missing)}")


def check_target_index_current() -> None:
    if not TARGET_INDEX.exists():
        fail(f"missing Terry target index: {TARGET_INDEX}")
    text = TARGET_INDEX.read_text(encoding="utf-8")
    required_phrases = [
        "## Delivery Map",
        "Historical video links",
        "Raw spoken-text archive",
        "Terry's portfolio over time",
        "Terry's wealth / investment development",
        "Ordinary-person portfolio translation",
        "Practice-first learning plan",
        "Completion status",
        "291 public channel videos collected",
        "286 useful transcript captures, 0 partial captures, 5 remaining fallback videos",
        "286 transcript/probe records: 286 ok",
        "5 videos currently lack useful stored transcript text",
        "Publish dates for 284 of 286 videos with useful archived transcript text",
        "12,152 canonical line-level transcript evidence entries",
        "6,456 canonical signal lines and 12,152 structured evidence entries",
        "Superseded for active work by URL-only provider/manual export routing",
        "Final members-only export queue",
        "last five access-rights-blocked videos",
    ]
    missing = [phrase for phrase in required_phrases if phrase not in text]
    if missing:
        fail(f"Terry target index missing current-state phrases: {', '.join(missing)}")
    stale_phrases = [
        "281 transcript/probe records: 280 ok",
        "10 videos currently lack stored transcript text",
        "Publish dates for all 280 videos",
        "11,928 canonical line-level",
        "6,347 canonical signal lines",
        "282 useful transcript captures, 1 partial capture, 8 remaining fallback videos",
        "283 transcript/probe records: 282 ok and 1 partial",
        "285 useful transcript captures",
    ]
    stale = [phrase for phrase in stale_phrases if phrase in text]
    if stale:
        fail(f"Terry target index still contains stale phrases: {', '.join(stale)}")


def check_high_value_fallback_retry() -> None:
    if not HIGH_VALUE_FALLBACK_RETRY.exists():
        fail(f"missing high-value fallback retry matrix: {HIGH_VALUE_FALLBACK_RETRY}")
    text = HIGH_VALUE_FALLBACK_RETRY.read_text(encoding="utf-8")
    missing_from_doc = sorted(video_id for video_id in HIGH_VALUE_FALLBACK_IDS if video_id not in text)
    if missing_from_doc:
        fail(f"high-value retry matrix missing ids: {', '.join(missing_from_doc)}")
    required_manifests = [
        PROVIDER_PROBE_DIR / "kome-manifest.json",
        PROVIDER_PROBE_DIR / "gettranscript-manifest.json",
        PROVIDER_PROBE_DIR / "youtubetranscript-ai-manifest.json",
    ]
    for path in required_manifests:
        rows = load_json(path)
        seen = {row.get("id") or row.get("video_id") for row in rows}
        missing = sorted(HIGH_VALUE_FALLBACK_IDS - seen)
        if missing:
            fail(f"{path.name} missing high-value retry rows: {', '.join(missing)}")
    insightstube_rows = load_json(PROVIDER_PROBE_DIR / "insightstube-manifest.json")
    insightstube_status = {row.get("id"): row.get("status") for row in insightstube_rows}
    if insightstube_status.get("Q59J5roE5lM") != "ok":
        fail("insightstube manifest missing Q59 positive-control ok row")
    for video_id in ("AFB5JNjXjsE", "bsN8REhmr6M"):
        if insightstube_status.get(video_id) != "provider_failed":
            fail(f"insightstube manifest missing hard-case provider_failed row: {video_id}")


def check_no_caption_provider_recon() -> None:
    if not NO_CAPTION_PROVIDER_RECON.exists():
        fail(f"missing no-caption provider recon: {NO_CAPTION_PROVIDER_RECON}")
    text = NO_CAPTION_PROVIDER_RECON.read_text(encoding="utf-8")
    required_phrases = [
        "Transcriptly",
        "Mictoo",
        "AISEO",
        "VideoToWords",
        "ScreenApp",
        "Whisper Web",
        "TranscribeAI",
        "No audio stream found in video formats",
        "Download the audio",
        "X_API_KEY / NEW_FREE_TOOL_API_KEY / FREE_TOOL_API_KEY is not configured",
    ]
    missing = [phrase for phrase in required_phrases if phrase not in text]
    if missing:
        fail(f"no-caption provider recon missing phrases: {', '.join(missing)}")


def check_provider_routing_matrix() -> None:
    if not PROVIDER_ROUTING_MATRIX.exists():
        fail(f"missing provider routing matrix: {PROVIDER_ROUTING_MATRIX}")
    text = PROVIDER_ROUTING_MATRIX.read_text(encoding="utf-8")
    required_phrases = [
        "Hard-case unlocker",
        "Direct-caption cross-checks",
        "No-caption candidates with current blockers",
        "Manual/authenticated candidates",
        "Out-of-scope local/browser ASR",
        "AI Video Summarizer",
        "NoteGPT",
        "YoutubeToText.ai",
        "VideoToBe",
        "Wayin.ai",
        "YouVideoToText",
        "TranscriptFlow",
        "Supadata",
        "FreeYouTubeTranscribe",
        "TranscribeYouTube",
        "Crawlora",
        "YouTubeTranscripts.org",
        "Maestra",
        "Verification failed",
        "This video is private or age-restricted",
        "Transcriptly",
        "TranscribeAI",
        "Whisper Web",
        "Noiz / Eightify",
        "YouTLDR",
        "TubeTranscriptGenerator",
        "HappyScribe",
        "Evernote",
        "Vizard",
        "Dubverse",
        "ScreenApp / YT Scribe",
        "YouTubeTranscriptFree",
        "BibiGPT",
        "TubeScript",
        "NoteLM.ai",
        "FreeScribe / GetTheScript",
        "AIYouTubeTranscript",
        "SpeechGen",
        "VexaScribe",
        "NovaScribe",
        "VOMO",
        "VocaScript",
        "BlazeScribe",
        "api.screenapp.io/v2/files/transcripts/youtube",
        "youtubetranscriptfree.com/api/transcript/tracks",
        "bibigpt.co/api/extract-url",
        "AI_FALLBACK_CAPACITY_EXHAUSTED",
        "notelm.ai/api/youtube-video-info",
        "freescribe.app/api/transcript",
        "aiyoutubetranscript.com/api/transcript/segments",
        "speechgen.io/index.php?r=transcribe/uploadYT",
        "SUBTITLES_NOT_AVAILABLE",
        "onlyPremium",
        "Public/YouTubeTranscript",
        "Public/VideoTranscript",
        "rapi.vomo.ai/gst/transcribe/youtube",
        "Subtitle fetch failed",
        "rate_limited",
        "200-word preview",
        "HTTP 401",
        "happyscribe.com/public/anonymous_upload/url_imports",
        "HTTP 201",
        "public.evernote.com/transcription/v1/create-from-url",
        "HTTP 500",
        "webapp.dubverse.ai/?user_type=sub&wlink=",
        "Cloudflare block",
        "source: whisper",
        "yt-dlp: ERROR: unable to download video data: HTTP Error 403: Forbidden",
        "Do not spend more time rerunning ordinary direct-caption providers",
        "286 useful transcript captures",
        "5 fallback videos",
        "TubeTranscript.com Pro AI",
        "yt-to-text.com/api/p/v1/GetTranscripts",
        "USER_RESTRICTED_ACCESS",
        "erlOBf7auSE",
        "e32UtIo0C3c",
        "Final access-rights boundary",
        "Harku",
        "youtube_link_restricted",
        "UNPLAYABLE",
    ]
    missing = [phrase for phrase in required_phrases if phrase not in text]
    if missing:
        fail(f"provider routing matrix missing phrases: {', '.join(missing)}")


def check_final_fallback_online_provider_retry() -> None:
    if not FINAL_FALLBACK_ONLINE_PROVIDER_RETRY.exists():
        fail(f"missing final fallback online provider retry: {FINAL_FALLBACK_ONLINE_PROVIDER_RETRY}")
    text = FINAL_FALLBACK_ONLINE_PROVIDER_RETRY.read_text(encoding="utf-8")
    required_phrases = [
        "URL-only online transcript/subtitle extraction",
        "No video/audio download and no local ASR",
        "NoteGPT",
        "DownloadYoutubeSubtitles.com",
        "AI Video Summarizer",
        "Supadata",
        "HappyScribe",
        "Evernote",
        "Maestra",
        "Vizard",
        "Dubverse",
        "Proactor",
        "BibiGPT",
        "ScreenApp / YT Scribe",
        "TubeScript",
        "YouTubeTranscriptFree",
        "NoteLM.ai",
        "FreeScribe / GetTheScript",
        "AIYouTubeTranscript",
        "SpeechGen",
        "VexaScribe",
        "NovaScribe",
        "VOMO",
        "VocaScript",
        "BlazeScribe",
        "c24laHz3Vmo",
        "IXrpfHPqYfg",
        "39 subtitle segments",
        "63 subtitle segments",
        "No video/audio was downloaded locally, and no local ASR was run.",
        "https://www.happyscribe.com/public/anonymous_upload/url_imports",
        "HTTP 201",
        "https://public.evernote.com/transcription/v1/create-from-url",
        "HTTP 500",
        "webapp.dubverse.ai/?user_type=sub&wlink=",
        "https://bibigpt.co/api/extract-url?url=",
        "https://api.screenapp.io/v2/files/transcripts/youtube",
        "AI_FALLBACK_CAPACITY_EXHAUSTED",
        "https://youtubetranscriptfree.com/api/transcript/tracks",
        "HTTP 401 `login_required`",
        "https://www.notelm.ai/api/youtube-video-info",
        "https://freescribe.app/api/transcript",
        "https://aiyoutubetranscript.com/api/transcript/segments?url=",
        "https://speechgen.io/index.php?r=transcribe/uploadYT&lang=en",
        "https://tub3g7bkx3.execute-api.eu-west-2.amazonaws.com/Public/YouTubeTranscript",
        "https://tub3g7bkx3.execute-api.eu-west-2.amazonaws.com/Public/VideoTranscript",
        "https://rapi.vomo.ai/gst/gen_tk",
        "https://rapi.vomo.ai/gst/transcribe/youtube",
        "SUBTITLES_NOT_AVAILABLE",
        "onlyPremium",
        "Subtitle fetch failed",
        "rate_limited",
        "200-word preview",
        "Cloudflare access-control",
        "286 videos",
        "5 videos",
        "TubeTranscript.com Pro AI",
        "https://yt-to-text.com/api/p/v1/GetTranscripts",
        "USER_RESTRICTED_ACCESS",
        "287 segments",
        "267 segments",
        "248 segments",
        "Harku",
        "https://harku.io/api/youtube-transcript/preview",
        "youtube_link_restricted",
        "UNPLAYABLE",
        "no `captionTracks`",
    ]
    missing = [phrase for phrase in required_phrases if phrase not in text]
    if missing:
        fail(f"final fallback online provider retry missing phrases: {', '.join(missing)}")


def check_final_members_only_boundary() -> None:
    if not FINAL_MEMBERS_ONLY_BOUNDARY.exists():
        fail(f"missing final members-only boundary evidence: {FINAL_MEMBERS_ONLY_BOUNDARY}")
    text = FINAL_MEMBERS_ONLY_BOUNDARY.read_text(encoding="utf-8")
    required_phrases = [
        "Final Members-Only Boundary Check",
        "URL-only online transcript/subtitle extraction",
        "No video/audio download and no local ASR",
        "UNPLAYABLE",
        "captionTracks",
        "Harku Probe",
        "POST /api/youtube-transcript/preview",
        "youtube_link_restricted",
        "guest_new_url_daily_limit",
        "Do not replace this with local video/audio download or local ASR",
    ]
    required_phrases.extend(["9Ecx6g8ez1k", "DcXyt4C-07E", "FusQOi4BGYw", "sK-IzrpapTo", "rIupufjIp5M"])
    missing = [phrase for phrase in required_phrases if phrase not in text]
    if missing:
        fail(f"final members-only boundary missing phrases: {', '.join(missing)}")


def check_final_members_only_export_queue() -> None:
    if not FINAL_MEMBERS_ONLY_EXPORT_QUEUE_MD.exists():
        fail(f"missing final members-only export queue: {FINAL_MEMBERS_ONLY_EXPORT_QUEUE_MD}")
    if not FINAL_MEMBERS_ONLY_EXPORT_QUEUE_CSV.exists():
        fail(f"missing final members-only export queue csv: {FINAL_MEMBERS_ONLY_EXPORT_QUEUE_CSV}")
    md_text = FINAL_MEMBERS_ONLY_EXPORT_QUEUE_MD.read_text(encoding="utf-8")
    csv_text = FINAL_MEMBERS_ONLY_EXPORT_QUEUE_CSV.read_text(encoding="utf-8")
    required_phrases = [
        "Final Members-Only Export Queue",
        "Do not download video/audio and do not run local ASR",
        "YouTube Members Transcript",
        "explicit user approval",
        "sK-IzrpapTo.member-export.txt",
        "python3 scripts/import_terry_asr_transcripts.py",
        "Manual members-only transcript export",
        "manual-members-only-export",
    ]
    required_phrases.extend(["9Ecx6g8ez1k", "DcXyt4C-07E", "FusQOi4BGYw", "sK-IzrpapTo", "rIupufjIp5M"])
    missing = [phrase for phrase in required_phrases if phrase not in md_text]
    if missing:
        fail(f"final members-only export queue missing phrases: {', '.join(missing)}")
    csv_required = [
        "highest_remaining_research_value",
        "low_research_value_context",
        "YouTube UNPLAYABLE members-only",
        "Local video/audio download",
        "manual copy/export",
    ]
    csv_required.extend(["9Ecx6g8ez1k", "DcXyt4C-07E", "FusQOi4BGYw", "sK-IzrpapTo", "rIupufjIp5M"])
    csv_missing = [phrase for phrase in csv_required if phrase not in csv_text]
    if csv_missing:
        fail(f"final members-only export queue csv missing phrases: {', '.join(csv_missing)}")


def check_transcript_gap_priority() -> None:
    if not TRANSCRIPT_GAP_PRIORITY_JSON.exists():
        fail(f"missing transcript gap priority json: {TRANSCRIPT_GAP_PRIORITY_JSON}")
    if not TRANSCRIPT_GAP_PRIORITY_MD.exists():
        fail(f"missing transcript gap priority markdown: {TRANSCRIPT_GAP_PRIORITY_MD}")
    rows = load_json(TRANSCRIPT_GAP_PRIORITY_JSON)
    if len(rows) != 4:
        fail(f"expected 4 scored transcript gaps, found {len(rows)}")
    tier_1_ids = {
        row.get("id")
        for row in rows
        if row.get("priority_tier") == "tier_1_next_manual_or_hardcase_provider"
    }
    missing_tier_1 = sorted(REMAINING_TIER_1_GAP_PRIORITY_IDS - tier_1_ids)
    if missing_tier_1:
        fail(f"transcript gap priority missing tier-1 ids: {', '.join(missing_tier_1)}")
    solved_still_tier_1 = sorted(YOUTLDR_SOLVED_IDS & tier_1_ids)
    if solved_still_tier_1:
        fail(f"YouTLDR-solved ids still appear as tier-1 gaps: {', '.join(solved_still_tier_1)}")
    if tier_1_ids != REMAINING_TIER_1_GAP_PRIORITY_IDS:
        fail(f"unexpected tier-1 ids after YouTLDR recovery: {', '.join(sorted(tier_1_ids))}")
    markdown = TRANSCRIPT_GAP_PRIORITY_MD.read_text(encoding="utf-8")
    required_phrases = [
        "Terry Transcript Gap Priority",
        "Scored fallback videos: 4",
        "Do not use this queue to trigger video/audio download or local ASR",
        "sK-IzrpapTo",
    ]
    missing_phrases = [phrase for phrase in required_phrases if phrase not in markdown]
    if missing_phrases:
        fail(f"transcript gap priority markdown missing phrases: {', '.join(missing_phrases)}")


def check_manual_provider_queue() -> None:
    if not MANUAL_PROVIDER_QUEUE_CSV.exists():
        fail(f"missing manual provider queue csv: {MANUAL_PROVIDER_QUEUE_CSV}")
    if not MANUAL_PROVIDER_QUEUE_MD.exists():
        fail(f"missing manual provider queue markdown: {MANUAL_PROVIDER_QUEUE_MD}")
    csv_text = MANUAL_PROVIDER_QUEUE_CSV.read_text(encoding="utf-8")
    md_text = MANUAL_PROVIDER_QUEUE_MD.read_text(encoding="utf-8")
    for video_id in REMAINING_TIER_1_GAP_PRIORITY_IDS:
        if video_id not in csv_text or video_id not in md_text:
            fail(f"manual provider queue missing tier-1 id: {video_id}")
    table_text = md_text.split("## Current Provider State", 1)[0]
    solved_still_queued = sorted(
        video_id for video_id in YOUTLDR_SOLVED_IDS if video_id in csv_text or video_id in table_text
    )
    if solved_still_queued:
        fail(f"YouTLDR-solved ids still appear in manual provider queue: {', '.join(solved_still_queued)}")
    required_phrases = [
        "AI Video Summarizer",
        "NoteGPT Subtitle Downloader",
        "NoteGPT Transcript Downloader",
        "BibiGPT Subtitle Downloader",
        "YoutubeToText.ai",
        "VideoToBe",
        "YouVideoToText",
        "YouTLDR",
        "YouTLDR solved 215 hard-case / Tier 2",
        "diU75OZiuX8",
        "e0CJBzGa0hQ",
        "1PEjeshVbZw",
        "9Ecx6g8ez1k",
        "DcXyt4C-07E",
        "FusQOi4BGYw",
        "sK-IzrpapTo",
        "rIupufjIp5M",
        "Tier 1 manual/provider queue is currently empty",
        "do not download video/audio",
        "Your daily guest limit has been reached. Please log in to continue.",
    ]
    missing = [phrase for phrase in required_phrases if phrase not in md_text]
    if missing:
        fail(f"manual provider queue markdown missing phrases: {', '.join(missing)}")


def check_noiz_provider_recon() -> None:
    if not NOIZ_PROVIDER_RECON.exists():
        fail(f"missing Noiz provider recon: {NOIZ_PROVIDER_RECON}")
    text = NOIZ_PROVIDER_RECON.read_text(encoding="utf-8")
    required_phrases = [
        "Noiz / Eightify",
        "backend.noiz.io/api/landing/youtube/subtitles",
        "Q59J5roE5lM",
        "AFB5JNjXjsE",
        "bsN8REhmr6M",
        "5 per 1 day",
        "youtube-transcript-api",
        "not a no-caption hard-case unlocker",
    ]
    missing = [phrase for phrase in required_phrases if phrase not in text]
    if missing:
        fail(f"Noiz provider recon missing phrases: {', '.join(missing)}")


def check_youtube_to_text_provider_recon() -> None:
    if not YOUTUBE_TO_TEXT_PROVIDER_RECON.exists():
        fail(f"missing YouTube-to-text provider recon: {YOUTUBE_TO_TEXT_PROVIDER_RECON}")
    text = YOUTUBE_TO_TEXT_PROVIDER_RECON.read_text(encoding="utf-8")
    required_phrases = [
        "YoutubeToText.ai",
        "VideoToBe",
        "ElevenLabs Scribe",
        "api.youtubetotext.ai/v1/transcriptions/add-to-queue",
        "x-token",
        "Q59J5roE5lM",
        "AFB5JNjXjsE",
        "HTTP 403",
        "Manual/authenticated candidate",
    ]
    missing = [phrase for phrase in required_phrases if phrase not in text]
    if missing:
        fail(f"YouTube-to-text provider recon missing phrases: {', '.join(missing)}")


def check_wayin_youvideototext_recon() -> None:
    if not WAYIN_YOUVIDEOTOTEXT_RECON.exists():
        fail(f"missing Wayin / YouVideoToText recon: {WAYIN_YOUVIDEOTOTEXT_RECON}")
    text = WAYIN_YOUVIDEOTOTEXT_RECON.read_text(encoding="utf-8")
    required_phrases = [
        "Wayin.ai",
        "YouVideoToText",
        "HTTP 451",
        "youtubetotext.org",
        "youvideototext.com",
        "Cloudflare Turnstile",
        "Please complete the captcha and try again.",
        "must-auth",
        "limit",
        "robot",
        "Real browser/manual candidate",
    ]
    missing = [phrase for phrase in required_phrases if phrase not in text]
    if missing:
        fail(f"Wayin / YouVideoToText recon missing phrases: {', '.join(missing)}")


def check_api_and_free_tool_provider_recon() -> None:
    if not API_AND_FREE_TOOL_PROVIDER_RECON.exists():
        fail(f"missing API/free-tool provider recon: {API_AND_FREE_TOOL_PROVIDER_RECON}")
    text = API_AND_FREE_TOOL_PROVIDER_RECON.read_text(encoding="utf-8")
    required_phrases = [
        "Supadata",
        "Crawlora",
        "FreeYouTubeTranscribe",
        "TranscribeYouTube",
        "YouTubeTranscripts.org",
        "Maestra",
        "Glasp",
        "Firecrawl / SocialKit",
        "Q59J5roE5lM",
        "AFB5JNjXjsE",
        "Verification failed. Please refresh the page and try again.",
        "This video is private or age-restricted, so its captions are not accessible.",
        "Cloudflare Turnstile",
        "Sign in to generate transcripts",
        "app.maestra.ai/transcription-trial",
        "subtitle-trial",
        "Just a moment...",
        "No new transcript text was recovered",
    ]
    missing = [phrase for phrase in required_phrases if phrase not in text]
    if missing:
        fail(f"API/free-tool provider recon missing phrases: {', '.join(missing)}")


def check_youtldr_tubetranscriptgenerator_recon() -> None:
    if not YOUTLDR_TUBETRANSCRIPTGENERATOR_RECON.exists():
        fail(f"missing YouTLDR / TubeTranscriptGenerator recon: {YOUTLDR_TUBETRANSCRIPTGENERATOR_RECON}")
    text = YOUTLDR_TUBETRANSCRIPTGENERATOR_RECON.read_text(encoding="utf-8")
    required_phrases = [
        "YouTLDR",
        "TubeTranscriptGenerator",
        "scripts/collect_youtube_transcripts_youtldr.py",
        "scripts/collect_youtube_transcripts_tubetranscriptgenerator.py",
        "language: zh",
        "zh-TW",
        "source: whisper",
        "yt-dlp: ERROR: unable to download video data: HTTP Error 403: Forbidden",
        "286 useful transcript",
        "5 fallback",
    ]
    required_phrases.extend(sorted(YOUTLDR_SOLVED_IDS))
    required_phrases.extend(sorted(REMAINING_TIER_1_GAP_PRIORITY_IDS))
    required_phrases.extend(sorted(YOUTLDR_LATEST_FAILED_IDS))
    missing = [phrase for phrase in required_phrases if phrase not in text]
    if missing:
        fail(f"YouTLDR / TubeTranscriptGenerator recon missing phrases: {', '.join(missing)}")


def check_youtldr_provider_outputs() -> None:
    manifest_path = PROVIDER_PROBE_DIR / "youtldr-manifest.json"
    if not manifest_path.exists():
        fail(f"missing YouTLDR provider manifest: {manifest_path}")
    rows = load_json(manifest_path)
    by_id: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        video_id = row.get("id") or row.get("video_id")
        if video_id:
            by_id.setdefault(video_id, []).append(row)

    for video_id in sorted(YOUTLDR_SOLVED_IDS):
        ok_rows = [row for row in by_id.get(video_id, []) if row.get("status") == "ok"]
        if not ok_rows:
            fail(f"YouTLDR manifest missing ok row for solved id: {video_id}")
        if video_id not in YOUTLDR_NO_SOURCE_OK_IDS and not any(
            row.get("provider_source") == "whisper" for row in ok_rows
        ):
            fail(f"YouTLDR ok row missing provider_source=whisper for {video_id}")
        txt_path = TRANSCRIPT_DIR / f"{video_id}.provider-youtldr.txt"
        json_path = TRANSCRIPT_DIR / f"{video_id}.provider-youtldr.json"
        if not txt_path.exists() or not json_path.exists():
            fail(f"missing YouTLDR transcript files for {video_id}")
        payload = load_json(json_path)
        if video_id not in YOUTLDR_NO_SOURCE_OK_IDS and payload.get("transcript", {}).get("source") != "whisper":
            fail(f"YouTLDR JSON transcript source is not whisper for {video_id}")
        if len(txt_path.read_text(encoding="utf-8").strip()) < 500:
            fail(f"YouTLDR transcript text unexpectedly short for {video_id}")

    for video_id in sorted(YOUTLDR_LATEST_FAILED_IDS):
        failed_rows = [row for row in by_id.get(video_id, []) if row.get("status") == "provider_failed"]
        if not failed_rows:
            fail(f"YouTLDR manifest missing provider_failed row for latest failed id: {video_id}")
        failure_text = "\n".join(
            f"{row.get('provider_message', '')}\n{row.get('error', '')}" for row in failed_rows
        )
        if video_id in {
            "e32UtIo0C3c",
            "erlOBf7auSE",
            "IXrpfHPqYfg",
            "xeEd1DEizNE",
            "c24laHz3Vmo",
        }:
            if "provider returned no usable transcript text" not in failure_text:
                fail(f"YouTLDR failure row missing no-usable-transcript message for {video_id}")
        elif video_id in {"sK-IzrpapTo", "9Ecx6g8ez1k", "DcXyt4C-07E", "FusQOi4BGYw", "rIupufjIp5M"}:
            if "members" not in failure_text and "channel's members" not in failure_text:
                fail(f"YouTLDR failure row missing member-gate provider message for {video_id}")
        elif (
            "HTTP Error 403" not in failure_text
            and "Sign in to confirm" not in failure_text
            and "CERTIFICATE_VERIFY_FAILED" not in failure_text
        ):
            fail(f"YouTLDR failure row missing HTTP/sign-in provider message for {video_id}")


def check_asr_priority_ids() -> None:
    if not ASR_EXTERNAL_IMPORT_MANIFEST.exists():
        fail(f"missing external ASR import manifest: {ASR_EXTERNAL_IMPORT_MANIFEST}")
    text = ASR_PRIORITY.read_text(encoding="utf-8")
    priority_ids = set(re.findall(r"`([A-Za-z0-9_-]{11})`", text))
    queue_ids = {row["id"] for row in load_json(MEDIA_DIR / "asr" / "queue.json")}
    ok_ids = {row["id"] for row in load_json(TRANSCRIPT_DIR / "manifest.json") if row.get("status") == "ok"}
    missing = sorted(priority_ids - queue_ids - ok_ids)
    if missing:
        fail(f"ASR priority ids not in queue: {', '.join(missing)}")
    if ASR_SELECTED_QUEUE.exists():
        selected = load_json(ASR_SELECTED_QUEUE)
        selected_ids = [row["id"] for row in selected]
        expected = [row["id"] for row in load_json(MEDIA_DIR / "asr" / "queue.json")]
        if selected_ids != expected:
            fail("selected ASR queue does not match current fallback queue")


def priority_video_ids_from_text(text: str) -> list[str]:
    seen: set[str] = set()
    ids: list[str] = []
    for video_id in re.findall(r"`([A-Za-z0-9_-]{11})`", text):
        if video_id in seen:
            continue
        seen.add(video_id)
        ids.append(video_id)
    return ids


def check_ytdlp_route_probes() -> None:
    rows = load_json(YTDLP_ROUTE_PROBES)
    probed = {(row.get("id"), row.get("client")) for row in rows}
    required = {
        ("2avMoXe8Bwg", "mweb"),
        ("Gwn_kEegfJ4", "mweb"),
        ("2avMoXe8Bwg", "list"),
        ("Gwn_kEegfJ4", "list"),
    }
    missing = sorted(required - probed)
    if missing:
        fail(f"missing yt-dlp route probe rows: {missing}")
    statuses = {row.get("status") for row in rows if row.get("id") in {"2avMoXe8Bwg", "Gwn_kEegfJ4"}}
    if not statuses.intersection({"bot_check", "missing_po_token", "empty"}):
        fail("yt-dlp route probes do not record expected blocked/PO-token statuses")


def check_transcript_publish_dates() -> None:
    if not TRANSCRIPT_PUBLISH_DATES.exists():
        fail(f"missing transcript publish-date evidence: {TRANSCRIPT_PUBLISH_DATES}")
    manifest = load_json(TRANSCRIPT_DIR / "manifest.json")
    ok_ids = {row["id"] for row in manifest if row.get("status") == "ok"}
    date_rows = load_json(TRANSCRIPT_PUBLISH_DATES)
    dated_ids = {
        row["id"]
        for row in date_rows
        if row.get("status") == "ok" and (row.get("date_published") or row.get("upload_date"))
    }
    missing = sorted(ok_ids - dated_ids)
    allowed_missing = {"e32UtIo0C3c", "erlOBf7auSE"}
    if set(missing) != allowed_missing:
        fail(f"missing publish dates for ok transcript videos: {', '.join(missing)}")
    if len(dated_ids & ok_ids) != 284:
        fail(f"expected publish dates for 284 ok transcript videos, found {len(dated_ids & ok_ids)}")


def main() -> None:
    check_counts()
    check_evidence_refs()
    check_dated_development_map_refs()
    check_final_synthesis_current()
    check_practice_playbook_current()
    check_goal_completion_audit()
    check_target_index_current()
    check_high_value_fallback_retry()
    check_no_caption_provider_recon()
    check_provider_routing_matrix()
    check_final_fallback_online_provider_retry()
    check_final_members_only_boundary()
    check_final_members_only_export_queue()
    check_transcript_gap_priority()
    check_manual_provider_queue()
    check_noiz_provider_recon()
    check_youtube_to_text_provider_recon()
    check_wayin_youvideototext_recon()
    check_api_and_free_tool_provider_recon()
    check_youtldr_tubetranscriptgenerator_recon()
    check_youtldr_provider_outputs()
    check_asr_priority_ids()
    check_ytdlp_route_probes()
    check_transcript_publish_dates()
    print("terry research archive check passed")


if __name__ == "__main__":
    main()

# Final Members-Only Export Queue

## Metadata

- Target: Terry Chen YouTube channel
- Artifact type: Manual/authenticated export queue for the last five fallback videos
- Generated: 2026-07-14
- Constraint: Use YouTube links or browser-visible transcript/export text only. Do not download video/audio and do not run local ASR.
- Companion evidence: `2026-07-14-final-members-only-boundary.md`
- CSV companion: `2026-07-14-final-members-only-export-queue.csv`

## Why This Queue Exists

The normal manual/provider queue is now empty because the remaining videos no longer score as Tier 1 investment transcript gaps. However, the original collection objective still asks for all historical spoken-content text. This file preserves the final five as a separate access-rights queue.

The current blocker is not provider breadth. The user's Chrome session shows every remaining video as YouTube `UNPLAYABLE` members-only content with no exposed `captionTracks`. Harku's live `/api/youtube-transcript/preview` route returned `youtube_link_restricted` for `rIupufjIp5M` and then guest/auth/upload limits for the other four.

## Allowed Routes

Use one of these only if the user explicitly has or grants the required access:

1. Open the video in a channel-member YouTube session and copy/export any browser-visible transcript text if YouTube or an extension exposes it.
2. Use the Chrome Web Store extension [YouTube Members Transcript](https://chromewebstore.google.com/detail/youtube-members-transcrip/eldojhncebnjebecpfnbanacofbnfgmk) only after explicit user approval to install/use it. Its Chrome Web Store listing says it extracts transcripts from members-only and subscriber-only videos, works with membership content, and can copy or download `.txt` locally in the browser.
3. Use authenticated NoteGPT, Harku, AI Video Summarizer, TubeTranscript.com Pro AI, or another provider only if it returns transcript text from the YouTube link alone.
4. Accept user-provided manual transcript text copied from a playable members-only page or provider export.

## Disallowed Routes

- Do not download YouTube video/audio.
- Do not run local ASR.
- Do not use a provider flow that requires uploading a locally downloaded media file unless the user explicitly approves a separate route.
- Do not install a browser extension without explicit user approval.

## Queue

| Rank | Priority | Video | Title | Research value | Current blocker | Import filename |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | highest remaining research value | [sK-IzrpapTo](https://www.youtube.com/watch?v=sK-IzrpapTo) | 開箱我買的房車，公開價格，沒錯我之後就住這 | Real-estate-adjacent operating asset / RV living cost evidence; useful for wealth-development and ordinary-person housing optionality analysis. | YouTube `UNPLAYABLE` members-only; no `captionTracks`. | `sK-IzrpapTo.member-export.txt` |
| 2 | low research value context | [9Ecx6g8ez1k](https://www.youtube.com/watch?v=9Ecx6g8ez1k) | 當我以為我是絕命毒師 | Low direct investment value; preserve for completeness. | YouTube `UNPLAYABLE` members-only; no `captionTracks`. | `9Ecx6g8ez1k.member-export.txt` |
| 3 | low research value context | [DcXyt4C-07E](https://www.youtube.com/watch?v=DcXyt4C-07E) | 開箱不丹 Paro 最有特色的 五星級 傳統宮殿飯店 | Travel / lifestyle context; low direct investment value except for Bhutan context. | YouTube `UNPLAYABLE` members-only; no `captionTracks`. | `DcXyt4C-07E.member-export.txt` |
| 4 | low research value context | [FusQOi4BGYw](https://www.youtube.com/watch?v=FusQOi4BGYw) | 越南來都來了 | Travel / lifestyle context; low direct investment value. | YouTube `UNPLAYABLE` members-only; no `captionTracks`. | `FusQOi4BGYw.member-export.txt` |
| 5 | low research value context | [rIupufjIp5M](https://www.youtube.com/watch?v=rIupufjIp5M) | 各位觀眾 | Unknown short members-only/context video; low direct investment value until text is available. | YouTube `UNPLAYABLE` members-only; no `captionTracks`; Harku returned `youtube_link_restricted`. | `rIupufjIp5M.member-export.txt` |

## Import Path

If text is later exported, put the files in a temporary directory with the listed filenames, then run:

```sh
python3 scripts/import_terry_asr_transcripts.py <input_dir> \
  --source-label "Manual members-only transcript export" \
  --engine "manual-members-only-export" \
  --confidence "manual/provider transcript export from authenticated members-only access; requires spot-checking"
```

After import, regenerate derived artifacts:

```sh
python3 scripts/analyze_terry_youtube_corpus.py
python3 scripts/prioritize_terry_transcript_gaps.py
python3 scripts/extract_terry_investment_evidence_ledger.py
python3 scripts/synthesize_terry_investment_report.py
python3 scripts/export_terry_manual_provider_queue.py
python3 scripts/verify_terry_research_archive.py
```

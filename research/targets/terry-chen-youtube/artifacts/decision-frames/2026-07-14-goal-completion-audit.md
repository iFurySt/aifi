# Terry YouTube Research Goal Completion Audit

## Metadata

- Target: Terry Chen YouTube channel
- Artifact type: Requirement-by-requirement completion audit
- Generated: 2026-07-14
- Current status: Not complete
- Scope: Audit against the user's full objective: collect historical video links, extract YouTube-link-based transcript text as raw data, then answer four investment/learning questions.

## Current Evidence State

| Requirement | Evidence | Status |
| --- | --- | --- |
| Collect Terry's historical public YouTube video links | `evidence/media/youtube-video-index.json` contains 291 public channel video records. `scripts/verify_terry_research_archive.py` checks the 291-video count. | Proven for the current public channel index snapshot. |
| Extract spoken-content text from YouTube links, not local video/audio download | `evidence/media/transcripts/manifest.json` has 286 `ok` useful transcript captures and no partial captures. Provider records document URL-only routes including YouTube-visible transcripts, AI Video Summarizer, YouTLDR, TubeTranscript.com Pro AI, and direct-caption providers. | High coverage but not complete: 5 public videos still lack useful transcript text. |
| Preserve raw text as source data | Raw transcript `.txt` and provider `.json` files are stored under `evidence/media/transcripts/`. Provider failure and retry records are stored under `evidence/media/` and `evidence/media/provider-probes/`. | Proven for the 286 useful captures. |
| Analyze Terry's investment portfolio over time | Main answer: `artifacts/memos/2026-07-14-terry-investment-synthesis.md`, section `## 1. Terry 的投资组合情况`. Supporting maps: `2026-07-14-holding-claim-boundaries.md`, `2026-07-14-dated-investment-development-map.md`, `2026-07-14-relative-wealth-timeline.md`. | Substantively covered, with explicit uncertainty around exact realized returns, taxes, leverage, and fully dated position-size changes. |
| Analyze Terry's wealth / investment development path | Main answer: `2026-07-14-terry-investment-synthesis.md`, section `## 2. Terry 的财富/投资发展路径`. Supporting map: `2026-07-14-dated-investment-development-map.md`. | Substantively covered from transcript-backed phases, but not exhaustive because 5 videos lack text and exact return/tax/leverage details are not fully reconstructable. |
| Produce an ordinary-person portfolio translation | Main answer: `2026-07-14-terry-investment-synthesis.md`, section `## 3. 普通人可迁移的投资组合方案`; earlier playbook: `2026-07-13-practice-derived-investor-playbook.md`. | Covered as an educational template, not individualized advice. |
| Produce a practice-first investment/finance learning plan | Main answer: `2026-07-14-terry-investment-synthesis.md`, section `## 4. Practice-First Learning Plan`; supporting practice map: `2026-07-14-dated-investment-development-map.md`. | Covered as a staged practice plan derived from transcript evidence. |

## Remaining Transcript Gaps

The fallback queue remains 5 videos:

| Video | Current boundary |
| --- | --- |
| `9Ecx6g8ez1k` | YouTLDR provider-side `whisper` path completed but hit a members-only YouTube acquisition message; 0 characters. |
| `DcXyt4C-07E` | Members-only YouTLDR provider message for `Loyal Hackbear` or higher; 0 characters. |
| `FusQOi4BGYw` | Members-only YouTLDR provider message; 0 characters. |
| `sK-IzrpapTo` | Members-only YouTLDR provider message; 0 characters. |
| `rIupufjIp5M` | Members-only / `USER_RESTRICTED_ACCESS` boundary across current providers; 0 useful characters. |

These gaps are documented in:

- `evidence/media/asr/queue.json`
- `evidence/media/2026-07-14-final-fallback-online-provider-retry.md`
- `evidence/media/2026-07-14-provider-routing-matrix.md`
- `evidence/media/provider-probes/youtldr-manifest.json`

## Latest URL-Only Provider Recheck

After the user pointed to NoteGPT-style online subtitle downloaders, the latest browser pass searched for and tested additional current URL-only providers against the remaining fallback sample `rIupufjIp5M`. No video/audio was downloaded locally, and no local ASR was run.

| Provider | Observed result | Completion impact |
| --- | --- | --- |
| HappyScribe | Accepted the YouTube URL through its public `Paste link` route and returned HTTP 201 from `https://www.happyscribe.com/public/anonymous_upload/url_imports`, but no transcript text, editor result, or export appeared in the observed window. | Changed-state/manual export candidate, not solved raw text. |
| Evernote | Submitted the URL through `YouTube Video to Text with AI`; `https://public.evernote.com/transcription/v1/create-from-url` returned HTTP 500 and the page suggested trying again or downloading/uploading the file. | Not usable under the no-download constraint for this sample. |
| Maestra | Public `Get Transcript` form accepted the URL but stayed disabled/waiting with no transcript API or visible text. | Manual/trial candidate only. |
| Vizard | Public page exposed sign-in/sign-up/workspace actions but no unauthenticated YouTube URL transcript result. | Manual/authenticated candidate only. |
| Dubverse | Accepted the URL and redirected to `webapp.dubverse.ai/?user_type=sub&wlink=...`, then showed login before any transcript output. | Manual/authenticated candidate only. |
| Proactor | Returned a Cloudflare access-control page before URL submission. | Access-control blocked in the current environment. |
| BibiGPT | Confirmed `https://bibigpt.co/api/extract-url?url=...` direct route. Q59 worked as a positive control, but the final eight returned either zero text or short 345/129/24-character partials; no `audioUrl` was downloaded. | Direct API cross-check, not solved raw text. |
| ScreenApp / YT Scribe | Confirmed `POST https://api.screenapp.io/v2/files/transcripts/youtube`. Q59 returned one WEBVTT transcript / 31,971 characters, but the final eight returned HTTP 500/404 errors or timed out. | Direct-caption cross-check only. |
| TubeScript | Confirmed `/api/transcript/cache` and `POST /api/transcript` with an AI fallback path. `rIupufjIp5M` returned members-only `VIDEO_UNAVAILABLE`; other probes returned `AI_FALLBACK_CAPACITY_EXHAUSTED`. | Changed-state retry candidate, not current raw text. |
| YouTubeTranscriptFree | Confirmed `https://youtubetranscriptfree.com/api/transcript/tracks` direct-caption route and `/api/transcript/ai/submit` AI route. Q59 remote timedtext yielded 755 segments / 8,529 characters; final fallback probes returned no captions, service-unavailable states, or the same short fragments. AI submit returned HTTP 401 `login_required`. | Direct-caption cross-check plus authenticated AI candidate. |
| NoteLM.ai | Confirmed `https://www.notelm.ai/api/youtube-video-info` and `/api/youtube-transcript` route shape from frontend chunks, but direct API probes timed out for Q59 and early fallback samples. | Changed-state/direct-caption candidate only. |
| FreeScribe / GetTheScript | Confirmed `https://freescribe.app/api/video-info` and `/api/transcript`. Q59 metadata returned, `rIupufjIp5M` returned HTTP 500 `No transcript found for this YouTube video`, and `erlOBf7auSE` returned only 13 short segments. | Direct-caption/partial cross-check only. |
| AIYouTubeTranscript | Confirmed `https://aiyoutubetranscript.com/api/transcript/segments?url=...&language=zh`. Five fallback videos returned HTTP 404 `SUBTITLES_NOT_AVAILABLE`; the other three returned only 355/103/3 transcript characters. | Direct-caption cross-check only. |
| SpeechGen | Confirmed `https://speechgen.io/index.php?r=transcribe/uploadYT&lang=en` session-bound cloud-task route. Q59 and `erlOBf7auSE` created tasks; `rIupufjIp5M` returned `Failed to convert the file - extrakt err1`; `erlOBf7auSE` preview repeated the short fragment, and full transcription returned `onlyPremium`. | Real URL cloud-transcription candidate, but anonymous full text is premium-gated. |
| VexaScribe | Confirmed `POST https://tub3g7bkx3.execute-api.eu-west-2.amazonaws.com/Public/YouTubeTranscript`. Q59 returned `ok: true`, 189 segments, and a 200-word preview; final fallback probes returned `rate_limited`, upstream errors, or only the short `xeEd1DEizNE` intro/music partial. | Direct-caption preview cross-check only. |
| NovaScribe | Confirmed sibling `POST https://tub3g7bkx3.execute-api.eu-west-2.amazonaws.com/Public/VideoTranscript`. Probes returned HTTP 429 `rate_limited` after the Vexa run, and page copy matches the same 200-word preview / signed fallback boundary. | Same provider-family boundary as VexaScribe. |
| VOMO | Confirmed guest-token URL route through `https://rapi.vomo.ai/gst/gen_tk` and `https://rapi.vomo.ai/gst/transcribe/youtube`. Q59 returned a 1,003-character success payload; five fallback videos returned `Subtitle fetch failed`, and three returned only 358/137/28-character partials. | URL-only cross-check, not useful raw text for the final eight. |
| VocaScript | Public page advertises YouTube URL transcription with guest limits, but the inspected HTML/scripts did not expose a repeatable anonymous API route; page copy points failed URL cases toward browser extension or file upload fallback. | Manual/browser candidate only. |
| BlazeScribe | Public page advertises free YouTube transcription, but loaded chunks exposed app/Supabase infrastructure and marketing routes without a confirmed unauthenticated YouTube URL-to-transcript endpoint. | Manual/authenticated candidate only. |
| TubeTranscript.com Pro AI | Confirmed `POST https://yt-to-text.com/api/p/v1/GetTranscripts` with `{"video_id":"<id>"}` and `X-App-Version: tubetranscript`. Q59 positive control returned `READY`, 709 segments, and 9,086 characters. The route recovered `erlOBf7auSE` with 287 segments / 4,549 characters, `xeEd1DEizNE` with 267 segments / 4,961 characters, and `e32UtIo0C3c` with 248 segments / 3,737 characters. The remaining member/restricted sample returned HTTP 403 `USER_RESTRICTED_ACCESS`. | Earlier coverage improved to 285/290 without local download or local ASR; 5 public videos still lacked useful text. |
| NoteGPT latest-video check | Browser-origin `GET https://notegpt.io/api/v2/video-transcript?platform=youtube&video_id=JzIfrGMeAFw` returned the newest public video transcript from a YouTube link only. | Coverage improved to 286/291 without local download or local ASR. |
| Final access-rights check | The remaining five fallback videos were opened in the user's Chrome session. YouTube returned `UNPLAYABLE` members-only status and no caption tracks for all five. Harku's URL-only preview route returned `youtube_link_restricted` for `rIupufjIp5M` and then guest/auth/upload limits for the others. | Confirms the remaining blocker is access rights / membership, not lack of provider breadth. |
| Final members-only export queue | `2026-07-14-final-members-only-export-queue.md` lists the five access-rights-blocked videos, allowed authenticated/manual routes, disallowed download/local-ASR routes, and import filenames for later transcript text. It includes the Chrome Web Store `YouTube Members Transcript` extension only as an explicit-approval route. | Makes the remaining handoff executable without redefining the goal as complete. |

This recheck strengthens the provider-boundary evidence and, after the later TubeTranscript.com Pro AI and NoteGPT latest-video passes, improves coverage to 286 useful transcripts. It still does not complete the full goal because 5 member/restricted videos remain unsolved in the current unauthenticated session.

## Completion Decision

Do not mark the full goal complete yet.

The analysis deliverables are usable and evidence-backed, but the original objective asks to get the spoken-content text for Terry's historical videos. Current evidence proves 286 useful captures out of 291 public links, with 5 unresolved fallback videos. The next completion path is not repeating the same failed provider state. It requires channel-member access, authenticated/manual export for members-only or gated providers, or a genuinely new YouTube-link-only provider that can legally return usable text for the remaining 5 without local download or local ASR.

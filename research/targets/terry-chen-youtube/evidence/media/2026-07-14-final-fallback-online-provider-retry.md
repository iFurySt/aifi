# Final Fallback Online Provider Retry

## Metadata

- Target: Terry Chen YouTube channel
- Artifact type: Online provider retry record for the last 10 fallback videos
- Generated: 2026-07-14
- Constraint: URL-only online transcript/subtitle extraction. No video/audio download and no local ASR were used.
- Provider candidates tested in this pass:
  - User-supplied NoteGPT detail page: `https://notegpt.io/detail?id=rF5thvdRjnE&type=1&utm_source=youtube-subtitle-downloader&epl=1`
  - DownloadYoutubeSubtitles.com browser route
  - AI Video Summarizer browser / IndexedDB route
  - Supadata public free tool probe
  - Proactor link-to-text page
  - TubeTranscript.com browser route
  - VideoTranscriber.ai browser route and frontend chunk inspection
  - Zenplay.app browser route and frontend chunk inspection
  - KitsRun YouTube video summarizer page and frontend JS inspection
  - VideoToWords SEO page and dashboard route
  - RecCloud YouTube Transcript Generator browser route and task API inspection
  - AskSia YouTube transcription page
  - AudioConverter.ai AI YouTube Transcript Generator browser route and signed API inspection
  - GStory Auto Subtitle Generator browser route
  - BibiGPT YouTube Transcript Generator feature page
  - BibiGPT `/api/extract-url` direct route
  - ScreenApp / YT Scribe direct API
  - TubeScript cache/transcript API
  - YouTubeTranscriptFree direct-caption and AI-transcription APIs
  - NoteLM.ai YouTube Transcript Generator API
  - FreeScribe / GetTheScript API
  - AIYouTubeTranscript `/api/transcript/segments`
  - SpeechGen YouTube transcript cloud-task route
  - VexaScribe and NovaScribe preview APIs
  - VOMO guest YouTube transcript API
  - VocaScript and BlazeScribe page/API inspection
  - OpusClip YouTube Transcript Generator page
  - Riverside YouTube Transcript Generator embedded tool
  - AI Video Summarizer YouTube Subtitle Generator retry
  - YouTLDR anonymous URL ingestion changed-state retry
  - Fresh current-provider search after the user supplied a NoteGPT example: HappyScribe, Maestra, Evernote, Vizard, Dubverse, and Proactor
  - Harku YouTube Transcript Generator and direct YouTube page-state boundary check for the final five videos

## Result

Two additional fallback videos were recovered through AI Video Summarizer:

| Video | Title | Provider | Result |
| --- | --- | --- | --- |
| `c24laHz3Vmo` | 戰爭開打｜該割肉了？ | AI Video Summarizer | `ok`, 39 subtitle segments |
| `IXrpfHPqYfg` | 在家工作的軟體工程師都在幹嘛？ | AI Video Summarizer | `ok`, 63 subtitle segments |

After rebuilding the archive, the later TubeTranscript.com Pro AI changed-state pass raised historical coverage to 285 videos, and the subsequent NoteGPT latest-video pass raised current coverage to 286 videos. No provider capture remains `partial`, and the fallback queue has 5 videos.

## Provider Notes

### NoteGPT

The user-provided NoteGPT detail URL and the current public transcript-generator page were rechecked after the user pointed out that link-based online subtitle tools should be preferred over local ASR. No video/audio was downloaded locally, and no local ASR was run.

Frontend inspection of `https://notegpt.io/youtube-transcript-generator` found real public routes:

- `GET /api/v2/video-transcript?platform=youtube&video_id=<id>`
- `GET /api/v2/video-transcript-v2?platform=youtube&video_id=<id>`
- `GET/POST /api/v2/transcript-generate`
- `GET /api/v2/media-status`
- related media conversion/status routes

Browser-context API checks showed that NoteGPT is a useful direct-caption cross-check when transcripts are available:

| Video | Result |
| --- | --- |
| `Q59J5roE5lM` | `/api/v2/video-transcript` returned HTTP 200 / `code: 100000`, title metadata, `language_code: zh`, and a full transcript payload. |
| `rF5thvdRjnE` | The user's detail page local state contained a complete Terry transcript for "我在Threads被炎上了"; this video was already covered in the archive by `youtube_transcript_panel`, so it was treated as provider validation rather than a new canonical transcript. |
| `9Ecx6g8ez1k` | `/api/v2/video-transcript` returned HTTP 200 / `code: 100000`, `message: "no transcript"`, `duration: "573"`. |
| `DcXyt4C-07E` | Same `no transcript` boundary, `duration: "337"`. |
| `FusQOi4BGYw` | Same `no transcript` boundary, `duration: "1214"`. |
| `sK-IzrpapTo` | Same `no transcript` boundary, `duration: "529"`. |
| `rIupufjIp5M` | Same `no transcript` boundary, `duration: "154"`. |

The v2 route returned `login expired` in the current browser state. Direct detail-page navigation for `rIupufjIp5M` recognized the video but showed the authenticated/quota boundary:

- `The transcription limit has been reached. Please log in and try again.`

Decision: classify NoteGPT as a confirmed URL-only direct-caption provider and manual/authenticated no-caption candidate. It is useful for cross-checking videos with exposed transcripts, but it did not solve the remaining five member/restricted/no-transcript hard cases in the current free/browser state.

### Final YouTube Page-State Check

The final five fallback videos were opened in the user's Chrome session through OBU. YouTube itself returned `ytInitialPlayerResponse.playabilityStatus.status: "UNPLAYABLE"` for all five and exposed no `captionTracks`.

| Video | Browser page state |
| --- | --- |
| `9Ecx6g8ez1k` | Members-only; join-channel message; no captions. |
| `DcXyt4C-07E` | Members-only; Loyal Hackbear or higher; no captions. |
| `FusQOi4BGYw` | Members-only; Loyal Hackbear or higher; no captions. |
| `sK-IzrpapTo` | Members-only; Loyal Hackbear or higher; no captions. |
| `rIupufjIp5M` | Members-only; join-channel message; no captions. |

Decision: the remaining five are access-rights blocked in the current browser state, not merely missed by one transcript provider.

### Harku

Harku was tested after a fresh search for current YouTube-link AI transcript tools. Its public page exposed a real browser-origin route:

- `POST https://harku.io/api/youtube-transcript/preview`

For `rIupufjIp5M`, the route returned HTTP 403 `youtube_link_restricted` and the UI showed `This YouTube link is restricted or unavailable. Upload the audio/video file for the most reliable result.` The other four final fallback URLs returned HTTP 429 `guest_new_url_daily_limit` after the first probe, with `authRequired: true` and `uploadSuggested: true`.

Decision: Harku is a real URL-only no-caption candidate for supported videos, but it does not solve the final five in the current session. Its upload recommendation is out of scope under the user's no-download/no-local-ASR constraint.

### DownloadYoutubeSubtitles.com

The browser route can render subtitle download links after its Turnstile-protected page flow. It is useful as a direct-caption cross-check, but it did not solve the remaining hard cases:

| Video | Result |
| --- | --- |
| `9Ecx6g8ez1k` | Page returned `No Subtitles found`; reason says members-only subtitles are not accessible. |
| `DcXyt4C-07E` | Same members-only / no accessible subtitles result. |
| `FusQOi4BGYw` | Same members-only / no accessible subtitles result. |
| `sK-IzrpapTo` | Same members-only / no accessible subtitles result. |
| `erlOBf7auSE` | Generated English auto-caption links, but TXT output was only a 399-character partial offer-decline fragment. |
| `e32UtIo0C3c` | Generated English auto-caption links, but TXT output was only `[Music] ... bye`. |
| `xeEd1DEizNE` | Browser route stalled at loading / direct download attempts were not reliable enough to treat as text. |

Decision: use for manual/browser cross-checks when a video has accessible captions; do not rely on direct curl responses because the site may return HTML, rate-limit messages, or Turnstile states.

### AI Video Summarizer

AI Video Summarizer remained the only online provider in this pass that recovered additional usable hard-case text from a YouTube link. It also produced several partial/error states that should not be treated as solved:

| Video | Result |
| --- | --- |
| `c24laHz3Vmo` | `ok`, 39 segments. |
| `IXrpfHPqYfg` | `ok`, 63 segments. |
| `9Ecx6g8ez1k` | Timed out / still `AI Generation in Progress`. |
| `DcXyt4C-07E` | Timed out / still `AI Generation in Progress`. |
| `FusQOi4BGYw` | Timed out / still `AI Generation in Progress`. |
| `sK-IzrpapTo` | Timed out / still `AI Generation in Progress`. |
| `rIupufjIp5M` | Timed out / still `AI Generation in Progress`. |
| `erlOBf7auSE` | Only 13 subtitle segments, matching the short offer-decline partial; not enough for full coverage. |
| `xeEd1DEizNE` | Only 8 segments, mostly intro / music markers; not enough for full coverage. |
| `e32UtIo0C3c` | Classified as mostly music / instrumental; no usable spoken transcript. |

A follow-up test on the current `Free YouTube Subtitle Generator` page submitted `https://www.youtube.com/watch?v=rIupufjIp5M`. The page accepted the YouTube link, opened `https://aivideosummarizer.io/detail/?id=1ytm7z2`, embedded the YouTube player, and started backend polling through:

- `https://api.aivideosummarizer.io/api/v2/app/tr/platform`
- `https://api.aivideosummarizer.io/api/app/task/check_status?task_id=299e1c2c07024c5999833d7862166c0a&request_from=30&origin_from=15ee19731892b3f0`

After several minutes, direct status checks still returned `{"code":200,"message":"success","data":{"status":1,"message":""}}`, and the page remained at `AI Generation in Progress`. No transcript text, subtitle rows, or exportable TXT/SRT output was exposed in the observed window.

Decision: keep AI Video Summarizer as the top browser/manual hard-case provider, but preserve quality thresholds so partial or mostly-music outputs remain in the fallback queue.

### Supadata

Supadata's public free page was tested as a URL-only transcript generator. The page accepted input but the browser submission did not produce a transcript request/result in the current session; the button entered a disabled state with no usable output.

Decision: keep as API/manual candidate rather than a current automated source.

### Proactor

Proactor's public link-to-text converter was tested because search results describe it as a URL-to-text route. The current browser session could not reach the tool: the site returned a Cloudflare access-control block before any YouTube URL could be submitted.

Decision: keep as a blocked no-caption candidate; do not spend batch time on it unless the access-control state changes.

### TubeTranscript.com / TubeTranscript Pro AI

TubeTranscript.com was tested as another current online YouTube-link transcript generator. The page exposes a basic subtitle request to `https://yt-to-text.com/api/v1/Subtitles`; a later changed-state pass made the PRO/AI route `https://yt-to-text.com/api/p/v1/GetTranscripts` usable with body `{"video_id":"<id>"}` and `X-App-Version: tubetranscript`. No video/audio was downloaded locally, and no local ASR was run.

| Video | Result |
| --- | --- |
| `Q59J5roE5lM` | Positive control returned `READY`, 709 segments, and 9,086 characters. |
| `erlOBf7auSE` | PRO/AI route returned `READY`, 287 segments, and 4,549 characters. |
| `xeEd1DEizNE` | PRO/AI route returned `READY`, 267 segments, and 4,961 characters. |
| `e32UtIo0C3c` | PRO/AI route returned `READY`, 248 segments, and 3,737 characters. |
| `9Ecx6g8ez1k` | HTTP 403 `USER_RESTRICTED_ACCESS`. |
| `DcXyt4C-07E` | HTTP 403 `USER_RESTRICTED_ACCESS` / member-restricted boundary. |
| `FusQOi4BGYw` | HTTP 403 `USER_RESTRICTED_ACCESS` / member-restricted boundary. |
| `sK-IzrpapTo` | HTTP 403 `USER_RESTRICTED_ACCESS` / member-restricted boundary. |
| `rIupufjIp5M` | HTTP 403 `USER_RESTRICTED_ACCESS`; no usable transcript text. |

Decision: classify TubeTranscript.com Pro AI as a proven URL-only hard-case unlocker for non-member restricted failures. It recovered 3 of the final 8 fallback videos and improved then-current coverage to 285 videos, but it does not bypass member/restricted access. Current 286-video coverage also includes the later NoteGPT capture for newest public video `JzIfrGMeAFw`.

### VideoTranscriber.ai

VideoTranscriber.ai was tested because current search results and its public page claim YouTube-link support and no-subtitle transcription. The page rendered a Link mode with a URL input. The `rIupufjIp5M` YouTube URL enabled the Submit button, but browser submission did not produce a transcript job, result page, or visible transcript payload in the current session.

Frontend inspection found upload-oriented API routes such as `/api/v1/upload/sign-url`, `/api/v1/upload/multi/init`, `/api/v1/upload/multi/complete`, and `/api/v1/share`. The inspected route did not expose a repeatable no-login YouTube URL-to-transcript job endpoint.

Decision: keep as a no-caption candidate with a blocked or non-repeatable link flow. Do not batch it unless a visible job id, transcript payload, or authenticated export route is confirmed.

### Zenplay.app

Zenplay's YouTube transcript generator page was tested because its FAQ says that when no official subtitles exist it uses speech-to-text AI. The page accepted `rIupufjIp5M` and enabled `Extract Text`, but clicking the button did not produce a transcript, error message, or network request to a transcript API. The page removed the input area and stayed on static marketing content.

Next.js chunk inspection did not find a usable transcript-generation API route in the loaded frontend files.

Decision: treat as marketing/unverified for this archive until the page exposes a real transcript result or backend request.

### KitsRun

KitsRun's YouTube video summarizer page was tested because its current public copy claims no-subtitle support. The page rendered a YouTube URL input, but its loaded JavaScript only handled ratings, platform download links, and UI behavior. No summarization, transcription, or YouTube URL processing endpoint was present in the inspected frontend script.

Decision: not a usable raw-text provider in the current state.

### VideoToWords

VideoToWords was tested because its public page claims YouTube-link transcription without pre-existing subtitles and exports TXT/SRT/PDF/DOCX/VTT. The SEO page did not expose a direct URL input. Its `Try` / dashboard route redirected to `/login?from=/dashboard`, requiring sign-in before a YouTube link can be submitted.

Decision: keep as a manual/authenticated candidate. It may be useful if the user logs in and exports transcript text, but it is not a no-login batch source.

### RecCloud

RecCloud's YouTube Transcript Generator was tested because the current public page explicitly claims URL-only YouTube transcription and no-caption support. The page has a real `Paste a YouTube link here` input and a `Show My Transcript` button, and it created cloud tasks through:

- `POST https://gw.aoscdn.com/app/reccloud/v2/open/ai/av/subtitles/recognition/v2`
- `GET https://gw.aoscdn.com/app/reccloud/v2/open/ai/av/subtitles/recognition/v2/<task_id>`

The `rIupufjIp5M` fallback probe created task `22e7b810-41cd-46f5-9970-1239bbe094fc`, reached visible progress, then ended with `state: -1`, `progress: 100`, and `error: "get video info failed"`, with `subtitles: null`.

A Q59 positive-control probe created task `cc997f09-9a86-4d14-9e1b-4e66e4cc7fdd`. The status route identified the title, duration `1345`, and `has_subtitle: 1`, but it stayed at `state: 4`, `progress: 0`, and `subtitles: null` during the observed window. The progress endpoint returned `task id was not found`.

Decision: keep RecCloud as a real URL-only cloud-task candidate, but not a current text source. It needs a later changed-provider-state retry before batch use.

### AskSia

AskSia's YouTube transcription page was tested because its public copy claims YouTube URL transcription. The visible `Paste URL` button redirected to `https://www.asksia.ai/signup` and exposed Google/Microsoft/Apple/email sign-up options before any unauthenticated URL submission or transcript payload.

Decision: manual/authenticated candidate only.

### AudioConverter.ai

AudioConverter.ai's AI YouTube Transcript Generator was tested because the public page claims AI transcription from YouTube links even when captions are missing. It is a stronger candidate than ordinary direct-caption sites:

- The page exposed a YouTube URL input and parsed `rIupufjIp5M`.
- `GET /api/v1/transcriptions/url-info?url=<youtube-url>&type=3` returned title `各位觀眾`, duration `154`, and `youtube_has_subtitles: false`.
- Frontend inspection found the signed cloud transcription route `POST /api/v1/transcriptions/start`, followed by `GET /api/v1/transcriptions/status` and `GET /api/v1/transcriptions/get-transcript`.
- Replaying the site's signed payload shape for `rIupufjIp5M` reached the provider boundary but returned `code: 164005`, `message: "You have reached the daily limit. Please try again tomorrow."`

Decision: keep AudioConverter.ai as a high-value URL-only no-caption retry candidate after quota reset or authenticated browser access. It did not return raw text in the current session.

### GStory

GStory's Auto Subtitle Generator was tested because the page explicitly supports pasting a YouTube video URL. The page rendered `Paste your YouTube video URL here` plus an `Upload` button, and the `rIupufjIp5M` URL could be entered into the visible field.

Two submission attempts did not create a URL transcript task. The first script-set value was cleared by the front-end state. A second real typed-value attempt left the URL in the input, but clicking `Upload` still emitted only the local-upload analytics event `subtitle_upload_tick` with `ep.method=local`. No URL-task API, result page, login boundary, transcript text, or subtitle export appeared.

Decision: treat GStory as an unconfirmed browser/manual candidate. Its marketing page supports URL input, but the current route did not produce a link-based transcript job.

### BibiGPT

BibiGPT's YouTube Transcript Generator feature page was opened from current search results. The app route did not expose a usable visible form in the current browser state, but frontend inspection found the direct route:

- `GET https://bibigpt.co/api/extract-url?url=<youtube-url>`

A Q59 positive-control request returned metadata and a usable provider response, proving the API is real. Running the remaining eight fallback videos through the same URL-only route returned no useful new raw text:

| Video | Result |
| --- | --- |
| `9Ecx6g8ez1k` | `duration: 0`, `audioUrl: false`, `subtitlesArray: 0`, 0 transcript characters. |
| `DcXyt4C-07E` | `duration: 0`, `audioUrl: false`, `subtitlesArray: 0`, 0 transcript characters. |
| `FusQOi4BGYw` | `duration: 0`, `audioUrl: false`, `subtitlesArray: 0`, 0 transcript characters. |
| `sK-IzrpapTo` | `duration: 0`, `audioUrl: false`, `subtitlesArray: 0`, 0 transcript characters. |
| `rIupufjIp5M` | `duration: 0`, `audioUrl: false`, `subtitlesArray: 0`, 0 transcript characters. |
| `erlOBf7auSE` | `duration: 560`, `audioUrl: true`, 13 subtitle entries, 345 characters; still the short offer-decline partial. |
| `xeEd1DEizNE` | `duration: 508`, `audioUrl: true`, 8 subtitle entries, 129 characters; still intro/music-style partial text. |
| `e32UtIo0C3c` | `duration: 545`, `audioUrl: true`, 4 subtitle entries, 24 characters; not useful spoken coverage. |

No `audioUrl` result was downloaded or transcribed locally.

Decision: BibiGPT is now a confirmed URL-only direct API/cross-check route, but it did not solve the remaining eight fallback videos.

### ScreenApp / YT Scribe

ScreenApp's YT Scribe page exposes a real URL-only API in the loaded frontend component:

- `POST https://api.screenapp.io/v2/files/transcripts/youtube`
- Body shape: `{"url":"https://www.youtube.com/watch?v=<id>","languages":["zh"],"includeAutoGenerated":true}`

The Q59 positive control returned HTTP 200, one WEBVTT transcript, and 31,971 characters, proving the API works when caption tracks are accessible. The remaining fallback videos did not produce useful text:

| Video | Result |
| --- | --- |
| `9Ecx6g8ez1k` | HTTP 500, `Failed to download transcripts. The video may not have captions available or may be restricted.` |
| `DcXyt4C-07E` | HTTP 500, same caption/restriction error. |
| `FusQOi4BGYw` | HTTP 500, same caption/restriction error. |
| `sK-IzrpapTo` | Timed out after 25 seconds. |
| `rIupufjIp5M` | Timed out after 25 seconds. |
| `erlOBf7auSE` | HTTP 404, `No transcripts found for this video. The video may not have captions available.` |
| `xeEd1DEizNE` | HTTP 404, same no-transcripts message. |
| `e32UtIo0C3c` | HTTP 404, same no-transcripts message. |

Decision: useful as a direct-caption cross-check, not a hard-case unlocker for this final fallback set.

### TubeScript

TubeScript's public app exposed two relevant URL-only routes in its loaded Next.js chunk:

- `GET /api/transcript/cache?videoId=<id>&language=<lang>`
- `POST /api/transcript` with body `{"url":"https://www.youtube.com/watch?v=<id>","language":"zh","stream":true}` and an `x-fingerprint` header

Cache probes for tested ids returned cache misses. Direct transcript probes showed a provider boundary rather than raw text:

| Video | Result |
| --- | --- |
| `rIupufjIp5M` | HTTP 422 `VIDEO_UNAVAILABLE`, message says the video requires joining the channel for members-only content. |
| `erlOBf7auSE` | HTTP 503 `AI_FALLBACK_CAPACITY_EXHAUSTED`, message says AI fallback is temporarily at capacity. |
| `xeEd1DEizNE` | HTTP 503 `AI_FALLBACK_CAPACITY_EXHAUSTED`. |
| `e32UtIo0C3c` | HTTP 503 `AI_FALLBACK_CAPACITY_EXHAUSTED`. |
| Q59 positive control | Stream route returned text/event-stream but emitted `AI_FALLBACK_CAPACITY_EXHAUSTED` in the observed state. |

Decision: promising changed-state no-caption candidate because it has an AI fallback route, but the current provider state did not return text. Members-only videos remain blocked at provider acquisition.

### YouTubeTranscriptFree

YouTubeTranscriptFree's app exposes two relevant API paths:

- Direct caption track proxy: `POST https://youtubetranscriptfree.com/api/transcript/tracks` with body `{"videoId":"<id>","lang":"zh"}`
- AI no-caption transcription: `POST https://youtubetranscriptfree.com/api/transcript/ai/submit` with `X-Request-ID`

The direct-caption route passed the Q59 positive control: it returned a YouTube `api/timedtext` `baseUrl`, and fetching that remote caption XML yielded 755 segments and 8,529 characters. The remaining fallback videos did not improve:

| Video | Result |
| --- | --- |
| `9Ecx6g8ez1k` | `Service temporarily unavailable. Please try again.` |
| `DcXyt4C-07E` | `No transcript available for this video`. |
| `FusQOi4BGYw` | `Service temporarily unavailable. Please try again.` |
| `sK-IzrpapTo` | `Service temporarily unavailable. Please try again.` |
| `rIupufjIp5M` | `Service temporarily unavailable. Please try again.` |
| `erlOBf7auSE` | Intermittently returned an English timedtext `baseUrl`; fetched text was 25 segments / 357 characters, matching the existing short offer-decline partial. A later direct probe also returned `No transcript available for this video`. |
| `xeEd1DEizNE` | Intermittently returned an English timedtext `baseUrl`, but retry also returned `Service temporarily unavailable`; no useful full transcript was recovered. |
| `e32UtIo0C3c` | Returned an English timedtext `baseUrl`; fetched text was 7 segments / 27 characters: music markers and `bye`. |

The AI transcription endpoint returned HTTP 401 `login_required` for `rIupufjIp5M` and `erlOBf7auSE`, with message `Please sign in to use AI transcription`.

Decision: confirmed direct-caption cross-check and authenticated AI candidate, but not a no-login source for the remaining hard cases.

### NoteLM.ai

NoteLM's public page claims free no-signup transcript extraction and exposes real frontend routes:

- `POST https://www.notelm.ai/api/youtube-video-info`
- `POST https://www.notelm.ai/api/youtube-transcript`

The frontend calls `action: "list"` and then `action: "transcript"` when caption tracks are available. Direct API probes in the current environment timed out even for Q59 and for early fallback samples:

| Video | Result |
| --- | --- |
| `Q59J5roE5lM` | `/api/youtube-video-info` timed out; `/api/youtube-transcript` list timed out. |
| `9Ecx6g8ez1k` | Same timeout boundary. |
| `DcXyt4C-07E` | Same timeout boundary. |
| `FusQOi4BGYw` | Same timeout boundary before the batch was stopped. |

Decision: confirmed API-shaped direct-caption candidate, but not a reliable current batch source. NoteLM's own FAQ says the tool works when transcripts are available, including auto-generated captions, so it should not be treated as a no-caption unlocker without a successful hard-case response.

### FreeScribe / GetTheScript

FreeScribe's YouTube transcript page exposes URL-only routes in its frontend:

- `POST https://freescribe.app/api/video-info`
- `POST https://freescribe.app/api/transcript`

The route recognized some YouTube URLs and returned metadata or partial transcript segments, but it did not produce new useful final-fallback text:

| Video | Result |
| --- | --- |
| `Q59J5roE5lM` | `/api/video-info` returned title, duration, and platform, but `/api/transcript` timed out in the observed request. |
| `rIupufjIp5M` | `/api/video-info` timed out; `/api/transcript` returned HTTP 500 `No transcript found for this YouTube video`. |
| `erlOBf7auSE` | `/api/video-info` returned metadata; `/api/transcript` returned HTTP 200 with 13 segments / short partial text, matching the existing offer-decline fragment. |
| `e32UtIo0C3c` | Later request stalled before completion and was stopped to avoid a long batch hang. |

Decision: direct-caption/partial cross-check only in current state. It did not unlock the remaining eight.

### AIYouTubeTranscript

AIYouTubeTranscript's detail page exposes:

- `GET https://aiyoutubetranscript.com/api/transcript/segments?url=<youtube-url>&language=zh`

The first probe using `v=<id>` returned HTTP 400 `MISSING_URL`; using the correct `url` parameter produced repeatable final-fallback results:

| Video | Result |
| --- | --- |
| `9Ecx6g8ez1k` | HTTP 404 `SUBTITLES_NOT_AVAILABLE`. |
| `DcXyt4C-07E` | HTTP 404 `SUBTITLES_NOT_AVAILABLE`. |
| `FusQOi4BGYw` | HTTP 404 `SUBTITLES_NOT_AVAILABLE`. |
| `sK-IzrpapTo` | HTTP 404 `SUBTITLES_NOT_AVAILABLE`. |
| `rIupufjIp5M` | HTTP 404 `SUBTITLES_NOT_AVAILABLE`. |
| `erlOBf7auSE` | HTTP 200 with 13 subtitle entries, 3 transcript groups, and 355 transcript characters; still the same short partial. |
| `xeEd1DEizNE` | HTTP 200 with 4 subtitle entries, 2 transcript groups, and 103 transcript characters; still too short. |
| `e32UtIo0C3c` | HTTP 200 with 1 subtitle entry, 1 transcript group, and 3 transcript characters. |

Decision: confirmed direct-caption endpoint, not a no-caption or member-gated unlocker. It repeats the same partial boundary as YouTLDR/BibiGPT/YouTubeTranscriptFree.

### SpeechGen

SpeechGen's YouTube transcription page is a provider-side cloud transcription route, not a local-media route. The page posts a YouTube URL to:

- `POST https://speechgen.io/index.php?r=transcribe/uploadYT&lang=en`

The request body includes `videoId`, `url`, `language`, `model`, and `duration`. No media file was downloaded locally. The provider itself pulls/processes the URL.

Observed results:

| Video | Result |
| --- | --- |
| `Q59J5roE5lM` | Accepted the URL and returned `status: 1`, `fileStatus: 54`, a `fileId`, a `fileUrl`, duration `1346`, and a remaining balance value. |
| `rIupufjIp5M` | Returned `status: 2`, `Failed to convert the file - extrakt err1`; no task or text. |
| `erlOBf7auSE` | Accepted the URL and created `fileId: 22329`; polling later returned `status: 51`, `Segment transcribed`, with preview text only. The preview reproduced the short offer-decline fragment. |

Calling the full-transcription path `checkStatuses&runFull=1` for `erlOBf7auSE` returned `{"status":"onlyPremium","files":[]}`. Directly opening the `fileUrl` without the same PHP session returned HTTP 404, so the task is session-bound.

Decision: real URL-only provider-side cloud transcription candidate, but anonymous access only exposed preview text and full transcription is premium-gated. It did not add useful raw text to the archive.

### VexaScribe

VexaScribe's YouTube transcript page exposes a real public API:

- `POST https://tub3g7bkx3.execute-api.eu-west-2.amazonaws.com/Public/YouTubeTranscript`

The provider explicitly documents that the URL-paste path fetches YouTube caption tracks, while missing/wrong captions require signed-in upload to Whisper. No local media was downloaded or transcribed in this pass.

Observed URL-only results:

| Video | Result |
| --- | --- |
| `Q59J5roE5lM` | HTTP 200 `ok: true`, 189 segments, 200 words / 2,156 characters; message says this is only the first 200 words preview. |
| `9Ecx6g8ez1k` | HTTP 429 `rate_limited`, no text. |
| `DcXyt4C-07E` | HTTP 502 `upstream_error`, no text. |
| `FusQOi4BGYw` | HTTP 502 `upstream_error`, no text. |
| `sK-IzrpapTo` | HTTP 429 `rate_limited`, no text. |
| `rIupufjIp5M` | HTTP 502 `upstream_error`, no text. |
| `erlOBf7auSE` | HTTP 429 `rate_limited`, no text in this run. |
| `xeEd1DEizNE` | HTTP 200 `ok: true`, 8 segments, 25 words / 136 characters; still the same intro/music partial. |
| `e32UtIo0C3c` | HTTP 429 `rate_limited`, no text in this run. |

Decision: confirmed direct-caption preview API, not a final-eight unlocker. Long videos are truncated to preview without signup, and no new useful fallback text was recovered.

### NovaScribe

NovaScribe's page is a VexaScribe-branded deployment and exposes:

- `POST https://tub3g7bkx3.execute-api.eu-west-2.amazonaws.com/Public/VideoTranscript`

After the VexaScribe probe, this endpoint returned HTTP 429 `rate_limited` for Q59 and tested fallback samples (`rIupufjIp5M`, `erlOBf7auSE`, `xeEd1DEizNE`, and `e32UtIo0C3c`). Its page copy also says the free route is a 200-word preview and missing captions require signing in and uploading the video/audio to Whisper.

Decision: same provider family and same limitations as VexaScribe; keep as a changed-state/manual signup candidate, not current raw text.

### VOMO

VOMO's YouTube transcript page exposes a guest-token flow:

- `POST https://rapi.vomo.ai/gst/gen_tk`
- `POST https://rapi.vomo.ai/gst/transcribe/youtube` with `Authorization: Bearer <guest-token>` and body `{"video_url":"<youtube-url>"}`

The API returned a guest JWT and accepted YouTube URLs directly. It did not return useful new final-fallback text:

| Video | Result |
| --- | --- |
| `Q59J5roE5lM` | HTTP 200 `code: 200`, 1,003 characters; this is a preview-style excerpt rather than full Q59 transcript. |
| `9Ecx6g8ez1k` | HTTP 200 `code: 500`, `Subtitle fetch failed`, no text. |
| `DcXyt4C-07E` | HTTP 200 `code: 500`, `Subtitle fetch failed`, no text. |
| `FusQOi4BGYw` | HTTP 200 `code: 500`, `Subtitle fetch failed`, no text. |
| `sK-IzrpapTo` | HTTP 200 `code: 500`, `Subtitle fetch failed`, no text. |
| `rIupufjIp5M` | HTTP 200 `code: 500`, `Subtitle fetch failed`, no text. |
| `erlOBf7auSE` | HTTP 200 `code: 200`, 358 characters; same short offer-decline partial. |
| `xeEd1DEizNE` | HTTP 200 `code: 200`, 137 characters; same intro/music partial. |
| `e32UtIo0C3c` | HTTP 200 `code: 200`, 28 characters; music markers and `bye`. |

Decision: confirmed URL-only guest API and useful cross-check, but it behaves like a caption/preview route for this corpus and did not recover useful final-fallback text.

### VocaScript

VocaScript's public YouTube page says guest URL transcription is available with daily/hourly limits, but page inspection did not expose a repeatable no-login API route in loaded scripts. The only external script in the current HTML was analytics. The page copy says URL failures may require the browser extension or file upload fallback.

Decision: real manual/browser candidate, but no current scripted URL-only source until the app exposes the URL-processing action or a browser run produces a task id/result.

### BlazeScribe

BlazeScribe's public YouTube page was inspected because it advertises free YouTube transcription. Loaded chunks exposed general Supabase/app infrastructure and marketing routes, but no repeatable unauthenticated YouTube URL transcription endpoint was confirmed in this pass.

Decision: marketing/manual candidate only until a concrete URL job endpoint or browser result appears.

### OpusClip

OpusClip's `youtube-video-transcript` tool redirected to `/not-available` and displayed a country/region access-control message. The page did not expose a URL submission form in this environment.

Decision: access-control blocked; do not use for the current batch.

### Riverside

Riverside's public page claims a free no-sign-up YouTube transcript generator and embeds a real URL tool at `https://youtubetranscript.rsidetools.com/?origin=https%3A%2F%2Friverside.com`. The embedded tool rendered `Paste YouTube URL...` and `Generate Transcript`.

Submitting `https://www.youtube.com/watch?v=rIupufjIp5M` triggered a real URL workflow and called:

- `https://youtubetranscript.rsidetools.com/api/yt-transcript/transcript?connectionId=...`
- `https://youtubetranscript.rsidetools.com/api/yt-transcript/fetch-transcript`

The tool then redirected to `https://youtubetranscript.rsidetools.com/transcript-error` with `Oops! We had an error getting the transcript, feel free to try again.` No transcript text or downloadable subtitle output was exposed.

Decision: real URL-only tool, but not reliable for this no-caption fallback sample in the current session.

### YouTLDR changed-state retry

After the final fallback set had narrowed to 8 videos, YouTLDR was re-run as a changed-state URL-only retry. This route uses anonymous YouTube-link ingestion and provider-side cloud transcription; no video/audio file was downloaded locally and no local ASR was run.

The run collected `0/8` new transcripts:

| Video | Result |
| --- | --- |
| `9Ecx6g8ez1k` | Completed provider-side with `source: whisper` / `fallback: true`, but provider message said the video requires joining the channel for members-only content; 0 segments / 0 characters. |
| `DcXyt4C-07E` | Completed provider-side with `source: whisper` / `fallback: true`, but provider message said the video is available to channel members at `Loyal Hackbear` or higher; 0 segments / 0 characters. |
| `FusQOi4BGYw` | Same members-only provider message; 0 segments / 0 characters. |
| `sK-IzrpapTo` | Same members-only provider message; 0 segments / 0 characters. |
| `rIupufjIp5M` | Completed provider-side with `source: whisper` / `fallback: true`, but provider message said the video requires joining the channel for members-only content; 0 segments / 0 characters. |
| `erlOBf7auSE` | Completed, but returned only 13 segments / 345 characters, still the short offer-decline fragment and below the useful transcript threshold. |
| `xeEd1DEizNE` | Completed, but returned only 8 segments / 129 characters, still intro/music-style partial text and below the useful transcript threshold. |
| `e32UtIo0C3c` | Completed, but returned only 4 segments / 24 characters, below the useful transcript threshold. |

Decision: do not immediately loop these 8 on YouTLDR in the same provider state. The next useful route is authenticated/manual export or a genuinely new YouTube-URL-only provider that can handle members-only/no-caption acquisition better than the current candidates.

### Fresh current-provider search after NoteGPT example

After the user pointed to NoteGPT's link-based subtitle downloader style, a fresh web search and browser pass tested another set of current URL-only pages against the remaining fallback sample `rIupufjIp5M`. No video/audio was downloaded locally, and no local ASR was run.

| Provider | Browser result on `rIupufjIp5M` | Decision |
| --- | --- | --- |
| HappyScribe | Public page exposed `Paste link` and accepted `https://www.youtube.com/watch?v=rIupufjIp5M`; the browser sent `POST https://www.happyscribe.com/public/anonymous_upload/url_imports` and received HTTP 201 with an upload token, but no transcript text, export, result page, or editor output was exposed in the observed window. | Real URL-import candidate, but not a current raw-text source without a completed result/export. |
| Maestra | Public page exposed `#ytUrl` and `Get Transcript`; after submitting the YouTube URL, the input/buttons stayed disabled in a waiting state, and no transcript API request or visible transcript text appeared during the observed window. | Trial/manual candidate only until a finished transcript payload appears. |
| Evernote | Public `YouTube Video to Text with AI` page exposed a visible URL input and `Transcribe`; submission called `https://public.evernote.com/transcription/v1/create-from-url`, which returned HTTP 500. The page showed `We couldn't transcribe your video. Please try again or download the file and use the upload tab.` | Not usable under the no-download constraint for this fallback sample. |
| Vizard | Public `video-to-text` page had no unauthenticated YouTube URL input; visible actions were sign-in/sign-up or workspace-oriented. | Login/manual candidate only. |
| Dubverse | Public subtitle page accepted the YouTube URL and redirected to `https://webapp.dubverse.ai/?user_type=sub&wlink=...`; the web app showed a login page before any transcript/subtitle output. | Manual/authenticated candidate only. |
| Proactor | Public link-to-text page returned a Cloudflare access-control page before URL submission. | Access-control blocked in the current environment. |

Decision: these pages validate that link-based online providers exist and are worth testing, but none returned usable raw text for the remaining hard sample in this unauthenticated session. Keep HappyScribe as the most concrete changed-state candidate from this sub-pass because it accepted the URL and created a provider-side import record, but do not mark the sample solved without transcript text.

## Remaining Fallback Videos

The remaining fallback queue after this pass:

| Index | Video | Title | Current boundary |
| ---: | --- | --- | --- |
| 20 | `9Ecx6g8ez1k` | 當我以為我是絕命毒師 | Members-only / provider generation timeout. |
| 35 | `DcXyt4C-07E` | 開箱不丹 Paro 最有特色的 五星級 傳統宮殿飯店 | Members-only / provider generation timeout. |
| 43 | `FusQOi4BGYw` | 越南來都來了 | Members-only / provider generation timeout. |
| 46 | `sK-IzrpapTo` | 開箱我買的房車，公開價格，沒錯我之後就住這 | Members-only / provider generation timeout. |
| 162 | `rIupufjIp5M` | 各位觀眾 | Member/restricted provider boundary; TubeTranscript.com Pro AI returned `USER_RESTRICTED_ACCESS`. |

## Interpretation

The latest pass validates the user's direction: online link-based providers are the right path and can recover hard cases without local media download. The practical limitation is provider-specific access: direct-caption sites cannot extract unavailable/member-only captions, while cloud-transcript sites may quota-limit, time out, or return partial/music-only text.

For the current research synthesis, the five AI Video Summarizer / TubeTranscript.com Pro AI final recoveries can be used as raw source data. The remaining five should stay outside evidence-backed conclusions until a changed provider state, authenticated export, or another URL-only provider returns usable text.

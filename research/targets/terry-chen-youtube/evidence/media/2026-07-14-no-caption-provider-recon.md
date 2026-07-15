# No-Caption Link Provider Recon

## Metadata

- Target: Terry Chen YouTube channel
- Artifact type: Online no-caption / link-transcription provider reconnaissance
- Generated: 2026-07-14
- Constraint: Providers were tested through YouTube URL submission only. No video/audio file was downloaded locally and no local ASR was run.
- Positive control: `Q59J5roE5lM` - a Terry video already known to have extractable captions.
- Hard-case sample: `AFB5JNjXjsE` - a remaining high-value fallback video about protecting long-term investment positions.

## Summary

This pass focused on providers that explicitly advertise AI transcription from a YouTube link, including videos without subtitles. No new hard-case transcript text was recovered.

| Provider | Public claim / route | Q59 result | Hard-case result | Routing decision |
| --- | --- | --- | --- | --- |
| Transcriptly | `POST /api/youtube-ai/preview`, then `/api/youtube-ai/transcript` and `/api/youtube-ai/status?id=...`; page claims AI transcripts with no subtitles needed. | `500` - `No audio stream found in video formats`. | `500` - same error on `AFB5JNjXjsE`. | Real no-caption flow exists, but current service-side extraction is broken or blocked for Terry videos in this session. Recheck only if provider behavior changes. |
| Mictoo | `POST /api/youtube-captions`; page offers YouTube URL plus upload / Whisper workflow. | `200`, returned caption segments for Q59. | `200`, `noCaptions: true`; provider tells user to download audio with a free tool and upload for Whisper. | Good caption cross-check, but the no-caption route requires user-side audio download/upload, so it is below the current constraint. |
| AISEO | `POST /api/tools/youtube-summarizer` with `url`, `type: "video"`, `language`. | `500`, `X_API_KEY / NEW_FREE_TOOL_API_KEY / FREE_TOOL_API_KEY is not configured`. | Same `500` error on `AFB5JNjXjsE`. | Public tool route is currently misconfigured server-side. Do not batch. |
| VideoToWords | Public page claims YouTube URL transcription / no login. | Guessed API routes returned `404`. | Not tested beyond route discovery. | No confirmed public payload route in this pass. Keep as a browser/manual candidate only. |
| ScreenApp | Public page claims YouTube/Instagram link transcription. | Not run through API. | Not run through API. | Page points toward `/app` and local auth state; keep as later authenticated/browser candidate. |
| Whisper Web | Browser-based Whisper / WebGPU transcription; public pages emphasize local audio processing in the browser. | Not run as a provider positive control. | Not run. | Out of current route because it is local/browser ASR over media input, not repeatable YouTube-link-to-text extraction. |
| TranscribeAI | Public search result claims YouTube-to-text / Whisper / no signup. | Page probe timed out before any API route or positive-control run could be inspected. | Not run. | Candidate only after the page loads and a Q59-positive URL-submission endpoint is confirmed. |

## Raw Probe Details

### Transcriptly

Frontend bundle exposes:

- `POST https://transcriptly.org/api/youtube-ai/preview`
- `POST https://transcriptly.org/api/youtube-ai/transcript`
- `GET https://transcriptly.org/api/youtube-ai/status?id=<transcript-id>`

Observed requests:

```text
POST /api/youtube-ai/preview
payload: {"url":"https://www.youtube.com/watch?v=Q59J5roE5lM"}
result: HTTP 500 {"code":500,"message":"No audio stream found in video formats"}

POST /api/youtube-ai/preview
payload: {"url":"https://www.youtube.com/watch?v=AFB5JNjXjsE"}
result: HTTP 500 {"code":500,"message":"No audio stream found in video formats"}
```

Interpretation: this is the most relevant new route because it is designed to create transcripts from a YouTube link rather than only reading captions. The route did not get past preview for the positive control or hard case.

### Mictoo

Frontend bundle exposes:

- `POST https://mictoo.com/api/youtube-captions`
- upload/Whisper routes such as `/api/transcribe` and `/api/transcribe-status/<id>` for uploaded files.

Observed requests:

```text
POST /api/youtube-captions
payload: {"url":"https://www.youtube.com/watch?v=Q59J5roE5lM"}
result: HTTP 200 with caption segments.

POST /api/youtube-captions
payload: {"url":"https://www.youtube.com/watch?v=AFB5JNjXjsE"}
result: HTTP 200 {"noCaptions":true,"error":"This YouTube video has no captions available. Download the audio with a free tool (4K Video Downloader, ClipGrab, yt-dlp) and upload it here for full Whisper transcription.","downloadGuideUrl":"/how-to-download-youtube-video"}
```

Interpretation: Mictoo is useful as another caption-track cross-check, but its no-caption path explicitly asks for audio download/upload. That does not satisfy the current online-link-only route.

### AISEO

Frontend bundle exposes:

- `POST https://aiseo.ai/api/tools/youtube-summarizer`
- status polling through a backend free-task route when a task id is returned.

Observed requests:

```text
POST /api/tools/youtube-summarizer
payload: {"url":"https://www.youtube.com/watch?v=Q59J5roE5lM","type":"video","language":"en"}
result: HTTP 500 {"success":false,"error":"X_API_KEY / NEW_FREE_TOOL_API_KEY / FREE_TOOL_API_KEY is not configured"}

POST /api/tools/youtube-summarizer
payload: {"url":"https://www.youtube.com/watch?v=AFB5JNjXjsE","type":"video","language":"en"}
result: HTTP 500 {"success":false,"error":"X_API_KEY / NEW_FREE_TOOL_API_KEY / FREE_TOOL_API_KEY is not configured"}
```

Interpretation: this is a server-side configuration failure, not a Terry-specific no-caption failure.

### VideoToWords

Public page inspected:

- `https://www.videotowords.ai/tools/voice-to-text/transcript-youtube-video-to-text`

Guessed routes tested:

- `/api/transcribe`
- `/api/youtube`
- `/api/youtube-transcript`
- `/api/transcript-youtube`

All returned 404-style JSON. No confirmed no-login transcript payload route was found in this pass.

### Whisper Web

Public pages inspected:

- `https://whisperweb.dev/`
- `https://whisperweb.dev/youtube-to-text`

The site positions itself as browser-based Whisper transcription with local/on-device processing. That may be useful for a manual last-resort workflow, but it is not the active route here because the current task should avoid video/audio download and local ASR.

### TranscribeAI

Public page attempted:

- `https://transcribeai.net/youtube-to-text`

Observed result:

```text
GET /youtube-to-text
result: connection timed out before HTML or API routes could be inspected.
```

Interpretation: keep it as a later candidate only. A usable provider must first load reliably, expose a URL-submission route, and pass the Q59 positive control without local audio/video download.

## Next Routing

The next useful provider test should meet one of these criteria before spending a batch:

1. It exposes a public URL-submission endpoint that returns a job id or transcript from YouTube link alone.
2. It passes the Q59 positive control.
3. It does not ask us to download audio/video locally or upload a local file.
4. For no-caption hard cases, it should do better than direct-caption tools by returning a job id, partial transcript, or a specific provider-side generation error rather than `no captions`.

Best current retry candidates remain:

- AI Video Summarizer after quota/login/session state changes.
- NoteGPT or similar if the user's browser session exposes an authenticated manual export.
- Transcriptly if its server-side `No audio stream found` error clears.

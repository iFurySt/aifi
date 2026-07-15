# YouTube-To-Text AI Provider Recon

## Metadata

- Target: Terry Chen YouTube channel
- Artifact type: Online YouTube-link AI transcription provider reconnaissance
- Generated: 2026-07-14
- Constraint: Providers were tested through YouTube URLs only. No video/audio file was downloaded locally and no local ASR was run.
- Positive control: `Q59J5roE5lM`
- Tier 1 hard-case sample: `AFB5JNjXjsE`

## Summary

This pass focused on providers that explicitly claim AI transcription from a YouTube link, not just extraction of existing captions. No new transcript text was recovered, but the routing boundary improved.

| Provider | Public claim | Discovered route | Probe result | Routing decision |
| --- | --- | --- | --- | --- |
| YoutubeToText.ai | Paste any YouTube link; transcript/subtitle/translation in 90+ languages; says it uses ElevenLabs Scribe rather than requiring users to run Whisper or download audio. | `POST https://api.youtubetotext.ai/v1/transcriptions/add-to-queue` with `url`, `type`, `quality`, `mobile`, `verbatim`, and `target_languages`. | Direct unauthenticated POST returned HTTP `403 {"detail":"Forbidden"}` for Q59 and `AFB5JNjXjsE`; frontend requires `x-token`. | Strong manual/authenticated candidate. Not a no-login batch source in this session. |
| VideoToBe | YouTube transcript tool and app-based YouTube import. Blog says videos without captions can be processed with AI in the app; the public transcript landing page says sign-in is required and FAQ says YouTube transcript works for videos with captions. | Public page points to `https://app.videotobe.com`; app redirects to `/auth/signin`. | No unauthenticated transcript/job route found in this pass. | Manual/authenticated candidate only; public landing page is not a hard-case unlocker. |

## YoutubeToText.ai Details

Public page inspected:

- `https://youtubetotext.ai/`

Relevant claims captured from the page / structured FAQ:

- Paste any YouTube link.
- 90+ languages.
- First 10 minutes free, no credit card required.
- Uses ElevenLabs Scribe and avoids the user running Whisper, downloading audio, chunking long files, or stitching results.

Frontend chunk discovery:

- `/_next/static/chunks/7807.3132dd97448758bb.js`
- `/_next/static/chunks/4164-2d27d0f431781f52.js`

Discovered create route:

```text
POST https://api.youtubetotext.ai/v1/transcriptions/add-to-queue
headers include: x-token: <authenticated token>
payload:
{
  "url": "<youtube-url>",
  "type": "transcript",
  "quality": null,
  "mobile": null,
  "verbatim": true,
  "target_languages": null
}
```

Observed unauthenticated probes:

```text
POST /v1/transcriptions/add-to-queue
payload.url: https://www.youtube.com/watch?v=Q59J5roE5lM
result: HTTP 403 {"detail":"Forbidden"}

POST /v1/transcriptions/add-to-queue
payload.url: https://www.youtube.com/watch?v=AFB5JNjXjsE
result: HTTP 403 {"detail":"Forbidden"}
```

Interpretation: this is the right provider class for remaining Tier 1 hard cases, but it requires an authenticated session. Add it to the manual/authenticated export path rather than treating it as an automated batch source.

## VideoToBe Details

Public pages inspected:

- `https://videotobe.com/youtube-transcript`
- `https://app.videotobe.com`
- `https://videotobe.com/blog/youtube-transcription-multiple-speakers`

Public landing-page constraints:

- The YouTube transcript tool flow includes a sign-in step.
- The public FAQ says the tool works with YouTube videos that have captions available.
- The app route redirects to `https://app.videotobe.com/auth/signin` when unauthenticated.

Interpretation: VideoToBe may be useful if the user signs in and uses app-based YouTube import, especially for no-caption AI processing described in its blog. It is not a no-login automated provider in the current session.

## Routing Decision

Add `YoutubeToText.ai` and `VideoToBe` to manual/authenticated candidates. For current automated work, keep them below providers that return a transcript/job id from URL alone without login. For manual work, they are good Tier 1 candidates because they explicitly avoid local user-side video/audio download.

# Noiz / Eightify Provider Recon

## Metadata

- Target: Terry Chen YouTube channel
- Artifact type: Online YouTube-link transcript provider reconnaissance
- Generated: 2026-07-14
- Constraint: Providers were tested through YouTube video ids / URLs only. No video/audio file was downloaded locally and no local ASR was run.
- Positive control: `Q59J5roE5lM` - a Terry video already known to have extractable captions.
- Tier 1 hard-case samples: `AFB5JNjXjsE`, `bsN8REhmr6M`.

## Summary

Noiz's public page claims YouTube subtitles/transcripts from a link and its frontend exposes a real backend endpoint, but the current route did not recover new Terry transcript text.

| Provider | Public route | Q59 result | Tier 1 result | Routing decision |
| --- | --- | --- | --- | --- |
| Noiz / Eightify | `GET https://backend.noiz.io/api/landing/youtube/subtitles?video_id=<id>&language=<LANG>` | HTTP `429`, `5 per 1 day`. | `AFB5JNjXjsE` returned HTTP `400` with a `youtube-transcript-api` / YouTube captcha-style error; `bsN8REhmr6M` returned HTTP `429`. | Real endpoint, but current behavior is direct-caption / youtube-transcript-api-like and quota-limited. Treat as a later low-quota cross-check provider, not a no-caption hard-case unlocker. |

## Raw Probe Details

Frontend page inspected:

- `https://noiz.io/tools/youtube-subtitles/`

Frontend chunk:

- `https://noiz.io/app/_next/static/chunks/784-96a7b5e89e9a6eae.js`

The chunk defines:

```text
GET https://backend.noiz.io/api/landing/youtube/subtitles?video_id=<id>&language=<LANG>
```

and the page exports `transcript_parts` as `subtitles.txt` / `subtitles.srt` when the endpoint succeeds.

Observed direct requests:

```text
GET /api/landing/youtube/subtitles?video_id=Q59J5roE5lM&language=EN
result: HTTP 429, "5 per 1 day"

GET /api/landing/youtube/subtitles?video_id=AFB5JNjXjsE&language=EN
result: HTTP 400, "__typename__":"ApiError"; "Could not retrieve a transcript"; likely YouTube captcha / IP block via youtube-transcript-api-style backend.

GET /api/landing/youtube/subtitles?video_id=bsN8REhmr6M&language=EN
result: HTTP 429, "5 per 1 day"
```

## Routing Decision

Noiz should not be used for blind batch work in the current environment because it has a small daily limit and did not pass the current Q59 positive-control request. It can be retried later only if:

1. Its daily quota resets.
2. It passes Q59.
3. It returns transcript text rather than the YouTube captcha / IP-block error for a Tier 1 hard case.

Until then, keep the Tier 1 manual/authenticated export queue as the better next route.

# yt-dlp Route Probe Status

## Metadata

- Target: Terry Chen YouTube channel
- Evidence type: Subtitle route probe status
- Source: Local `yt-dlp`, temporary latest `yt-dlp` via `uvx`, yt-dlp PO Token Guide, yt-dlp subtitle PO-token issue, bgutil POT provider, WPC POT provider
- Source URL: https://github.com/yt-dlp/yt-dlp/wiki/Po-Token-Guide, https://github.com/yt-dlp/yt-dlp/issues/13075, https://github.com/Brainicism/bgutil-ytdlp-pot-provider, https://github.com/coletdjnz/yt-dlp-getpot-wpc
- Retrieved: 2026-07-13
- Published: Continuously updated project documentation and local probe output
- Coverage period: Non-cookie YouTube subtitle route tests for current network/session
- Confidence: High for local command outcomes; medium for YouTube behavior because bot/PO-token enforcement changes by IP, session, and time.
- Raw file: `yt-dlp-route-probes.json`

## Summary

The non-cookie `yt-dlp` route is not currently a usable raw-text source for the first priority Terry videos.

Findings:

- Local `yt-dlp` is `2026.03.17`; temporary latest `uvx --from yt-dlp yt-dlp` is `2026.07.04`.
- Default, `android`, `ios`, `tv`, `android_vr`, `web_embedded`, `mweb`, and `web_safari` client probes either hit YouTube's bot check or require missing PO tokens.
- A positive-control video already captured through OBU (`2avMoXe8Bwg`) can reach `mweb` metadata, but subtitles are discarded because `mweb.subs` PO token is missing.
- The key asset-allocation video (`Gwn_kEegfJ4`) still hits bot check under `mweb` and other tested clients.
- `bgutil-ytdlp-pot-provider` was loaded by temporary yt-dlp, but the Docker provider's local `/get_pot` endpoint reset connections in this environment. The test container was stopped after probing.
- `yt-dlp-getpot-wpc` loaded successfully as a PO token provider, but `mweb`, `web`, and `web_safari` still returned `LOGIN_REQUIRED` / bot-check output for the positive-control video before usable subtitles were exposed.
- Direct YouTube timedtext endpoints were probed through `video.google.com/timedtext?type=list` and `www.youtube.com/api/timedtext?fmt=json3` for `zh-Hant`, `zh-TW`, `zh`, and `en`. Both the positive-control video and the key asset-allocation video returned empty bodies in this environment.
- The official yt-dlp PO Token Guide says subtitle requests can require PO tokens for some clients; the linked yt-dlp subtitle issue shows browser subtitle requests may include `pot` parameters that plain yt-dlp subtitle requests lack.

## Current Route Matrix

| Route | Current result | Notes |
| --- | --- | --- |
| OBU visible transcript panel | Partial success | 4 transcript files captured. Many priority videos do not render transcript text. |
| OBU page-exposed `captionTracks` | No new text for priority videos | Implemented in collector; priority retries still missing. |
| `youtube-transcript-api` no proxy | Blocked | Key videos returned YouTube IP blocking. |
| `yt-dlp` default no cookies | Bot check | Fails even for known positive-control video. |
| `yt-dlp` `android` / `ios` / `tv` / `android_vr` / `web_embedded` / `mweb` | Bot check or missing PO token | No downloadable subtitle text in current network/session. |
| Temporary latest `yt-dlp` via `uvx` | Bot check | Updating version alone did not unlock key videos. |
| `bgutil` PO token provider | Attempted, not usable | Plugin loaded, Docker provider started, but local token endpoint reset connections. |
| `wpc` PO token provider | Attempted, not usable | Plugin loaded; tested clients still returned bot-check/login-required before usable subtitles. |
| Direct timedtext endpoints | Attempted, empty | `type=list` and common `json3` language requests returned empty bodies for the positive-control and asset-allocation videos. |
| ASR from audio | Not run | Requires approved audio acquisition path or supplied local audio files. |

## Implication

The next raw-text expansion should focus on one of:

1. User-approved audio acquisition plus ASR.
2. A permitted proxy or transcript API route.
3. A repaired/configured PO token provider path for yt-dlp, if the provider can return tokens successfully.
4. User-supplied local audio files under `.cache/terry-youtube-audio/`.

Avoid repeating plain no-cookie `yt-dlp` client probing for the same priority videos unless the network, yt-dlp version, or PO token setup changes.

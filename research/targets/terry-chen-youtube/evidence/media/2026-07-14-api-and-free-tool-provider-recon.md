# API And Free Tool Provider Recon

## Metadata

- Target: Terry Chen YouTube channel transcript recovery
- Artifact type: Online provider reconnaissance note
- Generated: 2026-07-14
- Constraint: YouTube-link-based online transcript/subtitle extraction only. No video/audio download and no local ASR.
- Positive control: `Q59J5roE5lM`
- Hard-case sample: `AFB5JNjXjsE`

## Summary

This pass tested API-backed and free browser-tool candidates after ordinary caption providers stopped adding Terry transcript coverage. No new transcript text was recovered. The useful outcome is routing clarity: these providers are currently manual/authenticated/API-key/verification candidates, not repeatable no-login batch sources.

| Provider | Route inspected | Probe result | Routing decision |
| --- | --- | --- | --- |
| Supadata | Public free tool at `supadata.ai/youtube-transcript`; documented API at `api.supadata.ai/v1`; frontend `/api/run` | Direct `/api/run` requests for Q59 and `AFB5JNjXjsE` returned HTTP 403 with `Verification failed. Please refresh the page and try again.` Browser submission for Q59 reached the same verification failure. | Strong API-key candidate because docs advertise transcript retrieval and AI fallback, but current public free tool is verification-gated. |
| Crawlora | `crawlora.net/tools/youtube-transcript-extractor` | Page loads a YouTube transcript extractor but includes Cloudflare Turnstile before usable submission. The `.md` route is not a transcript source. | Manual/browser or API candidate only; not scriptable in this session. |
| FreeYouTubeTranscribe | `freeyoutubetranscribe.com` | Public page says it reads YouTube caption tracks and cannot transcribe videos with no captions. Browser Q59 submission returned `This video is private or age-restricted, so its captions are not accessible.` | Direct-caption-only candidate, and current Q59 false failure makes it unreliable here. |
| TranscribeYouTube | `transcribeyoutube.com/extract-youtube-transcript` | Public copy says it extracts and exports transcripts when captions are available / captions enabled. No working no-login payload route was recovered in this pass. | Direct-caption cross-check candidate only; not a no-caption hard-case unlocker. |
| YouTubeTranscripts.org | `youtubetranscripts.org` | Site uses Clerk account flow and says `Sign in to generate transcripts`. | Signed-in manual/export candidate only. |
| Maestra | `maestra.ai/tools/video-to-text/youtube-transcript-generator` | Public tool routes toward `app.maestra.ai/transcription-trial` / `subtitle-trial` and sign-up or app flows; no unauthenticated raw transcript endpoint was found. | Trial/sign-up manual candidate only. |
| Glasp | `glasp.co/youtube-transcript` | Direct HTTP returned a Cloudflare challenge / `Just a moment...` style page. | Browser/manual cross-check only. |
| Firecrawl / SocialKit | Provider search candidate | No Q59-positive transcript route was recovered in this pass. | Later API/manual candidate only. |

## Provider Notes

### Supadata

Supadata is worth preserving in the manual/API list because it is the right class of provider: YouTube URL in, transcript out, with documentation indicating an API and fallback behavior. The current no-key route is blocked before transcript retrieval:

- HTTP direct probe: `Verification failed. Please refresh the page and try again.`
- Real-browser Q59 probe: same verification failure after form submission.

Next useful step is an API key or a manually verified browser session. Blind unauthenticated `/api/run` retries are low-value.

### FreeYouTubeTranscribe

FreeYouTubeTranscribe is not a no-caption recovery path. Its own page frames the tool as caption-track extraction. More importantly, Q59 is a known positive-control video across many providers, but this site returned:

- `This video is private or age-restricted, so its captions are not accessible.`

That makes it unsuitable as an automated archive source in the current environment.

### TranscribeYouTube

TranscribeYouTube may still be useful for manual cross-checks when a video has captions, but its public FAQ/copy points to a caption-availability boundary rather than URL-based cloud transcription for no-caption videos. It did not produce a usable automated transcript payload in this pass.

### Crawlora, YouTubeTranscripts.org, Maestra, Glasp

These providers belong below authenticated/manual export routes:

- Crawlora: Cloudflare Turnstile
- YouTubeTranscripts.org: `Sign in to generate transcripts`
- Maestra: `app.maestra.ai/transcription-trial` / `subtitle-trial` app flow
- Glasp: Cloudflare challenge

None should be used for blind batch automation until a user-authenticated or API-key path is available.

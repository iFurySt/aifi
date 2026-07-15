# YouTube Transcript and ASR Tooling Notes

## Metadata

- Target: Terry Chen YouTube channel
- Evidence type: Tooling research note
- Source: yt-dlp local help, yt-dlp PO Token Guide, yt-dlp subtitle PO-token issue, OpenAI Whisper README, faster-whisper README
- Source URL: https://github.com/yt-dlp/yt-dlp, https://github.com/yt-dlp/yt-dlp/wiki/Po-Token-Guide, https://github.com/yt-dlp/yt-dlp/issues/13075, https://github.com/openai/whisper, https://github.com/SYSTRAN/faster-whisper
- Retrieved: 2026-07-13
- Published: Continuously updated project documentation
- Coverage period: Current collection workflow
- Confidence: High for command capability; medium for YouTube request behavior because YouTube anti-bot behavior changes by session and network.
- Raw file: `asr/queue.json`, `asr/manifest.json`

## Tooling Findings

- `yt-dlp` is the right first tool for public channel inventory and subtitle attempts. Local help confirms support for `--write-subs`, `--write-auto-subs`, `--list-subs`, `--sub-langs`, and audio extraction with `-x --audio-format`.
- `youtube-transcript-api` is a useful optional no-browser/no-API-key transcript extractor and supports raw transcript data, language preference, translation, and proxy options. In this environment, it is currently blocked by YouTube's IP checks for key videos.
- OpenAI Whisper supports command-line transcription of local audio files and can write transcript text artifacts.
- faster-whisper is a CTranslate2-based Whisper implementation intended to run faster and with lower memory use than the original OpenAI Whisper implementation.
- In this environment, direct `yt-dlp --list-subs`, direct no-cookie `yt-dlp` audio download, and no-proxy `youtube-transcript-api` requests against individual Terry videos return YouTube bot-check / IP-block failures.
- OBU can read visible transcript text from the loaded YouTube page, and the collector also attempts to fetch page-exposed `captionTracks` from `ytInitialPlayerResponse` when the visible panel does not render. Many key Terry videos still expose neither path in this session.
- Non-cookie `yt-dlp` player-client variants (`android`, `ios`, `tv`, `android_vr`, `web_embedded`, `mweb`, `web_safari`) were probed. Current results are bot checks or missing subtitle PO tokens; `mweb` can reach metadata for the positive-control video but discards subtitle languages without a `mweb.subs` PO token.
- Temporary PO-token provider probes did not unlock subtitles in this environment. `bgutil-ytdlp-pot-provider` loaded but its local Docker provider reset `/get_pot` requests; `yt-dlp-getpot-wpc` loaded but tested clients still returned bot-check/login-required output.
- Direct timedtext endpoint probes returned empty bodies for both the positive-control transcript video and the key asset-allocation video.
- Repository analysis now treats `.asr.txt` / `.asr.json` files as transcript evidence with a machine-generated confidence label, so ASR output can be folded into later portfolio and timeline extraction without changing the analysis script again.

## Practical Collection Decision

Use a tiered collector:

1. `yt-dlp --flat-playlist` for the full video-link inventory.
2. OBU browser-readable transcript extraction when YouTube exposes either a visible transcript panel or player caption tracks in the page.
3. `youtube-transcript-api` when a non-blocked network/proxy is available.
4. `yt-dlp` with a working PO token provider if the provider can return tokens in the current environment.
5. Direct timedtext endpoints only if YouTube begins returning track lists or json3 text for these videos.
6. ASR fallback for the remaining queue, using local audio files, a user-approved authenticated download path, or an external audio/ASR provider.

The repository should not store browser cookies, API keys, or private account data. The ASR script therefore requires explicit flags for browser-cookie download and accepts external ASR commands through environment-configured tooling.

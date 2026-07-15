# Terry YouTube Transcript Collection Status

## Metadata

- Target: Terry Chen YouTube channel
- Evidence type: Media source collection status
- Source: YouTube channel and video pages
- Source URL: https://www.youtube.com/@hackbearterry/videos
- Retrieved: 2026-07-13
- Published: Mixed historical public videos
- Coverage period: Public channel inventory available on 2026-07-13
- Confidence: High for video-link inventory; medium for visible transcript coverage because YouTube UI availability can vary by session, region, and page state.
- Raw file: `youtube-video-index.json`, `transcripts/manifest.json`

## Summary

- `yt-dlp --flat-playlist` collected 290 public video links from the channel.
- Latest 2026-07-14 metadata-only refresh collected 291 public video links from the channel; the newest added video is `JzIfrGMeAFw`.
- Direct `yt-dlp --list-subs` on an individual video was blocked by YouTube's bot check, so the current collector uses Open Browser Use to read transcript text from the user's visible Chrome YouTube page. It now tries the visible transcript panel first, then page-exposed player caption tracks.
- The first OBU visible-transcript batch ran through video index 25.
- Stored transcript files currently exist for:
  - `2avMoXe8Bwg`: "科技業工作 10 年後，我正式離開職場。沒薪水，錢從哪來？"
  - `rF5thvdRjnE`: "我在Threads被炎上了"
  - `SXgn3JiTjRA`: "開箱不丹🇧🇹首都最精華地段房地產，竟然只要？"
  - `U9xIBSYp7xQ`: "我來了【不丹🇧🇹】亞洲最不發達國家，竟然是比特幣巨鯨！"
- The other checked videos in the first batch did not expose a usable visible transcript panel or rendered transcript text in this session.
- A high-priority visible-transcript probe for video indices 65-75 found two additional transcript files, while `Gwn_kEegfJ4` ("公開我的全部身家，資產配置") and `L7xgc12JfHA` ("分享我的被動收入") still did not expose visible transcript text in this session.
- A `youtube-transcript-api` probe for the same two key videos also failed under the current IP with YouTube request-blocking text; the optional collector can be retried with proxy flags on a permitted network.
- A fallback ASR queue has been created under `asr/queue.json`; it currently contains 225 videos that do not yet have stored transcript text.
- Additional visible-transcript probes covered high-priority titles at indices 13-15, 34, 49, 60, and 98-105. No new transcript text was exposed in those probes.
- An additional bounded visible-transcript probe covered video indices 106-125. No new transcript text was exposed; several crypto, Tesla, and engineering-investing titles were added to the prioritized gap set.
- A caption-track fallback retry covered key videos `Gwn_kEegfJ4`, `L7xgc12JfHA`, `Q59J5roE5lM`, `e5oYYw1tXbo`, `52XVsVj6b4E`, and `hbJ0S2hINWg`. No new transcript text was exposed in the browser page.
- Non-cookie `yt-dlp` client probes covered default, `android`, `ios`, `tv`, `android_vr`, `web_embedded`, `mweb`, and latest temporary `yt-dlp` variants. The current route is blocked by bot checks or missing subtitle PO tokens; see `yt-dlp-route-probes.json`.
- Temporary PO-token provider probes did not unlock subtitles: `bgutil`'s Docker endpoint reset local token requests, and `wpc` loaded but still returned bot-check/login-required output for the positive-control route.
- Direct timedtext endpoint probes returned empty bodies for the positive-control video and the key asset-allocation video.
- Online transcript provider probing added normalized transcripts for:
  - `Q59J5roE5lM`: "為什麼你投資賺不到錢？該選股還是投大盤？"
  - `GHBP2FS9tBc`: "特斯拉 $250億 的世紀豪賭，壯舉還是災難？"
- `Q59J5roE5lM` is cross-provider validated: `youtubetranscript.pro`, Tactiq, YouTubeToTranscript, and TubeTranscript all returned highly similar text. Pairwise normalized similarity across the four stored outputs ranges from 0.9976 to 1.0.
- Additional scripted online providers now also collect the Q59 positive control:
  - Kome via `POST https://kome.ai/api/transcript`.
  - youtube-transcript.io via browser-rendered `/videos?id=<id>` pages.
  - youtube-transcript.ai via `GET https://youtube-transcript.ai/api/subtitles?v=<id>` and inline VTT parsing.
  - YTTranscript.AI via `POST https://yttranscript.ai/api/transcript` and structured transcript rows.
- A partial Kome full-channel missing-video scan covered the early channel segment through video index 98 before being stopped after a long low-yield failure run. It added 20 new unique transcript files beyond the prior six-video coverage, including recent SpaceX/AI/crypto/macro, career, cash-management, and real-estate videos.
- Additional online provider probes did not unlock the key priority gaps:
  - DownSub recognized `Gwn_kEegfJ4` and its title/duration but returned `Sorry! Subtitles not found`; it recognized downloadable subtitle formats for the Q59 positive control.
  - YouTubeToTranscript collected Q59 but returned `0/9` new transcripts on the priority gap run; `Gwn_kEegfJ4` repeatedly returned the provider's "Could Not Get Transcript" page.
  - TubeTranscript collected Q59 but returned `0/9` new transcripts on the priority gap run; `Gwn_kEegfJ4` returned "This video doesn't have subtitles."
  - Kome collected Q59 but returned `0/9` new transcripts on the priority gap run.
  - youtube-transcript.io collected Q59 but returned `0/9` new transcripts on the priority gap run; `Gwn_kEegfJ4` returned "Transcript Could Not Be Fetched."
  - youtube-transcript.ai collected Q59 but returned `0/9` new transcripts on the priority gap run because the provider returned no subtitle tracks.
  - YTTranscript.AI collected Q59 but returned `0/9` new transcripts on the priority gap run because the provider returned `NO_CAPTIONS`.
  - Scrapingdog's browser page failed for both `Gwn_kEegfJ4` and Q59, so it is not usable in the current session.
  - `yttranscript.app` timed out / opened blank in the current session.
  - NoteGPT's generic transcript APIs returned `login expired` without an authenticated session.
- A follow-up Kome bounded scan over video indices 99-148 returned `0/50` new transcripts, confirming that the low-yield region after index 98 should not be rerun blindly.
- GetTranscript's front-end exposes `GET https://gettranscript.app/api/video/transcript?videoId=<id>&format=json`. It returned a complete Q59 positive-control transcript, but returned `0/9` on the current priority gap list and `0/20` on the index 99-118 Kome-failure slice.
- GetYouTubeText exposes `/api/transcript?url=<youtube-url>` behind a browser Turnstile token. The OBU collector returned a complete Q59 positive-control transcript, but returned `0/9` on the current priority gap list and `0/12` on the index 149-160 slice.
- AI Video Summarizer (`aivideosummarizer.io/youtube-subtitle-downloader/`) returned full browser-rendered subtitles for the Q59 positive control and, importantly, generated full transcripts for all hard-case high-priority investment/career-wealth gaps plus 11 additional thematic expansion videos after OBU-driven link submission. Records were stored from the site's IndexedDB `tr-history` object store as `*.provider-aivideosummarizer.txt/json`.
- On 2026-07-14, AI Video Summarizer was retried against a 6-video investment-relevant slice covering crypto, AI-bubble, market-volatility, BNB, Japan real estate, and US inequality. The provider reported `Your daily guest limit has been reached` after two recorded errors, so the run was interrupted rather than spending more time under the same quota state.
- The same 6-video slice was then tested against Kome, GetTranscript, youtube-transcript.ai, YTTranscript.AI, youtubetranscript.pro, and GetYouTubeText. Those online link-to-transcript routes returned 0 new transcripts, so this slice should not be blindly repeated until a new provider route or changed quota/session state is available.
- NoteGPT was re-tested through its public YouTube Subtitle Downloader page because it is a plausible manual provider. The page accepted `_9Vjc25BaW4` into the URL input, but automated clicks did not advance from the landing page to a transcript/detail result in the current OBU session. Keep NoteGPT as a manual/authenticated candidate, not a scripted batch source yet.
- Genelify was blocked by a Cloudflare challenge in direct HTTP probing. SocialKit's page did not return through direct HTTP in the current session, so neither is currently scripted.
- Decopy was added as a scripted direct-subtitle provider through `POST https://api.decopy.ai/api/decopy/youtube-video/create-job2`. It collected and stored a Q59 positive-control transcript as `Q59J5roE5lM.provider-decopy.txt/json`, but returned 0 new transcripts on the same 2026-07-14 six-video hard slice. Its no-caption extraction handoff requires login, so it is currently a cross-check provider rather than a hard-case unlocker.
- YTVidHub was added as another scripted direct-subtitle provider through `POST https://ytvidhub.com/api/subtitle/guest-download/`. It collected and stored a Q59 positive-control transcript as `Q59J5roE5lM.provider-ytvidhub.txt/json`, but returned `No subtitles found` for `5TDTxHZXiLE` ("為什麼投資比特幣"). Its guest response reports a low daily quota, so use it for bounded cross-checks rather than blind scans.
- UTubeToolkit was added as another scripted online caption provider through `POST https://utubetoolkit.com/api/transcript/`. It collected and stored a Q59 positive-control transcript as `Q59J5roE5lM.provider-utubetoolkit.txt/json`, but returned 0 new transcripts on a 70-video investment-like fallback slice.
- SellOnTube's front-end exposes `POST /api/get-transcript`, but the Q59 positive-control request returned HTTP 500 in this session. SozAI was inspected but is a cloud AI transcription route that extracts audio, so it is not part of the current preferred no-ASR provider path.
- AudioConverter.ai and VideoTranscriber.ai were probed because both public pages advertise YouTube subtitle/transcript extraction from links. AudioConverter's `url-info` route returned `youtube_has_subtitles: false` for `Gwn_kEegfJ4`, `_9Vjc25BaW4`, and the first 50 fallback-queue videos; VideoTranscriber returned the same no-subtitle signal for `Gwn_kEegfJ4`. They remain later candidates only if their signed/no-caption flow becomes repeatable.
- NoteGPT can generate transcript detail pages from YouTube links, but the tested generic transcript API path returned `login expired` and the browser route appears limited by account/session quota, so it is not yet a reliable batch source for this archive.
- A later AI Video Summarizer recovery check on 2026-07-14 still showed `Your daily guest limit has been reached` for `AFB5JNjXjsE`, so that provider remains paused in the current browser/session.
- Additional provider hunting found several plausible online transcript services but no new repeatable batch source in this session:
  - OpusClip's transcript tool was blocked by its country/access-control decision.
  - BibiGPT's public transcript pages advertise link-based transcript generation, but the web app did not hydrate in the current OBU session. Static app chunks reveal a `https://api.bibigpt.co/api/trpc` video-summary route, but no verified unauthenticated transcript call has been captured.
  - Supadata and TranscriptAPI appear API-key/credit oriented rather than immediate no-login bulk transcript sources.
  - A direct YouTube Android InnerTube caption-track probe returned HTTP 400 for the Q59 positive control and then hung on subsequent requests, so it is not currently reliable enough for batch use.
- NoteGPT was rechecked through the user-provided detail page and browser-origin API calls. The page currently exposes no transcript payload without login/session quota; SSR state has empty note/transcript/subtitle lists, and `/api/v2/notes/get-video-by-id` returns `login expired` even inside the NoteGPT page origin.
- The user-provided NoteGPT detail URL (`/detail?id=rF5thvdRjnE&type=1&utm_source=youtube-subtitle-downloader&epl=1`) was inspected directly. Its Nuxt payload contains empty `noteDetail`, `transcriptList`, and `subtitleList` state in this unauthenticated session. Static chunk inspection found the relevant NoteGPT routes (`/api/v2/video-transcript`, `/api/v2/video-transcript-v2`, `/api/v2/transcript-generate`, `/api/v2/notes/get-video-by-id`, and `/api/v2/subtitles/download`), but Q59 positive-control and detail-id probes returned `login expired` or `wrong params`, so NoteGPT remains a manual/authenticated cross-check candidate rather than a batch source.
- A later browser-origin NoteGPT pass used `/api/v2/video-transcript?platform=youtube&video_id=<id>` and captured the newest public video `JzIfrGMeAFw` without local video/audio download or local ASR. The current archive has 286 useful transcript captures and 5 remaining fallback videos.
- Supadata's free YouTube transcript page was browser-probed with the Q59 positive control. The front end submitted `POST /api/run` with `{"type":"transcript","url":"https://www.youtube.com/watch?v=Q59J5roE5lM","options":{"text":true,"lang":"auto","mode":"auto"}}`, but the response was HTTP 403 with `Verification failed. Please refresh the page and try again.` Its public API route (`https://api.supadata.ai/v1/youtube/transcript`) is therefore an API-key/credit path, not an immediate no-login batch path in this session.
- SocialCrawl's YouTube transcript generator page was browser-probed with the Q59 positive control. The page advertises no-login transcript extraction and documents YouTube transcript endpoints, but the form's `Get the transcript` button stayed disabled under automated input and no transcript fetch was captured. Treat SocialCrawl as a later manual/API-key candidate until a repeatable Q59 transcript response is captured.
- Rewind's advertised YouTube transcript page was inspected in browser; it is a file-upload STT page (`/v1/stt/` style audio/video transcription), not a YouTube-link subtitle extraction path, so it is outside the current no-download/no-ASR main route.
- NoteLM's front-end exposes promising `POST /api/youtube-video-info` and `POST /api/youtube-transcript` routes, but direct Q59 positive-control POSTs timed out in this session. Keep it as a later candidate only if a browser or API probe returns a complete Q59 transcript.
- NoteLM was rechecked through the real Chrome page with OBU. The page loaded, but browser-origin Q59 positive-control calls to both exposed routes timed out / aborted after 8 seconds, matching the direct HTTP timeout behavior.
- WayinVideo was checked as another current online result. Direct page access returned HTTP 451, and its public copy says it can generate transcripts even without captions, so it is a cloud transcription candidate rather than the preferred existing-caption extraction path.
- AI Video Summarizer was retried on `AFB5JNjXjsE`; it still ended in `AI Generation in Progress` / `Your daily guest limit has been reached`, so the provider remains paused for this browser/session.
- TubeAlfred exposes documented transcript endpoints (`/v1/youtube/video/{video_id}/transcript` and `/transcript/fast`) but requires `X-API-Key`; it is an API-key candidate, not a no-login batch source.
- YouTubeToScript's direct `/?action=transcript&url=<youtube-url>` probe returned the homepage rather than a transcript payload, so no repeatable scriptable route is confirmed yet.
- Neatoolkit's YouTube Subtitle Downloader was inspected after the user requested more online link-based sites. Its page advertises no-login subtitle extraction with a 10-use/day and 60-minute-video limit, but its implementation first calls `/api/upload-token` with `x-turnstile-token` and then calls `https://neatoolkit-api.purplepebble-e423ccc9.japaneast.azurecontainerapps.io/api/youtube/subtitle`. A direct token request returned HTTP 403 `CAPTCHA required`, so Neatoolkit is not currently a repeatable no-login batch source.
- Touhfa's YouTube Subtitles Downloader exposes a clear scriptable route, `POST /api/subtitles-downloader/`, followed by `action:"proxy"` for VTT/TXT conversion. However, Q59 and public example-video positive-control POSTs both returned Cloudflare HTTP 502 in this session, so it is a promising later route but not a verified source yet.
- VideoToPage's free subtitle/transcript pages were inspected as another new candidate. The public pages are static Next.js pages and the discovered `/api/free-youtube-transcript` path returned 404; no Q59-positive transcript payload route is confirmed yet.
- SubtitlesYT was added as a scriptable no-login subtitle route through `GET https://subtitlesyt.com/download_subtitles?youtube_url=<url>&format=txt`. It collected the Q59 positive control and stores `Q59J5roE5lM.provider-subtitlesyt.txt/json`; the provider enforces about 5 requests per minute, so the collector now defaults to a 13-second delay. A rate-limited 20-video investment-like run and a corrected 5-video rerun returned no new usable transcripts.
- VideoToBlog was added as a scriptable no-login transcript route through `POST https://videotoblog.ai/api/getYtTranscript`. It collected the Q59 positive control and stores `Q59J5roE5lM.provider-videotoblog.txt/json`; a 20-video investment-like fallback run returned `The requested page doesn't exist or there are no translations available for the video` for each tested gap, so it is another cross-check provider rather than a current hard-case unlocker.
- SHRP was added as another scriptable no-login caption route through `POST https://shrp.app/api/youtube-captions`. It collected the Q59 positive control with 755 lines and 8,529 characters, storing `Q59J5roE5lM.provider-shrp.txt/json`. A 20-video investment-like fallback run returned no new transcript text; several videos returned `noCaptions`, and the later slice hit the site's small free quota with `429 Daily limit reached`.
- Noteey was added as a browser-rendered online subtitle route through `scripts/collect_youtube_transcripts_noteey_obu.py`. It collected the Q59 positive control from `.desktop-transcript-container` and stores `Q59J5roE5lM.provider-noteey.txt/json`, but a 6-video hard thematic slice and a 20-video investment-like fallback slice returned no new transcript text. FreeYouTubeTranscribe failed the Q59 positive control in-browser, TranscribeYouTube did not complete a usable browser submission, and Transcript.you requires account/Premium for the relevant downloads.
- The user-provided NoteGPT detail page (`https://notegpt.io/detail?id=rF5thvdRjnE&type=1&utm_source=youtube-subtitle-downloader&epl=1`) was inspected directly. Its public Nuxt payload does not include transcript text, and `/api/v2/notes/get-video-by-id` returns `login expired` without an authenticated session, so NoteGPT remains a manual/authenticated candidate rather than a repeatable batch source in the current session.
- A 24-video older investment slice covering Bitcoin, crypto, Tesla, US real estate, US stocks, market-cycle, and Japan-real-estate topics was tested across Kome, GetTranscript, youtube-transcript.ai, and youtubetranscript.pro. GetTranscript and youtube-transcript.ai returned `0/24`; Kome was interrupted after nine consecutive errors; youtubetranscript.pro produced only a 136-character intro/music fragment for `xeEd1DEizNE`, now marked `partial`.
- The transcript pipeline now treats very short provider files as partial raw evidence rather than usable transcript coverage, and downstream corpus/ledger analysis reads one canonical `ok` transcript per video so cross-provider Q59 validation files do not duplicate the analytical evidence base.
- `transcripts/manifest.json` currently records 82 probed videos: 65 `ok` transcript captures, 1 `partial` provider capture, and 16 `missing` browser-transcript records.
- `asr/queue.json` currently contains 225 fallback videos; partial provider captures remain in the queue.
- `2026-07-13-high-priority-transcript-gaps.json` now records 0 remaining investment-relevant videos after AI Video Summarizer collection.
- `artifacts/decision-frames/2026-07-13-investment-evidence-ledger.json` now records 4,979 line-level investment evidence entries from canonical archived transcript text, organized into holdings/assets, income streams, portfolio rules, wealth development, and learning principles. Cross-provider raw files remain archived for validation, but they are not all counted as separate analytical evidence.
- `artifacts/memos/2026-07-13-practice-derived-investor-playbook.md` translates the current transcript-backed evidence into an ordinary-investor portfolio and learning template, with FINRA and Investor.gov references as external guardrails. It remains draft-level until the AI Video Summarizer hard-case transcripts are reviewed and cross-checked where another provider becomes available.
- External web search for key missing videos found the original YouTube pages and a forum discussion, but no reusable full transcript source in this pass.
- A no-cookie 30-second audio download test for `NhJ1fqtsmc8` failed with YouTube's bot-check message. Do not use video download / ASR as the primary path for this research; keep it only as a last-resort fallback.

## Implication

The full research goal needs online transcript-provider coverage beyond YouTube-visible subtitles. The next collection slice should keep testing link-to-transcript websites and provider APIs for videos where `transcripts/manifest.json` records `missing` or `error`, while keeping YouTube-visible transcripts as the preferred source when available.

Current tooling assessment:

- `yt-dlp` supports `--write-subs`, `--write-auto-subs`, `--list-subs`, subtitle language filters, and audio extraction via `-x --audio-format`, but this environment's direct individual YouTube requests are blocked by YouTube's bot check without authentication.
- `youtubetranscript.pro` exposes a usable transcript endpoint for some videos: `https://youtubetranscript.pro/api/youtube/transcript?videoId=<id>&sessionId=<id>`.
- Tactiq can return browser-rendered transcripts for at least some videos and is useful for cross-checking, but it uses browser-side reCAPTCHA/AppCheck and is less direct to batch automate.
- YouTubeToTranscript and TubeTranscript are usable browser-rendered cross-check providers for videos with accessible subtitles, but the priority gap run found no new text beyond the Q59 positive control.
- Kome, youtube-transcript.io, youtube-transcript.ai, YTTranscript.AI, GetTranscript, GetYouTubeText, and AI Video Summarizer are now additional cross-check providers. Kome is useful for broader missing-video scans, and AI Video Summarizer is currently the only tested provider that unlocked `Gwn_kEegfJ4`.
- Decopy is another direct-subtitle cross-check provider. It does not currently unlock no-caption videos without login, but it can be used to compare transcript text for videos where subtitles exist.
- YTVidHub is another direct-subtitle cross-check provider. It exposes a no-login guest endpoint, but the guest quota is low and the old Bitcoin hard case returned no subtitle text.
- UTubeToolkit is another direct-caption cross-check provider. It exposes a no-login endpoint and passed Q59, but it returned no new text for the investment-like fallback slice.

## Next Data Tasks

- Continue or rerun `python3 scripts/collect_youtube_transcripts_obu.py --skip-index` for browser-readable subtitles if needed. Use `--video-id <id>` for precise retries.
- Retry `python3 scripts/collect_youtube_transcript_api.py` with `--http-proxy` / `--https-proxy` if a permitted proxy is available.
- Retry `python3 scripts/probe_youtube_transcript_routes.py` only if network, yt-dlp version, or PO-token provider setup changes. Complex commands can be passed with `--yt-dlp-command-str`.
- Direct timedtext probes can be reproduced with `python3 scripts/probe_youtube_transcript_routes.py --route timedtext --video-id 2avMoXe8Bwg --video-id Gwn_kEegfJ4`.
- Use `python3 scripts/collect_youtube_transcripts_provider.py --priority-list` to query the currently automated online transcript provider.
- Use `python3 scripts/collect_youtube_transcripts_youtubetotranscript_obu.py --priority-list` and `python3 scripts/collect_youtube_transcripts_tubetranscript_obu.py --priority-list` to retry the newly scripted browser-rendered provider routes.
- Use `python3 scripts/collect_youtube_transcripts_kome.py --priority-list`, `python3 scripts/collect_youtube_transcripts_youtubetranscript_io_obu.py --priority-list`, and `python3 scripts/collect_youtube_transcripts_youtubetranscript_ai.py --priority-list` to retry the latest scripted provider routes if provider behavior changes.
- Continue Kome broader scans only in carefully chosen bounded slices. The first partial scan added new transcript text, but later Kome runs over indices 99-148 and the 2026-07-14 six-video thematic retry were low-yield.
- Use `python3 scripts/collect_youtube_transcripts_gettranscript.py --priority-list` for GetTranscript retries; do not expand it blindly until provider behavior changes because it returned `0/9` priority gaps and `0/20` on the 99-118 slice.
- Use `python3 scripts/collect_youtube_transcripts_getyoutubetext_obu.py --priority-list` for GetYouTubeText browser-token retries; do not expand it blindly until provider behavior changes because it returned `0/9` priority gaps and `0/12` on the 149-160 slice.
- Use `python3 scripts/collect_youtube_transcripts_yttranscript_ai.py --priority-list` to retry YTTranscript.AI; avoid full-channel scans because the provider enforces a free transcript quota.
- Use `python3 scripts/collect_youtube_transcripts_decopy.py --video-id <id>` for Decopy direct-subtitle probes. Do not expand it blindly over no-caption regions because the 2026-07-14 hard slice returned 0/6 and no-caption extraction requires login.
- Use `python3 scripts/collect_youtube_transcripts_ytvidhub.py --video-id <id>` for YTVidHub direct-subtitle probes. Keep runs bounded because the provider exposes a low guest quota and `5TDTxHZXiLE` returned no subtitles.
- Use `python3 scripts/collect_youtube_transcripts_utubetoolkit.py --investment-like` for bounded UTubeToolkit retries if provider behavior changes. Do not rerun the same investment slice blindly because it returned `0/70`.
- Use `Q59J5roE5lM` as a positive-control cross-provider check. The selected priority queue is now solved by AI Video Summarizer, but `Gwn_kEegfJ4`, `52XVsVj6b4E`, `L7xgc12JfHA`, `hbJ0S2hINWg`, `P6XYXfePAsA`, `e5oYYw1tXbo`, `lL-aGwCD5xk`, `dqAsQyRJHAg`, `HL26tMSTqO4`, `KLjed4HMArA`, and `XJtbWhnclB4` should be cross-checked if another online provider unlocks them later.
- Use `python3 scripts/collect_youtube_asr_fallback.py` to maintain the ASR queue.
- Use `python3 scripts/collect_youtube_asr_fallback.py --priority-list` to materialize `asr/selected-queue.json` for any remaining priority videos; it currently queues 0 jobs because the high-priority gap list is empty. `asr/queue.json` remains the full 225-video queue.
- When local audio is supplied in `.cache/terry-youtube-audio/`, the ASR runner accepts the queue naming convention with common extensions such as `.m4a`, `.mp3`, `.wav`, `.webm`, `.opus`, `.ogg`, `.flac`, `.aac`, and `.mp4`.
- Use `python3 scripts/import_terry_asr_transcripts.py <input_dir>` when an external ASR provider returns `.txt`, `.md`, `.srt`, `.vtt`, or Whisper/faster-whisper-style `.json` transcripts named with YouTube video ids.
- `2026-07-13-high-priority-transcript-gaps.json` is currently empty; use title/theme signals to choose any next online-provider expansion slice.
- ASR outputs written as `.asr.txt` / `.asr.json` are included by manifest rebuilds and signal extraction, but should retain the machine-generated confidence label until spot-checked. ASR remains a last resort after online link-to-transcript providers.
- Avoid repeating generic web searches for the same key gaps unless using a new transcript-specific source or provider.
- Do not use video download / ASR as the main collection path; prioritize online link-to-transcript providers and use cross-provider comparison where possible.
- Treat account-gated or quota-gated providers such as NoteGPT as manual candidates unless their authenticated transcript export path can be made repeatable and recorded in a provider manifest.
- Retry AI Video Summarizer only after its daily guest quota/session state changes, or after an authenticated/manual export path is available. The current browser session is quota-limited.
- Treat Supadata, SocialCrawl, TubeAlfred, NoteLM, and YouTubeToScript as later candidates until each passes the Q59 positive-control transcript test through a repeatable route. Supadata currently fails browser verification without token/API key; SocialCrawl did not submit under automation; TubeAlfred needs an API key; NoteLM timed out; YouTubeToScript has no confirmed transcript payload route.
- Treat Neatoolkit, Touhfa, and VideoToPage as later candidates until each passes Q59. Neatoolkit is currently Turnstile/CAPTCHA-gated, Touhfa's exposed API returned HTTP 502, and VideoToPage has no confirmed transcript payload route.
- Use `python3 scripts/collect_youtube_transcripts_subtitlesyt.py --video-id <id>` for bounded SubtitlesYT cross-checks. Keep its default delay or a slower one because the site returns `429 Too Many Requests` above roughly 5 requests per minute.
- Use `python3 scripts/collect_youtube_transcripts_videotoblog.py --video-id <id>` for bounded VideoToBlog cross-checks. Do not spend it on blind fallback scans until provider behavior changes because the first 20 investment-like fallback videos returned no transcript payload.
- Use `python3 scripts/collect_youtube_transcripts_shrp.py --video-id <id>` for bounded SHRP cross-checks. Do not spend it on blind fallback scans because the first 20 investment-like fallback videos returned no new text and the provider hit a small free quota.
- Use `python3 scripts/collect_youtube_transcripts_noteey_obu.py --video-id <id>` for bounded Noteey browser-DOM cross-checks. It passed Q59 but did not unlock the latest hard thematic or investment-like fallback slices.
- Skip Rewind for this task because the current page is file-upload STT rather than link-to-caption extraction.
- Treat BibiGPT as a later route only if its app hydrates or a Q59-positive-control tRPC call is confirmed. Static API discovery is not enough to count it as a data source.
- Skip OpusClip in the current environment unless its country/access-control block changes.
- Do not spend batch time on the direct YouTube Android InnerTube route until it first passes the Q59 positive control without hanging.
- Keep NoteGPT as a manual/authenticated route unless the browser is logged in and the Q59/detail API path can be verified. The current session returns login/limit states.
- Preserve but do not analyze partial provider files such as `xeEd1DEizNE.provider-youtubetranscript-pro.txt`; they are useful provider evidence but not useful spoken-content coverage.
- After raw text coverage is sufficient, extract portfolio holdings, income streams, option strategies, real estate references, crypto exposure, and timeline markers into a separate synthesized artifact.
- Regenerate the structured evidence ledger after new transcript text with `python3 scripts/extract_terry_investment_evidence_ledger.py`.
- Regenerate the current synthesis draft after new transcript text with `python3 scripts/synthesize_terry_investment_report.py`.

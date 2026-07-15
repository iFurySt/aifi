# Online Transcript Provider Probes

## Metadata

- Target: Terry Chen YouTube channel
- Evidence type: Online link-to-transcript provider probe
- Source URL: https://www.youtube.com/@hackbearterry/videos
- Retrieved: 2026-07-13
- Raw files:
  - `provider-probes/youtubetranscript-pro-manifest.json`
  - `provider-probes/tactiq-manifest.json`
  - `provider-probes/youtubetotranscript-manifest.json`
  - `provider-probes/tubetranscript-manifest.json`
  - `provider-probes/kome-manifest.json`
  - `provider-probes/youtubetranscript-io-manifest.json`
  - `provider-probes/youtubetranscript-ai-manifest.json`
  - `provider-probes/yttranscript-ai-manifest.json`
  - `provider-probes/gettranscript-manifest.json`
  - `provider-probes/getyoutubetext-manifest.json`
  - `provider-probes/aivideosummarizer-manifest.json`
  - `provider-probes/decopy-manifest.json`
  - `provider-probes/ytvidhub-manifest.json`
  - `provider-probes/utubetoolkit-manifest.json`
  - `provider-probes/noteey-manifest.json`

## Summary

The current preferred raw-text expansion path is online transcript extraction from YouTube links, not video download or ASR. Provider probes found one automatable API route and several browser-confirmed cross-check routes:

- `youtubetranscript.pro`: front-end bundle exposes `/api/youtube/transcript?videoId=<id>&sessionId=<id>`. The API returned usable segment JSON for `Q59J5roE5lM` and `GHBP2FS9tBc`, and failed for most high-priority gaps including `Gwn_kEegfJ4`.
- `Tactiq`: browser UI returned a full transcript for `Q59J5roE5lM`. The extracted text has 755 segments and 0.9984 character-level similarity with the `youtubetranscript.pro` output, so `Q59J5roE5lM` is cross-provider validated. The reusable OBU collector then tested remaining priority and bounded high-priority gaps; no additional transcript text was exposed.
- `Tactiq` did not render transcript segments for `Gwn_kEegfJ4`, `52XVsVj6b4E`, `L7xgc12JfHA`, `hbJ0S2hINWg`, `P6XYXfePAsA`, `e5oYYw1tXbo`, `lL-aGwCD5xk`, `dqAsQyRJHAg`, or `HL26tMSTqO4` in this session.
- `YouTubeToTranscript`: browser landing pages expose transcript text in `#transcript` for `Q59J5roE5lM`. Direct `/transcript?v=<id>` navigation needs a homepage warmup to pass Cloudflare. The priority gap run collected `0/9` new transcripts; the hard-case `Gwn_kEegfJ4` repeatedly returned the provider's "Could Not Get Transcript" page.
- `TubeTranscript`: browser landing pages expose timestamped transcript groups in `#main-transcript-content` for `Q59J5roE5lM`. The priority gap run collected `0/9` new transcripts; the hard-case `Gwn_kEegfJ4` returned the explicit message "This video doesn't have subtitles."
- `Kome`: front-end code exposes `POST https://kome.ai/api/transcript`. The direct API returned usable text for `Q59J5roE5lM`, while the current 9-video priority gap run collected `0/9` new transcripts. A partial broader scan through video index 98 added 20 new unique transcript files before a long low-yield failure run; failed videos returned the provider's unavailable-transcript message.
- `youtube-transcript.io`: browser pages at `/videos?id=<id>` expose timestamped transcript rows for `Q59J5roE5lM`. The priority gap run collected `0/9` new transcripts; `Gwn_kEegfJ4` rendered the provider's "Transcript Could Not Be Fetched" page.
- `youtube-transcript.ai`: front-end code exposes `GET https://youtube-transcript.ai/api/subtitles?v=<id>` returning inline VTT when captions are available. The endpoint returned VTT text for `Q59J5roE5lM`, while the priority gap run collected `0/9` new transcripts because no subtitle tracks were returned.
- `YTTranscript.AI`: `/video/<id>` pages call `POST https://yttranscript.ai/api/transcript`. The direct endpoint returned structured transcript rows for `Q59J5roE5lM`, while the priority gap run collected `0/9` new transcripts because those videos returned `NO_CAPTIONS`.
- `GetTranscript`: front-end code exposes `GET https://gettranscript.app/api/video/transcript?videoId=<id>&format=json`. The direct endpoint returned structured segment JSON for `Q59J5roE5lM`, while the priority gap run collected `0/9` and the Kome-failure slice at indices 99-118 collected `0/20`.
- `GetYouTubeText`: front-end code exposes `/api/transcript?url=<youtube-url>` and requires a browser Turnstile token sent as `x-turnstile-token`. The OBU collector returned structured segment JSON for `Q59J5roE5lM`, while the priority gap run collected `0/9` and the index 149-160 slice collected `0/12`.
- `AI Video Summarizer`: browser submission at `https://aivideosummarizer.io/youtube-subtitle-downloader/` returned full subtitles for `Q59J5roE5lM`, unlocked the prior hard case `Gwn_kEegfJ4`, collected the 10-video allocation/passive-income/indexing/options/creator-income/macro-allocation batch, cleared the remaining 17-video high-priority investment/career-wealth gap list, and added 11 more thematic expansion transcripts. Records were stored from IndexedDB `aivideosummarizer` / `tr-history` after page generation completed.
- `Decopy`: front-end code exposes `POST https://api.decopy.ai/api/decopy/youtube-video/create-job2`. The endpoint returned complete subtitle rows for `Q59J5roE5lM`; its text is 8,562 characters and has 0.9217-0.9234 character-level similarity to existing Q59 provider outputs because Decopy keeps different line grouping and punctuation. The same route returned only metadata / extraction-job handoff for the 2026-07-14 six-video hard slice, while the no-caption extraction route returned `User Not Login`, so Decopy is useful as a direct-subtitle cross-check provider, not a current hard-case unlocker.
- `YTVidHub`: front-end chunks expose `/api/subtitle/guest-download/`. The direct guest endpoint returned a full Q59 positive-control transcript with 754 line segments / 8,555 characters and a two-attempt guest quota signal. The same endpoint returned `No subtitles found` for the old Bitcoin video `5TDTxHZXiLE`, so it is useful as another direct-subtitle cross-check provider, not a current old-video hard-case unlocker.
- `UTubeToolkit`: browser inspection found `POST https://utubetoolkit.com/api/transcript/` with payload `{"url":"<youtube-url>"}`. The direct endpoint returned a full Q59 positive-control transcript with 755 rows / 8,529 characters. A 70-video investment-like fallback slice returned `0/70` new transcripts, so it is another working direct-caption cross-check provider, not a current gap filler.
- `SellOnTube`: front-end code exposes `POST /api/get-transcript` and says it pulls existing caption data rather than processing audio. The Q59 positive control returned HTTP 500 in this session, so it is not a confirmed usable provider.
- `SozAI`: public pages advertise no-signup YouTube transcription, but its workflow says it extracts audio and runs AI transcription. That makes it a cloud ASR candidate, not a preferred link-to-caption extractor under the current no-download/no-ASR constraint.
- `AudioConverter.ai`: front-end code exposes `/api/v1/transcriptions/url-info`, `/start`, and `/transcriptions`. A browser UI probe generated a Q59 transcript and showed the provider API response path, but the direct start call requires a signed request. Direct `url-info` probes reported `youtube_has_subtitles: false` for `Gwn_kEegfJ4`, `_9Vjc25BaW4`, and the first 50 videos in the current fallback queue, so this route is currently a subtitle-presence probe / cross-check candidate rather than a bulk gap filler.
- `VideoTranscriber.ai`: public pages claim no-signup YouTube subtitle/transcript generation and the site reuses the same `/api/v1/transcriptions/url-info` style route as AudioConverter. The hard-case `Gwn_kEegfJ4` probe returned metadata with `youtube_has_subtitles: false`, so it is likely subject to the same no-caption extraction/login-or-quota boundary in this session.
- `DownSub`: browser UI recognized `Gwn_kEegfJ4` and its title/duration but returned `Sorry! Subtitles not found.` For `Q59J5roE5lM`, it recognized downloadable subtitle formats/languages, so it is usable as a manual cross-check for some videos but did not unlock the hard case.
- `DownloadYoutubeSubtitles.com`: direct `?u=<youtube-url>` page loading recognizes the Q59 positive-control video and injects a browser call to `/api.php`. The page sometimes lists a static `tutoken`, but the current automated session more often requires Turnstile; a replicated AES/PBKDF2 `/api.php` request without a Turnstile token returned the provider's refresh/expired state. Treat this as a useful manual/browser cross-check source, not a repeatable batch collector in the current session.
- `DeVoice`: the Nuxt app exposes `apiBase: https://api.devoice.io/api`, but static bundle reconnaissance found transcription/user/pay/feedback flows rather than a no-login caption-download endpoint. Keep it below direct-caption providers because it appears closer to an AI transcription product in this session.
- `Scrapingdog`: front-end bundle exposes `https://api.scrapingdog.com/youtube/transcripts_tool?v=<id>&country=us&language=en` behind Turnstile. Browser-page submission failed for both `Gwn_kEegfJ4` and the `Q59J5roE5lM` positive control with the page's generic "Could not fetch the transcript" output, so it is not currently useful for this archive.
- `yttranscript.app`: the site timed out / opened blank in this session, so no provider result was available.
- `NoteGPT`: the user-provided detail URL loaded, but the current page state says the transcription limit has been reached and asks for login. The generic transcript-generator bundle exposes `/api/v2/video-transcript`, `/api/v2/video-transcript-v2`, and `/api/v2/transcript-generate`, but direct unauthenticated requests return `login expired` in this session. Treat it as manually useful, not currently automatable in this browser session.
- `AI Video Summarizer 2026-07-14 quota check`: a later recovery check against `AFB5JNjXjsE` still returned `Your daily guest limit has been reached`, so the provider remains paused for this browser/session.
- `OpusClip`: public pages advertise a YouTube transcript tool, but the site's client access-control endpoint returned `shouldBlock: true` with `blockReason: country` in this environment. Treat it as unavailable unless network/session conditions change.
- `BibiGPT`: public pages advertise no-signup YouTube transcript generation and export. The browser app did not hydrate in the current OBU session; static chunks reveal `https://api.bibigpt.co/api/trpc` and a `video.summaryBySetting` mutation path, but no repeatable unauthenticated transcript request has been confirmed yet.
- `Supadata` and `TranscriptAPI`: public pages are API/credit-key oriented rather than immediately usable no-login browser transcript routes. Keep them as later candidates only if an API key/free-credit workflow is explicitly selected.
- `YouTube Android InnerTube route`: a direct online caption-track probe returned HTTP 400 for the Q59 positive control and then hung on later requests under the current network path. Do not use it as a batch source unless the request format/network is changed and the Q59 positive control passes.
- `2026-07-14 older investment slice`: a 24-video high-value older slice covering Bitcoin, crypto, Tesla, US real estate, US stocks, market-cycle, and Japan-real-estate topics was tested across Kome, GetTranscript, youtube-transcript.ai, and youtubetranscript.pro. Kome was interrupted after 9 consecutive failures; GetTranscript and youtube-transcript.ai returned `0/24`; youtubetranscript.pro returned one file for `xeEd1DEizNE`, but the text was only 136 characters, so the manifest now marks it `partial` rather than `ok`.
- `NoteGPT detail/API follow-up`: the user-provided NoteGPT detail page was inspected through direct HTTP and OBU. The SSR payload had empty `noteDetail`, `transcriptList`, `subtitleList`, and `chapterList`; browser-visible text and page-origin API calls both returned the provider's login/limit state. The marketing route chunks for YouTube subtitle/transcript pages did not expose a no-login generation API beyond the logged-in notes API, so NoteGPT remains a manual/authenticated candidate.
- `2026-07-14 thematic retry`: a 6-video investment-relevant slice (`295d-r85l_I`, `e0CJBzGa0hQ`, `_9Vjc25BaW4`, `VLsbfzuuk6Q`, `1PEjeshVbZw`, `zFeCVunJOoY`) was retried across AI Video Summarizer, Kome, GetTranscript, youtube-transcript.ai, YTTranscript.AI, youtubetranscript.pro, and GetYouTubeText. AI Video Summarizer hit its daily guest limit after two recorded errors; the other six providers returned 0/6 new transcripts. NoteGPT's public downloader page was manually submitted for `_9Vjc25BaW4`, but the page did not advance from the landing state in the current OBU session.
- `FreeYouTubeTranscribe`: public page and front-end code show a caption-track-only design using YouTube caption data, but the real browser Q59 positive-control submission returned `This video is private or age-restricted, so its captions are not accessible.` Treat it as Q59-failed in this environment.
- `TranscribeYouTube`: public page advertises no-signup transcript extraction, but the browser page stayed in a partially loaded `Loading TranscribeYouTube...` state after Q59 submission in this OBU session. No repeatable transcript payload was captured.
- `Transcript.you`: public subtitle downloader page advertises instant subtitle download, but its FAQ says TXT is free for registered users and SRT/VTT require Premium. Keep it below no-login batch providers.
- `Noteey`: browser submission at `https://www.noteey.com/youtube-subtitle-downloader` returned a full Q59 positive-control transcript from `.desktop-transcript-container`, and `scripts/collect_youtube_transcripts_noteey_obu.py` now archives that DOM output. A 6-video hard slice and a 20-video investment-like fallback slice returned 0 new transcripts; clean rerun statuses mostly reported `No transcript found for the video`, so Noteey is a useful browser-rendered cross-check provider, not a current hard-case unlocker.
- `Genelify`: direct HTTP probing returned a Cloudflare challenge page, so it is not currently automatable.
- `SocialKit`: search results and public snippets indicate a free web extractor and API, but direct HTTP probing did not return the page in the current session. Treat it as a later browser-manual candidate rather than a scripted source.

## Provider Results

| Provider | Video id | Result | Notes |
| --- | --- | --- | --- |
| youtubetranscript.pro | `Q59J5roE5lM` | `ok` | Stored as normalized transcript; 755 segments, 8,529 characters. |
| Tactiq | `Q59J5roE5lM` | `ok_crosscheck` | Browser DOM extract; 755 segments, 8,557 characters; 0.9984 similarity to normalized provider transcript. |
| YouTubeToTranscript | `Q59J5roE5lM` | `ok_crosscheck` | Browser DOM extract from `#transcript`; stored as normalized provider transcript. |
| TubeTranscript | `Q59J5roE5lM` | `ok_crosscheck` | Browser DOM extract from timestamped `.transcript-group-box` nodes; stored as normalized provider transcript. |
| Kome | `Q59J5roE5lM` | `ok_crosscheck` | Direct provider API extract; stored as normalized provider transcript. |
| youtube-transcript.io | `Q59J5roE5lM` | `ok_crosscheck` | Browser DOM extract from timestamped transcript rows; stored as normalized provider transcript. |
| youtube-transcript.ai | `Q59J5roE5lM` | `ok_crosscheck` | Direct provider API returned inline VTT; stored as normalized provider transcript. |
| YTTranscript.AI | `Q59J5roE5lM` | `ok_crosscheck` | Direct provider API returned structured transcript rows; stored as normalized provider transcript. |
| GetTranscript | `Q59J5roE5lM` | `ok_crosscheck` | Direct provider API returned structured transcript rows; stored as normalized provider transcript. |
| GetYouTubeText | `Q59J5roE5lM` | `ok_crosscheck` | Browser-token provider API returned structured transcript rows; stored as normalized provider transcript. |
| AI Video Summarizer | `Q59J5roE5lM` | `ok_crosscheck` | Browser page returned a full transcript for the positive-control video. |
| AI Video Summarizer | `Gwn_kEegfJ4` | `ok` | Browser page generated 436 subtitle rows and stored them in IndexedDB; archived as `Gwn_kEegfJ4.provider-aivideosummarizer.txt/json`. |
| AI Video Summarizer | `52XVsVj6b4E` | `ok` | Older allocation anchor; browser page generated 307 subtitle rows and stored them from IndexedDB. |
| AI Video Summarizer | `L7xgc12JfHA` | `ok` | Passive-income video; browser page generated 400 subtitle rows and stored them from IndexedDB. |
| AI Video Summarizer | `hbJ0S2hINWg` | `ok` | Passive-income update; browser page generated 428 subtitle rows and stored them from IndexedDB. |
| AI Video Summarizer | `P6XYXfePAsA` | `ok` | Passive-income update; browser page generated 314 subtitle rows and stored them from IndexedDB. |
| AI Video Summarizer | `e5oYYw1tXbo` | `ok` | Stock-picking versus market backtest video; browser page generated 388 subtitle rows and stored them from IndexedDB. |
| AI Video Summarizer | `lL-aGwCD5xk` | `ok` | High-dividend / optimized-allocation interview; browser page generated 1,665 subtitle rows and stored them from IndexedDB. |
| AI Video Summarizer | `dqAsQyRJHAg` | `ok` | Options explainer; browser page generated 515 subtitle rows and stored them from IndexedDB. |
| AI Video Summarizer | `HL26tMSTqO4` | `ok` | Nexo passive-income / yield-risk video; browser page generated 297 subtitle rows and stored them from IndexedDB. |
| AI Video Summarizer | `KLjed4HMArA` | `ok` | YouTube income / creator unit-economics video; browser page generated 322 subtitle rows and stored them from IndexedDB. |
| AI Video Summarizer | `XJtbWhnclB4` | `ok` | 60/40 rule / global wealth rotation / neutral-assets allocation video; browser page generated 375 subtitle rows and stored them from IndexedDB. |
| AI Video Summarizer | remaining high-priority gap set | `17/17 ok` | Cleared all remaining investment/career-wealth high-priority gaps: Tesla wealth freedom, FIRE Q&A, Tesla add/bull cases, Bitcoin outlook/custody, Japan real estate/lifestyle, crypto de-risking, engineering career/interview, Dubai travel, and US offer topics. Segment counts ranged from 237 to 733 rows. |
| AI Video Summarizer | thematic expansion slice | `11/14 ok` | Added value-investing, inflation/Turkey, engineering-interview, Seattle-house, market-drawdown, OpenAI/high-pay, digital-nomad, bottom-up wealth-path interview, Bitcoin, Tesla, and crypto on/off-ramp transcripts. |
| AI Video Summarizer | thematic expansion failures | `3/14 error` | `mDpxLytPUKg`, `AFB5JNjXjsE`, and `vkIh4XPu1EE` remained on the provider's `AI Generation in Progress` / error state in this session; keep them for later retry or another online provider. |
| AI Video Summarizer | 2026-07-14 thematic retry | `0/6 ok` | `295d-r85l_I` and `e0CJBzGa0hQ` recorded errors after the page reported `Your daily guest limit has been reached`; the run was interrupted before spending time on the remaining four ids. |
| Decopy | `Q59J5roE5lM` | `ok_crosscheck` | Direct provider API returned complete subtitle rows; stored as `Q59J5roE5lM.provider-decopy.txt/json`. Similarity to existing Q59 provider texts is 0.9217-0.9234 due to segmentation/punctuation differences. |
| Decopy | 2026-07-14 thematic retry | `0/6 ok` | The six crypto, AI-bubble, market-volatility, BNB, Japan-real-estate, and US-inequality videos returned no direct subtitle text. Metadata handoff indicates no-caption extraction requires login. |
| YTVidHub | `Q59J5roE5lM` | `ok_crosscheck` | Direct guest endpoint returned full text; stored as `Q59J5roE5lM.provider-ytvidhub.txt/json`. |
| YTVidHub | `5TDTxHZXiLE` | `provider_failed` | Direct guest endpoint returned `No subtitles found. Available languages:` for the old Bitcoin video. |
| UTubeToolkit | `Q59J5roE5lM` | `ok_crosscheck` | Direct `/api/transcript/` endpoint returned full structured caption rows; stored as `Q59J5roE5lM.provider-utubetoolkit.txt/json`. |
| UTubeToolkit | investment-like fallback slice | `0/70 ok` | The 70 selected investment, crypto, Tesla, real-estate, income, and market videos returned provider failures / no transcript text. |
| SellOnTube | `Q59J5roE5lM` | `provider_failed` | Direct `/api/get-transcript` positive-control request returned HTTP 500 in this session. |
| SozAI | site/API reconnaissance | `cloud_asr_candidate` | Public workflow describes extracting audio and transcribing with AI, so it is not the preferred caption-extraction path for this task. |
| AudioConverter.ai | first 50 fallback-queue videos | `0/50 has_subtitles` | Direct `url-info` probes succeeded but returned `youtube_has_subtitles: false` for all tested queue entries. Q59 remains browser-confirmed usable for positive-control cross-checking. |
| VideoTranscriber.ai | `Gwn_kEegfJ4` | `provider_failed` | Direct `url-info` probe returned metadata but `youtube_has_subtitles: false`; no raw text was available without triggering a signed/no-caption transcription flow. |
| AI Video Summarizer | `AFB5JNjXjsE` quota recovery check | `quota_limited` | The 2026-07-14 recovery check still showed `Your daily guest limit has been reached`; the run was interrupted before spending quota-state time on additional ids. |
| OpusClip | site-level probe | `blocked` | Client access-control returned country blocking, so no transcript extraction route was usable in this environment. |
| BibiGPT | site/API reconnaissance | `not_automated` | Browser app did not hydrate; static chunks expose an API base and tRPC video summary mutation, but no verified unauthenticated request/response transcript path yet. |
| Supadata / TranscriptAPI | site reconnaissance | `api_key_or_credit_candidate` | Public pages appear API-key/credit oriented rather than a no-login batch source for this archive. |
| YouTube Android InnerTube | `Q59J5roE5lM` and hard-case probe | `provider_failed` | Positive control returned HTTP 400 and later requests hung, so this route is currently unreliable. |
| NoteGPT | `rF5thvdRjnE` detail/API follow-up | login/limit blocked | Direct SSR payload contained no transcript data; OBU page text and credentialed `/api/v2/notes/get-video-by-id` calls returned `login expired` / transcription limit state. |
| Kome | 2026-07-14 older investment slice | interrupted after `0/9 ok` | The high-value older crypto/Tesla/real-estate slice produced 9 consecutive provider errors before the low-yield run was interrupted. |
| GetTranscript | 2026-07-14 older investment slice | `0/24 ok` | Direct API returned provider failures for the 24 selected older investment videos. |
| youtube-transcript.ai | 2026-07-14 older investment slice | `0/24 ok` | Subtitle API returned no usable transcript tracks for the 24 selected older investment videos; `pbzs6A-topY` recorded an error. |
| youtubetranscript.pro | 2026-07-14 older investment slice | `1 partial / 24` | Returned a 136-character `xeEd1DEizNE` file consisting only of intro/music fragments. Raw file is preserved, but manifest marks it `partial` and analysis excludes it. |
| Kome | 2026-07-14 thematic retry | `0/6 ok` | All six selected crypto, AI-bubble, market-volatility, BNB, Japan-real-estate, and US-inequality videos returned errors/no usable transcript text. |
| GetTranscript | 2026-07-14 thematic retry | `0/6 ok` | Direct API returned provider failures for all six selected videos. |
| youtube-transcript.ai | 2026-07-14 thematic retry | `0/6 ok` | Subtitle API returned no usable transcript tracks for all six selected videos. |
| YTTranscript.AI | 2026-07-14 thematic retry | `0/6 ok` | Transcript API returned provider failures / no-caption results for all six selected videos. |
| youtubetranscript.pro | 2026-07-14 thematic retry | `0/6 ok` | Existing direct provider endpoint returned provider failures for all six selected videos. |
| GetYouTubeText | 2026-07-14 thematic retry | `0/6 ok` | Browser-token provider route returned five provider failures and one browser-side error, adding no transcript text. |
| NoteGPT | `_9Vjc25BaW4` public downloader page | manual/browser probe not usable | The YouTube Subtitle Downloader page accepted the URL into the input, but automated clicks did not advance to a detail/transcript result page in this OBU session. |
| youtubetranscript.pro | `GHBP2FS9tBc` | `ok` | Stored as normalized transcript; 544 segments, 8,612 characters. |
| youtubetranscript.pro | first 10 ASR-priority videos | `1/10 ok` | Only `Q59J5roE5lM` succeeded. |
| youtubetranscript.pro | high-priority gap set | `1/28 ok` in the second run | Only `GHBP2FS9tBc` was newly collected; `Q59J5roE5lM` was already stored. |
| Tactiq | priority and bounded high-priority gaps | `0/21 ok` after the Q59 positive-control run | `provider-probes/tactiq-manifest.json` records 22 rows total: 1 ok, 20 provider_failed, 1 error. |
| YouTubeToTranscript | priority gaps | `0/9 ok` after the Q59 positive-control run | `provider-probes/youtubetotranscript-manifest.json` records 11 rows total: 1 ok, 10 provider_failed. |
| TubeTranscript | priority gaps | `0/9 ok` after the Q59 positive-control run | `provider-probes/tubetranscript-manifest.json` records 10 rows total: 1 ok, 9 provider_failed. |
| Kome | priority gaps | `0/9 ok` after the Q59 positive-control run | `provider-probes/kome-manifest.json` records 10 rows total: 1 ok, 9 provider_failed. |
| Kome | partial missing-video scan through index 98 | `20 new unique transcripts` | Stored as `*.provider-kome.txt/json`; scan was manually stopped after a long low-yield failure run. |
| Kome | missing-video slice indices 99-148 | `0/50 ok` | Confirms the post-98 low-yield region should not be rerun blindly. |
| youtube-transcript.io | priority gaps | `0/9 ok` after the Q59 positive-control run | `provider-probes/youtubetranscript-io-manifest.json` records 10 rows total: 1 ok, 9 provider_failed. |
| youtube-transcript.ai | priority gaps | `0/9 ok` after the Q59 positive-control run | `provider-probes/youtubetranscript-ai-manifest.json` records 10 rows total: 1 ok, 9 provider_failed. |
| YTTranscript.AI | priority gaps | `0/9 ok` after the Q59 positive-control run | `provider-probes/yttranscript-ai-manifest.json` records 10 rows total: 1 ok, 9 provider_failed. |
| GetTranscript | priority gaps | `0/9 ok` after the Q59 positive-control run | `provider-probes/gettranscript-manifest.json` records the priority failures. |
| GetTranscript | missing-video slice indices 99-118 | `0/20 ok` | Direct API did not fill the Kome-failure slice. |
| GetYouTubeText | priority gaps | `0/9 ok` after the Q59 positive-control run | `provider-probes/getyoutubetext-manifest.json` records the priority failures. |
| GetYouTubeText | missing-video slice indices 149-160 | `0/12 ok` | OBU token API did not fill this slice; one item hit an OBU timeout and the rest returned provider failures. |
| DownloadYoutubeSubtitles.com | `Q59J5roE5lM` | `manual_crosscheck_available` | Browser page listed Chinese SRT/VTT/TXT download buttons; direct TXT download is Cloudflare-gated in this session. |
| DownloadYoutubeSubtitles.com | `Q59J5roE5lM` direct `/api.php` replication | `turnstile_blocked` | The page exposed `sid`, `hash`, `hl`, and `htoken`; an AES/PBKDF2 token replay without Turnstile returned the provider's refresh/expired message. |
| DownloadYoutubeSubtitles.com | `Gwn_kEegfJ4` | `provider_failed` | Browser page explicitly returned no subtitles for the public asset-allocation video. |
| DownSub | `Gwn_kEegfJ4` | `provider_failed` | Recognized the video but returned no subtitles. |
| DownSub | `Q59J5roE5lM` | `manual_crosscheck_available` | Recognized downloadable subtitle formats/languages. |
| DownSub | direct HTTP route | `cloudflare_challenge` | Current direct requests return a Cloudflare challenge, so browser/manual use is safer than scripted batch use. |
| DeVoice | site/API reconnaissance | `not_confirmed` | Bundle exposes `https://api.devoice.io/api`, but no unauthenticated caption-download request was confirmed; detected flows skew toward transcription/product account APIs. |
| Scrapingdog | `Gwn_kEegfJ4`, `Q59J5roE5lM` | `provider_failed` | Browser UI failed for both hard case and positive control. |
| yttranscript.app | site | `unreachable` | Browser opened blank; direct HTTP request timed out. |
| NoteGPT | `rF5thvdRjnE` detail URL | login/limit blocked | Page says transcription limit reached. |
| Genelify | site | Cloudflare challenge | Direct HTTP route blocked before reaching the tool UI. |
| SocialKit | site | direct HTTP timeout | Keep as a later manual/browser candidate. |

## Commands

```sh
python3 scripts/collect_youtube_transcripts_provider.py --priority-list
python3 scripts/collect_youtube_transcripts_provider.py --video-id Q59J5roE5lM
python3 scripts/collect_youtube_transcripts_tactiq_obu.py --video-id Q59J5roE5lM --include-existing --force
python3 scripts/collect_youtube_transcripts_tactiq_obu.py --priority-list
python3 scripts/collect_youtube_transcripts_youtubetotranscript_obu.py --video-id Q59J5roE5lM --include-existing --force
python3 scripts/collect_youtube_transcripts_youtubetotranscript_obu.py --priority-list
python3 scripts/collect_youtube_transcripts_tubetranscript_obu.py --video-id Q59J5roE5lM --include-existing --force
python3 scripts/collect_youtube_transcripts_tubetranscript_obu.py --priority-list
python3 scripts/collect_youtube_transcripts_kome.py --video-id Q59J5roE5lM --include-existing --force
python3 scripts/collect_youtube_transcripts_kome.py --priority-list
python3 scripts/collect_youtube_transcripts_youtubetranscript_io_obu.py --video-id Q59J5roE5lM --include-existing --force
python3 scripts/collect_youtube_transcripts_youtubetranscript_io_obu.py --priority-list
python3 scripts/collect_youtube_transcripts_youtubetranscript_ai.py --video-id Q59J5roE5lM --include-existing --force
python3 scripts/collect_youtube_transcripts_youtubetranscript_ai.py --priority-list
python3 scripts/collect_youtube_transcripts_yttranscript_ai.py --video-id Q59J5roE5lM --include-existing --force
python3 scripts/collect_youtube_transcripts_yttranscript_ai.py --priority-list
python3 scripts/collect_youtube_transcripts_gettranscript.py --video-id Q59J5roE5lM --include-existing --force
python3 scripts/collect_youtube_transcripts_gettranscript.py --priority-list
python3 scripts/collect_youtube_transcripts_getyoutubetext_obu.py --video-id Q59J5roE5lM --include-existing --force
python3 scripts/collect_youtube_transcripts_getyoutubetext_obu.py --priority-list
python3 scripts/collect_youtube_transcripts_aivideosummarizer_obu.py --video-id 52XVsVj6b4E --timeout-seconds 180
python3 scripts/collect_youtube_transcripts_aivideosummarizer_obu.py --timeout-seconds 180
python3 scripts/collect_youtube_transcripts_aivideosummarizer_obu.py --video-id KLjed4HMArA --video-id XJtbWhnclB4 --timeout-seconds 180
python3 scripts/collect_youtube_transcripts_aivideosummarizer_obu.py --video-id kE1NjL9hQxo --video-id YMjsNbiWTj8 --video-id nONnDP5-SLA --video-id ZLbtMwcjWSA --video-id eoQIAlQkCgc --timeout-seconds 180
python3 scripts/collect_youtube_transcripts_aivideosummarizer_obu.py --video-id NhJ1fqtsmc8 --video-id kUtyH9Lh17c --video-id p2E0OyTKDv4 --video-id WtLdnzwpZ8Y --video-id qenBa_WIpPE --timeout-seconds 180
python3 scripts/collect_youtube_transcripts_aivideosummarizer_obu.py --video-id 295d-r85l_I --video-id e0CJBzGa0hQ --video-id _9Vjc25BaW4 --video-id VLsbfzuuk6Q --video-id 1PEjeshVbZw --video-id zFeCVunJOoY --timeout-seconds 180
python3 scripts/collect_youtube_transcripts_kome.py --video-id 295d-r85l_I --video-id e0CJBzGa0hQ --video-id _9Vjc25BaW4 --video-id VLsbfzuuk6Q --video-id 1PEjeshVbZw --video-id zFeCVunJOoY --timeout 30 --delay 1
python3 scripts/collect_youtube_transcripts_gettranscript.py --video-id 295d-r85l_I --video-id e0CJBzGa0hQ --video-id _9Vjc25BaW4 --video-id VLsbfzuuk6Q --video-id 1PEjeshVbZw --video-id zFeCVunJOoY --timeout 30 --delay 1
python3 scripts/collect_youtube_transcripts_youtubetranscript_ai.py --video-id 295d-r85l_I --video-id e0CJBzGa0hQ --video-id _9Vjc25BaW4 --video-id VLsbfzuuk6Q --video-id 1PEjeshVbZw --video-id zFeCVunJOoY --timeout 30 --delay 1
python3 scripts/collect_youtube_transcripts_yttranscript_ai.py --video-id 295d-r85l_I --video-id e0CJBzGa0hQ --video-id _9Vjc25BaW4 --video-id VLsbfzuuk6Q --video-id 1PEjeshVbZw --video-id zFeCVunJOoY --timeout 30 --delay 1
python3 scripts/collect_youtube_transcripts_provider.py --video-id 295d-r85l_I --video-id e0CJBzGa0hQ --video-id _9Vjc25BaW4 --video-id VLsbfzuuk6Q --video-id 1PEjeshVbZw --video-id zFeCVunJOoY --timeout 30 --delay 1
python3 scripts/collect_youtube_transcripts_getyoutubetext_obu.py --video-id 295d-r85l_I --video-id e0CJBzGa0hQ --video-id _9Vjc25BaW4 --video-id VLsbfzuuk6Q --video-id 1PEjeshVbZw --video-id zFeCVunJOoY --browser chrome --profile Default --timeout 30 --delay 1 --page-wait-seconds 8 --finalize-tabs
python3 scripts/collect_youtube_transcripts_decopy.py --video-id Q59J5roE5lM --include-existing --force --delay 0.5
python3 scripts/collect_youtube_transcripts_decopy.py --video-id 295d-r85l_I --video-id e0CJBzGa0hQ --video-id _9Vjc25BaW4 --video-id VLsbfzuuk6Q --video-id 1PEjeshVbZw --video-id zFeCVunJOoY --include-existing --force --delay 2 --timeout 60
python3 scripts/collect_youtube_transcripts_ytvidhub.py --video-id Q59J5roE5lM --video-id 5TDTxHZXiLE --include-existing --force --timeout 45 --delay 1
python3 scripts/collect_youtube_transcripts_utubetoolkit.py --video-id Q59J5roE5lM --video-id AFB5JNjXjsE --include-existing --force --timeout 45 --delay 1
python3 scripts/collect_youtube_transcripts_utubetoolkit.py --investment-like --timeout 45 --delay 0.5
python3 scripts/collect_youtube_transcripts_shrp.py --video-id Q59J5roE5lM --include-existing --force --timeout 75 --delay 0.5
python3 scripts/collect_youtube_transcripts_shrp.py --investment-like --limit 20 --timeout 75 --delay 1
python3 scripts/collect_youtube_transcripts_noteey_obu.py --video-id Q59J5roE5lM --include-existing --force --wait-attempts 45 --timeout 90 --delay 0.5
python3 scripts/collect_youtube_transcripts_noteey_obu.py --video-id 295d-r85l_I --video-id e0CJBzGa0hQ --video-id _9Vjc25BaW4 --video-id VLsbfzuuk6Q --video-id 1PEjeshVbZw --video-id zFeCVunJOoY --force --wait-attempts 15 --timeout 45 --delay 0.5
python3 scripts/collect_youtube_transcripts_noteey_obu.py --investment-like --limit 20 --force --wait-attempts 15 --timeout 45 --delay 0.5
python3 scripts/collect_youtube_transcripts_obu.py --skip-index --skip-transcripts --rebuild-manifest
python3 scripts/analyze_terry_youtube_corpus.py
python3 scripts/synthesize_terry_investment_report.py
python3 scripts/verify_terry_research_archive.py
```

## 2026-07-14 Fresh Provider Pass

- `SHRP`: the tool page exposes `POST https://shrp.app/api/youtube-captions` with payload `{"url":"<youtube-url>","language":"en"}`. The Q59 positive control succeeded with 755 lines / 8,529 characters and wrote `Q59J5roE5lM.provider-shrp.txt/json`. A 20-video investment-like fallback run returned 0 new transcripts: early failures were `noCaptions`, and the later slice hit the site's free quota (`429 Daily limit reached`). SHRP is useful as a no-login direct-caption cross-check, but not as a blind full-channel scanner under the current quota.
- `NoteLM.ai`: the current tool page is `https://www.notelm.ai/youtube-transcript-generator`. Static bundle inspection found `POST /api/youtube-video-info` and `POST /api/youtube-transcript` with `action:"list"` / `action:"transcript"` request shapes. The real Chrome page loaded through OBU, but browser-origin Q59 positive-control calls to both endpoints timed out / aborted after 8 seconds; direct HTTP calls timed out after 35 seconds. No repeatable transcript payload was captured.
- `WayinVideo`: public page copy says the tool works even when captions are unavailable, which means it is likely an online cloud transcription route rather than a pure existing-caption extractor. Direct page access returned HTTP 451 in this environment.
- `AI Video Summarizer`: a fresh recovery retry for `AFB5JNjXjsE` still ended in `AI Generation in Progress` / `Your daily guest limit has been reached`. No transcript text was written.
- `Noteey` and adjacent search-result providers: Noteey passed Q59 through a browser-rendered transcript container and is now scripted as a DOM cross-check provider, but it returned 0/6 on the hard thematic slice and 0/20 on the investment-like fallback slice. FreeYouTubeTranscribe failed Q59 in-browser, TranscribeYouTube did not complete a usable browser submission, and Transcript.you requires account/Premium for the relevant downloads.

| Provider | Video id | Result | Notes |
| --- | --- | --- | --- |
| SHRP | `Q59J5roE5lM` | `ok_crosscheck` | Direct `/api/youtube-captions` endpoint returned Chinese transcript text plus SRT/VTT; stored as `Q59J5roE5lM.provider-shrp.txt/json`. |
| SHRP | investment-like fallback slice | `0/20 ok` | Several videos returned `noCaptions`; the run then hit `429 Daily limit reached`. |
| Noteey | `Q59J5roE5lM` | `ok_crosscheck` | Browser DOM extract from `.desktop-transcript-container`; stored as `Q59J5roE5lM.provider-noteey.txt/json`. |
| Noteey | 2026-07-14 thematic retry | `0/6 ok` | The six crypto, AI-bubble, market-volatility, BNB, Japan-real-estate, and US-inequality videos returned no new transcript text. |
| Noteey | investment-like fallback slice | `0/20 ok` | The bounded slice returned no new unique transcripts; use Noteey for cross-checking videos with accessible subtitle tracks only. |
| FreeYouTubeTranscribe | `Q59J5roE5lM` | `provider_failed` | Browser page positive control returned a private/age-restricted caption error, despite Q59 being available through other providers. |
| TranscribeYouTube | `Q59J5roE5lM` | `not_automated` | Browser page did not complete hydration/submission in this OBU session; no transcript payload was captured. |
| Transcript.you | site-level probe | `login_or_premium_candidate` | Relevant downloads require registration or Premium. |
| NoteLM.ai | `Q59J5roE5lM` | `error` | Page and API route discovered, but Q59 positive-control fetches timed out from both direct HTTP and OBU browser-origin requests. |
| WayinVideo | `Q59J5roE5lM` | `blocked` | Direct page access returned HTTP 451; likely online cloud transcription for no-caption cases rather than pure caption extraction. |
| AI Video Summarizer | `AFB5JNjXjsE` | `quota_limited` | Latest recovery check still shows guest-limit / generation-in-progress state. |

## Next Provider Work

- Continue testing additional online transcript sites from the provider search list only when they are likely to add a new route; several working online providers now agree that the current priority gaps do not expose subtitle tracks.
- Use `Q59J5roE5lM` as the cross-provider positive control because multiple providers agree on it.
- Use Decopy for direct-subtitle cross-checking and bounded probes, but do not rely on it for no-caption videos unless an authenticated/manual export path is available and recorded.
- Use YTVidHub for direct-subtitle cross-checking in bounded probes. It has a low guest quota and did not unlock `5TDTxHZXiLE`, so avoid blind scans.
- Use UTubeToolkit for direct-caption cross-checking in bounded probes. It passed Q59, but a 70-video investment-like slice returned no new gap coverage.
- Use SHRP for direct-caption cross-checking in bounded probes only. It passed Q59 but has a small free quota and returned no new text for the first 20 investment-like fallback videos.
- Use Noteey for bounded browser-rendered cross-checks when a video already appears likely to have accessible subtitle tracks; do not rerun the same hard fallback slice unless provider behavior changes.
- Keep AudioConverter.ai and VideoTranscriber.ai as later candidates only if their signed/no-caption flow becomes repeatable; current direct probes are useful for subtitle-presence checks but did not expose raw text for the fallback queue.
- Keep BibiGPT as a possible later API/browser route only if the app hydrates or the tRPC call shape is confirmed against Q59. Do not treat the static chunk discovery alone as a usable provider.
- Skip OpusClip from the current environment unless the access-control country block changes.
- Do not use generic YouTube InnerTube probing for bulk collection until the Q59 positive control succeeds.
- Treat very short provider outputs as partial raw evidence, not useful transcript coverage. The manifest rebuild now applies a minimum useful-provider-text threshold, and downstream analysis reads one canonical `ok` transcript per video rather than every cross-check file.
- Treat all high-priority investment/career-wealth gaps as solved for first-pass text by AI Video Summarizer, but still hard cases for cross-provider validation because other tested providers failed to expose many of them or were not rerun for the latest ids.
- Do not expand Tactiq to a full-channel scan unless the provider behavior changes; the bounded run found no new text beyond the positive control.

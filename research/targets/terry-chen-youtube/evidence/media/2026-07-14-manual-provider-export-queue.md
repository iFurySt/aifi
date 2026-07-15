# Terry Manual Provider Export Queue

## Metadata

- Target: Terry Chen YouTube channel
- Artifact type: Manual/authenticated online-provider export queue
- Generated: 2026-07-14
- Constraint: Use YouTube links in online provider pages only; do not download video/audio and do not run local ASR.
- Source priority artifact: `2026-07-14-transcript-gap-priority.json`

## Provider Pages

- [YouTLDR](https://you-tldr.com/)
- [AI Video Summarizer](https://aivideosummarizer.io/youtube-subtitle-downloader/)
- [NoteGPT Subtitle Downloader](https://notegpt.io/youtube-subtitle-downloader)
- [NoteGPT Transcript Downloader](https://notegpt.io/youtube-transcript-downloader)
- [BibiGPT Subtitle Downloader](https://bibigpt.co/en/features/youtube-subtitle-downloader)
- [YoutubeToText.ai](https://youtubetotext.ai/)
- [VideoToBe](https://videotobe.com/youtube-transcript)
- [YouVideoToText](https://www.youvideototext.com/)

## How To Use

1. Open one provider page in an authenticated browser session if needed.
2. Paste the YouTube URL from the table.
3. Export or copy TXT/SRT/VTT transcript text if the provider returns it.
4. Save the text with the video id in the filename, then import it through the archive's external transcript import path.
5. Skip any flow that asks for local video/audio download or local file upload unless the user explicitly approves a separate ASR route.

## Tier 1 Queue

| Rank | Score | Video | Title | Categories | YouTube URL |
| ---: | ---: | --- | --- | --- | --- |

## Current Provider State

- YouTLDR solved 215 hard-case / Tier 2 videos through anonymous URL ingestion and provider-side `whisper` transcripts.
- `diU75OZiuX8`, `e0CJBzGa0hQ`, and `1PEjeshVbZw` initially failed with provider-side HTTP 403 but later succeeded, so YouTLDR failures can be transient; the Tier 1 manual/provider queue is currently empty.
- The latest Tier 2 / Tier 3 YouTLDR failures are `9Ecx6g8ez1k`, `DcXyt4C-07E`, `FusQOi4BGYw`, `sK-IzrpapTo`, `rIupufjIp5M`; keep them for a later bounded retry or authenticated/manual provider path.
- AI Video Summarizer remains useful after quota/login state changes, but the latest guest-state retry reached `Your daily guest limit has been reached. Please log in to continue.`

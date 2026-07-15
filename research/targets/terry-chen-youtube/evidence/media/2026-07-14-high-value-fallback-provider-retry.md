# High-Value Fallback Provider Retry

## Metadata

- Target: Terry Chen YouTube channel
- Artifact type: Provider retry matrix for remaining high-value transcript gaps
- Generated: 2026-07-14
- Source inventory: `youtube-video-index.json`
- Fallback queue: `asr/queue.json`
- Provider manifests:
  - `provider-probes/aivideosummarizer-manifest.json`
  - `provider-probes/kome-manifest.json`
  - `provider-probes/gettranscript-manifest.json`
  - `provider-probes/youtubetranscript-ai-manifest.json`
  - `provider-probes/insightstube-manifest.json`
- Constraint: This retry used online YouTube-link-to-transcript/subtitle providers only. It did not download video/audio and did not run local ASR.

## Result

No new usable transcript text was recovered in this slice.

AI Video Summarizer was retried on `AFB5JNjXjsE` and again returned a detail page stuck at `AI Generation in Progress`. The same provider manifest already contains a prior guest-limit / sign-in error for `5TDTxHZXiLE`, so it remains paused for this browser/session until quota/login state changes.

Kome, GetTranscript, and youtube-transcript.ai were retried across the 12-video high-value slice below. They returned no usable transcript text for the slice. Their raw provider statuses are preserved in the provider manifests listed above.

InsightsTube was added after this matrix was first created. It passed the Q59 positive control with 755 returned segments, then returned HTTP 422 / no usable transcript for `AFB5JNjXjsE` and `bsN8REhmr6M`. This makes it another useful direct-caption cross-check provider, but not a current no-caption hard-case unlocker.

## Retry Matrix

| Index | Video | Why high value | AI Video Summarizer | Kome | GetTranscript | youtube-transcript.ai | InsightsTube |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 42 | `AFB5JNjXjsE` - 如何保護你的長期投資倉位？ | Long-term position protection / risk controls. | error / pending / quota | no usable transcript | no usable transcript | no usable transcript | no usable transcript |
| 53 | `1PEjeshVbZw` - 不會日文也能投資日本房地產？這家公司幫海外投資人解決所有問題 | Japan real-estate investing route. | not retried in this slice | no usable transcript | no usable transcript | no usable transcript | not retried in this slice |
| 77 | `diU75OZiuX8` - 完全免費的美股投資研究神器 #moomoo | US-stock research workflow / tooling. | not retried in this slice | error | no usable transcript | no usable transcript | not retried in this slice |
| 80 | `bsN8REhmr6M` - 沒人講的比特幣風險，你確定要投資？ | Bitcoin risk framing. | not retried in this slice | no usable transcript | no usable transcript | no usable transcript | no usable transcript |
| 127 | `BgfTSZXNUa0` - 投資特斯拉消逝的四年 | Tesla holding history. | not retried in this slice | no usable transcript | no usable transcript | no usable transcript | not retried in this slice |
| 153 | `mkRNzJ5iasA` - 投資美股怎麼選？（非業配） | US-stock selection process. | not retried in this slice | no usable transcript | no usable transcript | no usable transcript | not retried in this slice |
| 156 | `9QRA-rCUA5U` - 為什麼分配5%的資產在加密貨幣 | Crypto allocation rationale. | not retried in this slice | no usable transcript | no usable transcript | no usable transcript | not retried in this slice |
| 171 | `WL47wW4ail8` - 不要投資特斯拉 | Tesla anti-thesis / risk boundary. | not retried in this slice | no usable transcript | no usable transcript | no usable transcript | not retried in this slice |
| 175 | `pbzs6A-topY` - 從ALL IN比特幣的工程師到華人首富 | Bitcoin all-in founder / wealth case. | not retried in this slice | no usable transcript | no usable transcript | no usable transcript | not retried in this slice |
| 197 | `kXVlrSjSPUE` - 投資特斯拉的致命風險 | Tesla fatal-risk thesis. | not retried in this slice | no usable transcript | no usable transcript | no usable transcript | not retried in this slice |
| 252 | `qefEi0grWeA` - Anchor被動收入教學｜回答大家問題 | Anchor passive-income follow-up. | not retried in this slice | no usable transcript | no usable transcript | no usable transcript | not retried in this slice |
| 275 | `5TDTxHZXiLE` - 為什麼投資比特幣 | Early Bitcoin thesis. | error / pending / quota | no usable transcript | no usable transcript | no usable transcript | not retried in this slice |

## Interpretation

This slice overlaps strongly with the user's requested final analysis: position protection, real-estate investing, stock-research workflow, Bitcoin risk and thesis, Tesla risk/holding history, crypto allocation, and Anchor passive-income follow-up.

The current failure pattern suggests these videos either have no accessible subtitle tracks for direct-caption providers or require a provider that performs its own cloud transcription after link submission. Under the current user constraint, those cloud-transcription providers remain acceptable only if they return text from a link without us downloading video/audio locally, and they should be marked distinctly from direct-caption providers.

## Next Routing

Use one of these before retrying this exact slice:

1. A changed AI Video Summarizer session state, such as login or quota reset.
2. A new online provider that passes the Q59 positive control and can handle no-caption videos from links. InsightsTube passes Q59 but does not currently meet the no-caption requirement for tested hard cases.
3. A manual/authenticated export route from NoteGPT or a similar provider that the user can access in-browser.
4. Last-resort ASR only if explicitly approved, because the active route remains online link-based subtitle/transcript extraction.

# Final Members-Only Boundary Check

## Metadata

- Target: Terry Chen YouTube channel
- Artifact type: Remaining fallback boundary evidence
- Generated: 2026-07-14
- Constraint: URL-only online transcript/subtitle extraction. No video/audio download and no local ASR were used.
- Browser route: Open Browser Use against the user's Chrome profile.

## Result

The remaining five fallback videos are not just ordinary no-caption misses. In the user's Chrome session, YouTube itself marks every one as `UNPLAYABLE` members-only content and exposes no `captionTracks` in `ytInitialPlayerResponse`.

| Video | Title | YouTube browser status | Captions in player response |
| --- | --- | --- | --- |
| `9Ecx6g8ez1k` | 當我以為我是絕命毒師 | `UNPLAYABLE`; join channel / members-only message | none |
| `DcXyt4C-07E` | 開箱不丹 Paro 最有特色的 五星級 傳統宮殿飯店 | `UNPLAYABLE`; Loyal Hackbear or higher | none |
| `FusQOi4BGYw` | 越南來都來了 | `UNPLAYABLE`; Loyal Hackbear or higher | none |
| `sK-IzrpapTo` | 開箱我買的房車，公開價格，沒錯我之後就住這 | `UNPLAYABLE`; Loyal Hackbear or higher | none |
| `rIupufjIp5M` | 各位觀眾 | `UNPLAYABLE`; join channel / members-only message | none |

## Harku Probe

Harku was tested because its public YouTube Transcript Generator claims AI transcription from YouTube links and no signup for supported videos.

Observed browser-origin routes:

- `POST /api/turnstile/verify`
- `POST /api/youtube-transcript/preview`

For `rIupufjIp5M`, Harku returned HTTP 403:

```json
{
  "success": false,
  "status": "restricted",
  "code": "youtube_link_restricted",
  "error": "This YouTube link is restricted or unavailable. Upload the audio/video file for the most reliable result.",
  "cached": false,
  "uploadSuggested": true
}
```

The page then showed the same boundary in the UI and recommended uploading a local audio/video file. That upload path is intentionally out of scope for this archive because the user asked for link-based online extraction, not video/audio download or local ASR.

After the first restricted URL, probing the other four fallback URLs through the same preview route returned HTTP 429 `guest_new_url_daily_limit`, with `authRequired: true` and `uploadSuggested: true`. This makes Harku a manual/authenticated changed-state candidate, not a current raw-text source.

## Completion Implication

The current 286-transcript archive is blocked on access rights for the remaining five videos, not on ordinary caption-provider coverage. A compliant completion path needs one of:

1. The user's authenticated YouTube/browser session having channel-member access and exposing captions or playable audio through an online provider.
2. A provider account/session that can legally access and transcribe members-only YouTube URLs from the link alone.
3. User-approved manual export text from a members-only page or provider.

Do not replace this with local video/audio download or local ASR under the current constraint.

# Wayin / YouVideoToText Provider Recon

## Metadata

- Target: Terry Chen YouTube channel
- Artifact type: Online YouTube-link transcript provider reconnaissance
- Generated: 2026-07-14
- Constraint: Providers were inspected through YouTube URL submission routes only. No video/audio file was downloaded locally and no local ASR was run.
- Positive control intended: `Q59J5roE5lM`
- Tier 1 hard-case intended: `AFB5JNjXjsE`

## Summary

This pass checked two more online YouTube-to-text candidates. Neither produced new transcript text in the current session.

| Provider | Public claim / route | Probe result | Routing decision |
| --- | --- | --- | --- |
| Wayin.ai | Search result claims YouTube transcript generation even without captions, no login needed. | `https://wayin.ai/tools/video-transcript-generator/youtube/` returned HTTP `451` in this environment, with an empty `<div></div>` body through curl. | Same boundary as the earlier WayinVideo probe: inaccessible in this environment. Do not retry unless access changes. |
| YouVideoToText / youtubetotext.org redirect | `https://youtubetotext.org/` redirects to `https://www.youvideototext.com/`; page claims YouTube video to text for regular videos, Shorts, and live streams. | Page and frontend chunks load, but submission requires Cloudflare Turnstile before the server action runs. Frontend explicitly blocks submit with `Please complete the captcha and try again.` | Real browser/manual candidate; not a scriptable no-login source in this session. |

## Wayin.ai Details

Observed request:

```text
GET https://wayin.ai/tools/video-transcript-generator/youtube/
result: HTTP 451, body length 11, "<div></div>"
```

Interpretation: no API route was inspected because the public page is blocked in this environment.

## YouVideoToText Details

Observed routes:

```text
GET https://youtubetotext.org/
result: HTTP 301 -> https://www.youvideototext.com/

GET https://www.youvideototext.com/
result: HTTP 200, Next.js page with transcript-generation UI.
```

Frontend chunk inspected:

- `https://www.youvideototext.com/_next/static/chunks/116714xay538g.js`

Relevant frontend behavior:

```text
if ("success" !== captchaState || !captchaToken) {
  show "Please complete the captcha and try again."
}

payload includes:
{
  videoURL,
  language,
  userID,
  captchaToken,
  source,
  isProMember
}

possible provider results include:
"must-auth", "limit", "robot", "no captions", "member-only", "country", "private", "age", "copyright", "removed"
```

The same chunk includes text saying the tool requires accessible captions or automated subtitles for some failure cases:

```text
The video does not contain accessible captions or automated subtitles, which are required for us to generate the text.
```

Interpretation: YouVideoToText may be usable manually in a browser session that can solve Turnstile, but it should not be treated as a repeatable automated provider. Its failure copy also suggests it may still depend on accessible captions for at least some paths.

## Routing Decision

Keep `YouVideoToText` as a manual/browser candidate after authenticated/Turnstile-capable providers such as NoteGPT, YoutubeToText.ai, VideoToBe, and AI Video Summarizer. Keep `Wayin.ai` below the current route until HTTP 451 clears.

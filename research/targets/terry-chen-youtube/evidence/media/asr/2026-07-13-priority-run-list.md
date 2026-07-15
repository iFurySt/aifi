# Terry YouTube ASR Priority Run List

## Metadata

- Target: Terry Chen YouTube channel
- Evidence type: Historical ASR prioritization note; current priority batch is solved by online transcript providers
- Source: `youtube-video-index.json`, `2026-07-13-high-priority-transcript-gaps.json`, available transcript evidence
- Source URL: https://www.youtube.com/@hackbearterry/videos
- Retrieved: 2026-07-13
- Published: Mixed historical public videos
- Coverage period: Historical transcript gap queue; superseded for the selected first batch by AI Video Summarizer transcript captures
- Confidence: High that these were the right first-batch videos; ASR is no longer required for this batch unless provider text needs independent machine-transcription cross-checking.
- Raw file: `queue.json`, `../2026-07-13-high-priority-transcript-gaps.json`

## First Priority Batch

These were the first priority videos because they are the shortest route from raw text to the user's requested final analysis: Terry's portfolio history, wealth-development path, generalizable portfolio design, and practice-first learning plan. They have now been collected through online transcript providers, so this list is retained for provenance rather than as an active ASR queue.

| Order | Video id | Index | Title | Reason |
| --- | --- | ---: | --- | --- |
| 1 | `Gwn_kEegfJ4` | 72 | 公開我的全部身家，資產配置 | Highest expected value for exact allocation and net-worth structure. |
| 2 | `52XVsVj6b4E` | 277 | 公開我全部的資產配置與投資 | Older allocation anchor for history comparison. |
| 3 | `L7xgc12JfHA` | 69 | 分享我的被動收入 | Passive-income stack before the latest career-transition video. |
| 4 | `hbJ0S2hINWg` | 105 | 公開我$2,500美金的被動收入 | Historical passive-income amount and composition. |
| 5 | `P6XYXfePAsA` | 254 | 我的$550美金被動收入 | Older passive-income baseline. |
| 6 | `Q59J5roE5lM` | 27 | 為什麼你投資賺不到錢？該選股還是投大盤？ | Collected via `youtubetranscript.pro` and cross-checked with Tactiq; use as positive-control provider sample. |
| 7 | `e5oYYw1tXbo` | 49 | 選股真的能跑贏大盤嗎？公開我回測的結果 | Evidence for whether active stock picking is repeatable. |
| 8 | `lL-aGwCD5xk` | 34 | 其實退休沒那麼難：專訪投資前輩，如何利用高股息＋優化資產配置 | External comparator against Terry's own wealth model. |
| 9 | `dqAsQyRJHAg` | 65 | 一次搞懂選擇權（期權） | Needed to evaluate whether covered calls are taught with sufficient risk controls. |
| 10 | `HL26tMSTqO4` | 120 | Nexo的被動收入利息可以相信嗎？ | Stablecoin/crypto lending risk and income evidence. |

## Command Shape

For the online-provider path that solved this batch, run:

```sh
python3 scripts/collect_youtube_transcripts_aivideosummarizer_obu.py --timeout-seconds 180
```

Only if online transcript providers cannot cover the remaining gaps and an audio path is explicitly approved, run one of:

```sh
python3 scripts/collect_youtube_asr_fallback.py --priority-list --download --cookies-from-browser chrome --transcribe --retry-failed
```

For precise first-batch browser-transcript retries before ASR, use:

```sh
python3 scripts/collect_youtube_transcripts_obu.py --skip-index --force --video-id Gwn_kEegfJ4 --video-id L7xgc12JfHA
```

or, for a custom ASR provider:

```sh
python3 scripts/collect_youtube_asr_fallback.py --priority-list --download --transcribe --asr-command '<command using {audio} and writing {txt}>' --retry-failed
```

If local audio files are supplied instead of downloaded, put them under `.cache/terry-youtube-audio/` with the queue naming convention, for example `072-Gwn_kEegfJ4.mp3`. The ASR runner detects common audio extensions including `.m4a`, `.mp3`, `.wav`, `.webm`, `.opus`, `.ogg`, `.flac`, `.aac`, and `.mp4`, then run:

```sh
python3 scripts/collect_youtube_asr_fallback.py --priority-list --transcribe --retry-failed
```

If an external ASR provider returns transcript output directly, name each file with the YouTube video id. The importer accepts `.txt`, `.md`, `.srt`, `.vtt`, and Whisper/faster-whisper-style `.json` files, for example `Gwn_kEegfJ4.srt`, then run:

```sh
python3 scripts/import_terry_asr_transcripts.py <input_dir>
python3 scripts/collect_youtube_transcripts_obu.py --skip-index --skip-transcripts --rebuild-manifest
python3 scripts/analyze_terry_youtube_corpus.py
python3 scripts/synthesize_terry_investment_report.py
python3 scripts/verify_terry_research_archive.py
```

## Quality Checks

- Every ASR output should produce both `.asr.txt` and `.asr.json`.
- External transcript imports should produce both `.asr.txt` and `.asr.json`, plus an `external-import-manifest.json` row that records the original input format.
- ASR transcripts should remain marked machine-generated until spot-checked.
- After each batch, run:

```sh
python3 scripts/collect_youtube_transcripts_obu.py --skip-index --skip-transcripts --rebuild-manifest
python3 scripts/collect_youtube_asr_fallback.py
python3 scripts/analyze_terry_youtube_corpus.py
python3 scripts/synthesize_terry_investment_report.py
python3 scripts/verify_terry_research_archive.py
```

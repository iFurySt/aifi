# AIFi

AIFi is an agent-first investment research workspace. It uses small, reusable AI
skills to collect filings, earnings, news, market signals, competitors, and risk
evidence, then saves the work under `research/` so future analysis can reuse it.

It is for research and decision support, not autonomous trading or financial
advice.

## Usage

```sh
codex "Use ./skills/company-research-workflow to research Intel and save the output under research/targets/intc"
```

```sh
codex "Use ./skills/company-news-research to update recent INTC news"
```

```sh
codex "Use ./skills/investment-thesis-synthesis to refresh the INTC decision frame from the archived evidence"
```

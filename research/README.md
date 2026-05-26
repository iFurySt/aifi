# AIFi Research Archive

This directory stores reusable research material produced by AIFi workflows.
Future agents should treat it as persistent project memory, not disposable chat
context.

Default layout:

```text
research/
  daily-reports/
    YYYY/
      MM/
        美股收盘日报-YYYY-MM-DD.html
  targets/
    <ticker-or-slug>/
      profile.md
      index.md
      evidence/
      artifacts/
```

Use `skills/research-evidence-archive` before creating, reorganizing, or
deduplicating materials here. Prefer markdown for extracted notes and summaries,
and keep raw files such as PDFs, images, spreadsheets, and downloaded source
documents when they are useful for future reuse.

Use `skills/aifi-daily-report` for the final user-facing daily report. The
report should be a self-contained HTML market note under
`research/daily-reports/`; it may draw on durable target context in
`research/targets/` and on freshly verified web data, but the report body should
focus on market analysis rather than repository maintenance details.

Do not store credentials, session cookies, private brokerage data, or full paid
research reports unless the security and rights posture is explicitly documented.

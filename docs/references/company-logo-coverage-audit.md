# Company Logo Coverage Audit

Reviewed 2026-10-14. Research only; the shipped adapter remains FMP public PNGs.

## What Was Audited

- All 7,487 unique candidate security symbols in the current local Nasdaq Trader
  snapshot, excluding ETFs and test listings. These are securities, not 7,487
  distinct companies: units, warrants, preferred shares and rights are included.
- Full Git trees of three public logo collections, without downloading all images.
- Exact, case-normalized filename stems matched against current source symbols.
  PNG coverage is separate from PNG-or-SVG coverage. No guessed punctuation or
  suffix stripping is included.
- Bounded FMP probes of the first 60 alphabetical securities plus 40 evenly spaced
  positions across the entire directory (99 unique symbols after deduplication).
- Selected image bytes, dimensions, issuer mappings, source documentation and
  repository license files. File presence is not an identity or quality guarantee.

## FMP Sample Result

Of 99 sampled symbols, 86 returned a PNG with nontrivial dimensions and 13
returned HTTP 404. Six initial 12-second timeouts were retried once with a
20-second deadline: five became PNG responses and AACPR became a confirmed 404.
The 86 returned images fit the current host byte/dimension bounds, but were not
all individually reviewed for correct issuer identity. This is a stratified/UI
sample, not a universe-wide FMP coverage percentage.

Confirmed sampled 404s: AAC.U, AAC.W, AACOW, AACPR, AACPW, ABR$D, ABR$E, ABR$F,
ACAAW, PCG$X, QRED.R, TREO and WTFCN. Most have security-class suffixes; no
automatic parent-issuer mapping is inferred from them.

## Full Directory Filename Comparison

| Collection | Pinned revision | PNG assets | Exact PNG matches / 7,487 | PNG or SVG matches | Latest inspected commit |
| --- | --- | ---: | ---: | ---: | --- |
| [NVSTly](https://github.com/nvstly/icons) | `3ba2624c7776761af53c8b9f0569173e696f7786` | 5,667 | 3,458 (46.19%) | 3,458 | 2026-07-23 |
| [ShaadyEmad](https://github.com/ShaadyEmad/ticker-logos) | `880d2c97ba7b60c3216e4612d48864d9f5f767b5` | 12,501 | 5,030 (67.18%) | 5,378 | 2025-06-08 |
| [davidepalazzo](https://github.com/davidepalazzo/ticker-logos) | `5cc9f9073a4f2f0140cb00f106076e42fe17acf3` | 5,107 | 3,063 (40.91%) | 3,063 | 2024-03-16 |

Combined exact PNG presence: **5,110 / 7,487 (68.25%)**. These are our own
measurements of current directory membership, not the repositories' advertised
coverage. The davidepalazzo repository is an older NVSTly fork and contributes
no extra exact PNG matches to this union. Some symbols may be available under
other conventions, but those need validated mappings.

The missing exact stems include AACOW, AACPR and AACPW in all three collections.
NVSTly/davidepalazzo contain AAC.U. The two main collections have 32 and 31 matches
respectively among the first 50 alphabetical directory entries.

### What The Collections Can Supplement

Among the sampled FMP 404s, NVSTly/davidepalazzo have an AAC.U filename and
ShaadyEmad has WTFCN PNG/SVG files. Other missing warrants/rights and recent
listings have no exact file in the inspected collections. A legacy ticker file
may refer to a previous issuer, so these are review candidates, not automatic
approved replacements. Different conventions such as BRKB versus BRK.B explain
some unmatched names, but only verified convention mappings should count.

## Source And Maintenance Findings

- NVSTly and davidepalazzo have an image-pack
  [LICENSE](https://github.com/nvstly/icons/blob/3ba2624c7776761af53c8b9f0569173e696f7786/ticker_icons/LICENSE)
  naming CC BY-NC-SA 4.0. Their READMEs also describe white/light recoloring and
  edits for dark themes. Do not label this collection as an unrestricted MIT
  dependency or bundle it into a future commercial asset pack.
- ShaadyEmad's inspected tree has no LICENSE file. Its current PNG/SVG directory
  is `US Market`, different from the folder examples in its README. Large file
  count includes symbols outside our current directory; it is not proof of
  current completeness. Selected AAPL and BRK.B PNGs are actual image bytes, not
  Git LFS pointers. The sampled AAPL tile has a baked-in dark background.
- [Simple Icons](https://github.com/simple-icons/simple-icons) is a maintained
  brand SVG collection, with a [CC0 repository license](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md)
  and per-icon licensing/brand guidelines metadata. It indexes brands rather
  than ticker securities, so it needs a reviewed issuer-to-brand map. The current
  AIFi host accepts PNG only; this would require curated conversion rather than
  passing arbitrary SVG into the renderer. No full-directory coverage is claimed.
- [fleveque/logo-service](https://github.com/fleveque/logo-service) documents a
  Go + SQLite/filesystem cache, GitHub acquisition and LLM/web-search fallback.
  It is useful implementation reference, not a complete independent logo dataset.
  Its use of a GitHub source does not change that source's asset license.

## Known Issuer And Provider Edge Cases

- FMP AACOW is 404 while AACO is a valid PNG. The
  [issuer's SEC filing](https://www.sec.gov/Archives/edgar/data/2099906/000121390026018826/ea027764601ex99-2_abony1.htm)
  confirms AACO ordinary shares, AACOU units and AACOW warrants belong to Abony
  Acquisition Corp. I. A reviewed issuer-level alias can reuse the AACO logo.
- AllInvestView's [search API](https://www.allinvestview.com/tools/ticker-logos/docs/)
  returns no AACOW result. AACO query returned LAACZ / LAACO, Ltd., which is not
  an exact symbol/issuer match. Never take the first fuzzy search result blindly.
- Eulerpool's keyless AACOW ticker probe returned a valid PNG with a **Wix** mark.
  HTTP 200 and a decoded image are insufficient proof of issuer identity.
- [Logo.dev](https://www.logo.dev/products/stock-ticker-logos) supports ticker,
  domain and ISIN lookups with a key. Its [pricing](https://www.logo.dev/pricing)
  distinguishes CDN hotlink traffic from API-returned downloadable assets;
  local caching must use the correct product path. No key was available for an
  independent AACOW coverage check.

## Proposed Follow-Up

Maintain a small reviewed issuer catalog with explicit security aliases, image
source and verification evidence. Use existing libraries as candidates and
supplement missing brands from verified company sites. Preserve the local logo
read port; give failed lookups explicit reasons (404, timeout, queue capacity,
invalid image) before calling them source gaps.

See [catalog proposal](../design-docs/company-logo-catalog.md) for the Gist versus
repository choice and suggested contribution workflow.

The local `.artifacts/logo-audit/directory-logo-coverage.csv` has one row for
every candidate, pinned PNG URL candidates and FMP outcomes for the 99 tested
symbols. Untested FMP entries are explicitly not-tested; all GitHub URLs remain
candidate-unverified. Git trees, byte probes and selected images stay in the
ignored artifact directory. No third-party logo images were committed.

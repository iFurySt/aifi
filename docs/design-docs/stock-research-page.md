# Stock Research Page

Status: shared Web/Electron UI, persisted research reads and responsive layout
implemented; reviewed 2026-10-17. Dataset coverage depends on local collection
and source availability. See [research ingestion](research-ingestion.md).

## Reference And Adaptation

Inspected through Chrome Default / OBU:
[Rallies AAPL](https://rallies.ai/research/AAPL) has Chart, Financials, Funds,
Politicians, Insiders, Analyst. Chart has quote/company/analyst/earnings,
metrics/peers, and price/volume plus Digest columns. Financials exposes a Metrics
selector, Quarter/Yearly, and period columns. Some other data panels did not
finish loading during inspection; their summary/filter/table arrangements are
AIFi choices rather than a claim of an exact replication.

Keep the Codex/ChatGPT-inspired outer frame and inset sidebar/document panel.
Root [DESIGN.md](../../DESIGN.md) owns tokens. One React implementation serves
both hosts; the [old prototype entry](../prototypes/stock-research/preview.html)
opens this app rather than keeping a second UI tree.

## Navigation And Routes

- The 76px outer rail contains Stocks, Chat, Agents, Watchlist, Portfolio, Library.
  Settings remains in the account popup; appearance is available in Settings/toolbar.
- The 248px inner sidebar contains a searchable stock list, not app destinations
  or conversations. It reads the cached Nasdaq candidate directory, 50 rows per
  batch, with ticker/security-name search and loading near the scroll bottom.
  Below a 1280px viewport, the list moves into a left drawer opened by its toolbar
  button or Command/Control+B. Above that breakpoint, restore the user's wide
  sidebar preference. The filter is shared between mounted list and drawer.
  Below 600px the drawer also supplies app navigation because the rail is hidden.
- Stocks is the default page. `#/stocks/AAPL?tab=chart` encodes ticker and tab;
  reload and native back/forward preserve them. A malformed ticker falls back to
  AAPL; unknown tabs fall back to Chart.
- Company search resolves exact source symbols first, then security-name matches.
  Headers use cached directory names and exchange codes, with no sample identity
  fallback. Missing membership shows an explicit status and may retain a valid
  custom symbol route. Search does not prove common-stock type or corporate identity.
- Source punctuation survives encoded routes. The existing watchlist grammar is
  separate; unsupported formats remain viewable with the watch button disabled.
- Watchlist company links open Stocks; Ask actions open Chat with a draft.
  Existing schema v1 conversations are kept and selectable inside Chat or search.

## Header And Tabs

Company logo/name, ticker/exchange where known, and Watchlist toggle. Use the
shared Command/Control+K search rather than a second company search. A long name
ellipsizes; at phone widths the watch action is an accessible icon button.
The advancing exchange-local clock never implies streaming price freshness. Unknown symbols have no invented
name, exchange, quote, chart, or statements.

| Tab | Current content | Future source requirement |
| --- | --- | --- |
| Chart | Stored quote, About, analyst/earnings summaries, metrics/peers, interactive daily chart, empty Digest/recent filings. | Profile, daily OHLCV, facts, sourced news/filings. |
| Financials | Metrics/Income/Balance/Cash flow/Filings selector; Quarter/Yearly tables with stored units and periods; empty filings. | Validated XBRL mappings and submissions. |
| Funds | Stored institutional aggregates, institution/mutual-fund samples, linked holder history/table, local search and position filters. | Full historical 13F backfill, CUSIP/amendment handling; existing top-holder coverage is partial. |
| Politicians | Purchases/sales/filers, All/Buy/Sell, transaction/range/traded/disclosed columns. | Public disclosures with transaction and publication dates. |
| Insiders | Purchases/sales/insiders, All/Buy/Sell, insider/role/transaction/shares/value/date table. | Form 4 activity and transaction-code interpretation. |
| Analyst | Average/high/low target, consensus, unmarked rating scale, ratings table. | Compatible licensed/available analyst source. |

The six visible tabs supersede the earlier four-tab prototype scope. Missing
metrics are em dashes, tables state that data is absent, and no trades/holdings/
ratings/news are fabricated. UI presence does not widen first-phase ingestion.
Filings is a Financials view rather than a seventh primary tab.

## Chart Composition

Desktop:

```text
Outer menu | Stock list | Company / ticker          Search    Watchlist
                        Chart Financials Funds Politicians Insiders Analyst

                        Quote + About    Metrics        Price + volume
                        Analyst          Peers          Range / Line / Candle
                        Earnings                        Digest / recent filings
```

Three flexible columns use thin vertical separators above a 1000px document.
Between 701 and 1000px, quote/About sit beside the price chart, then metrics/peers
span the document and secondary sections form pairs. At 700px and below, stack
quote, About, Analyst, Earnings, metrics/Peers, price chart, Digest and recent filings.
Do not hide deep company sections. At 440px and below use compact headers,
40px watch targets and stacked summary rows. CSS reflows one section/chart tree
so chart mode/range and the mounted list's position survive resizing.

Tabs scroll horizontally and reveal the selected label on resize or tab change;
only horizontal tab scroll is adjusted. Dense tables scroll inside their wrappers.
No page-level horizontal overflow is allowed.

Close is 32px with tabular figures. Chart controls cover 1M/3M/1Y/2Y and Line/Candle.
Both modes use the same persisted OHLCV series; range changes slice
that local series. Hover and keyboard arrows reveal bar details. SVG dimensions follow
rendered width so labels stay legible on mobile. Stored source timestamps and raw/split-adjusted basis stay explicit; there is no
intraday selector or total-return claim.

The directory universe reads stored source-backed quotes/profiles/bars and
financial records. Unsupported values stay blank; resizing and navigating never
collect a provider dataset. Source chips expose provenance and observation times.

## Interactions And States

- Six tabs use tab/tablist/tabpanel roles and Arrow/Home/End navigation.
- Local filters visibly select a state; they do not fetch or promise missing data.
- Watching changes the existing persisted watchlist; schema and saved user content
  are preserved. Chart ranges and table views are local presentation controls.
- The shared avatar, search, drawer, theme, sidebar collapse, and native history
  remain available. Neutral focus feedback preserves Tab/Escape without blue rings.
- Missing data uses short, dataset-specific empty copy. Configure sources through the existing Settings surface; ordinary view changes
  do not enqueue collection.

Future live states: show actual source/session/basis and filing period, retain
cached values while updating or after errors, distinguish partial/stale coverage,
and show retry/configuration only for implemented provider paths. A refresh must
return a durable job; reloading must not enqueue duplicates. Never silently
switch feeds or use preview filing links as evidence of retrieval.

## Verification And Remaining Work

Reviewed all six tabs at 1440×1100 and 390×844 through OBU, plus actual macOS
Electron smoke. Checked stock search/selection, missing symbols, local watchlist
persistence, chart type/ranges, statements/periods, Chat history, drawer navigation,
light/dark, internally scrolling tables, route tests, and neutral focus.

The responsive gate `pnpm smoke:stocks-layout` covers large/medium/narrow desktop
and phone layouts, all six tabs, drawer behavior, selected-tab reveal and retained
chart/list presentation. Chrome review complements its disposable fixture run.
Windows/Linux native window checks remain separate; source/runtime limits belong
in the ingestion design.

Directory read behavior, failure handling and cloud replacement boundaries are
specified in [directory reads](stock-directory-reads.md). The directory omits ETFs
and test issues; remaining records are candidates, not verified common shares.

Stock rows/header use optional decorative logos with letter fallback; this does
not infer company profiles or make sample quotes live. See
[logo capability](stock-logos.md).

## Range trend color

Line charts and their hover points use the selected range's first-to-last close
for red/green direction; daily candle/volume colors still compare each session's
close with open. Chart colors do not follow a hardcoded positive tint or the
unrelated current-day quote. Data completeness/source disagreements are recorded
in the [coverage audit](../references/stock-data-coverage-audit.md).

## Narrow-tab reference review (2026-10-18)

Live Rallies at 390/613/760px confirms that Chart completes the company column
before metrics/Peers, then the price chart/Digest. Funds shows its overview/ring
before Data; Politicians shows leaders/timeline before Data; Insiders shows its
timeline before Activity; Analyst shows its consensus visualization before
updates. Financials remained blank in this review, so AIFi retains its financial
chart, statement/period controls and table order without claiming exact parity.

At a detail-body width of 440px or less, fund identity sits above the ring;
search precedes wrapped filters, and long selector labels truncate. Financials
uses a narrower pinned metric column at document widths up to 700px, including
narrow desktop windows. Data tables scroll locally. The responsive fixture checks
populated and empty versions of all six tabs as well as each visible control's
bounds and the ordered, non-overlapping section rectangles.

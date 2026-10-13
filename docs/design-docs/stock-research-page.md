# Stock Research Page

Status: shared Web/Electron sample UI implemented, 2026-10-13. Live provider data
is still pending in [the data pipeline](us-stock-data-pipeline.md) and
[data plan](../exec-plans/active/us-stock-data-foundation.md).

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

- The 80px outer rail contains Stocks, Chat, Agents, Watchlist, Portfolio, Library.
  Settings and appearance remain in the avatar popup.
- The 248px inner sidebar contains a searchable stock list, not app destinations
  or conversations. It includes fixture symbols, saved watchlist symbols, and the
  currently selected ticker. Below 900px it becomes a drawer; below 600px the
  drawer also supplies app navigation because the outer rail is hidden.
- Stocks is the default page. `#/stocks/AAPL?tab=chart` encodes ticker and tab;
  reload and native back/forward preserve them. A malformed ticker falls back to
  AAPL; unknown tabs fall back to Chart.
- Company search accepts a known sample company name or syntactically valid ticker.
  An unknown ticker may open an empty page or be watched; this does not validate
  listing membership. Live directory integration must resolve identity/type and
  aliases before presenting source-backed stock metadata.
- Watchlist company links open Stocks; Ask actions open Chat with a draft.
  Existing schema v1 conversations are kept and selectable inside Chat or search.

## Header And Tabs

Company monogram/name, ticker/exchange where known, stock search, Watchlist toggle.
Sample close dates never imply a live feed. Unknown symbols have no invented
name, exchange, quote, chart, or statements.

| Tab | Current content | Future source requirement |
| --- | --- | --- |
| Chart | Sample quote, About, analyst/earnings placeholders, metrics/peers, interactive daily chart, empty Digest/recent filings. | Profile, daily OHLCV, facts, sourced news/filings. |
| Financials | Metrics/Income/Balance/Cash flow/Filings selector; Quarter/Yearly tables with sample units and periods; empty filings. | Validated XBRL mappings and submissions. |
| Funds | Reported funds/shares/period, All/Added/Reduced/Exited, ownership table. | Reported fund holdings with reporting lag and provenance. |
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

Three flexible columns use thin vertical separators. At document widths below
1,000px metrics move below identity beside the chart; below 660px stack quote,
chart, and metrics, hiding the deep identity subsections. Preserve internal
main scrolling and horizontal tab/table scrolling without widening the viewport.

Close is 32px with tabular figures. Chart controls cover 1M/3M/1Y/2Y and Line/Candle.
Both modes use the same deterministic local OHLCV series; range changes slice
that series. Hover and keyboard arrows reveal bar details. SVG dimensions follow
rendered width so labels stay legible on mobile. Fixtures use weekday samples,
not a validated exchange calendar; no intraday selector or total-return claim.

All five known symbols use sample quotes/profiles/bars. Fiscal numbers are marked
as sample financials in USD billions. Unsupported P/E, market cap, short interest,
and RSI remain blank. Derived example ranges/changes are not provider evidence.

## Interactions And States

- Six tabs use tab/tablist/tabpanel roles and Arrow/Home/End navigation.
- Local filters visibly select a state; they do not fetch or promise missing data.
- Watching changes the existing persisted watchlist; schema and saved user content
  are preserved. Chart ranges and table views are local presentation controls.
- The shared avatar, search, drawer, theme, sidebar collapse, and native history
  remain available. Neutral focus feedback preserves Tab/Escape without blue rings.
- Missing data uses short, dataset-specific empty copy. No queue/retry button is
  advertised until a real collection path exists.

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

Live directory membership, validated market calendars, source-backed OHLCV/facts,
original filing links, provenance popups, offline cached reads, and provider error
recovery remain in the data plan. Windows/Linux native checks remain separate.

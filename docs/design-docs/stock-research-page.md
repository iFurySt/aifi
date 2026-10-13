# Stock Research Page

Status: proposed, 2026-10-13. Companion to
[the data pipeline](us-stock-data-pipeline.md). Interactive visual concept:
[preview.html](../prototypes/stock-research/preview.html). It is a standalone
sample-data design artifact, not a connected product page.

## Reference And Adaptation

Observed through Chrome Default / OBU:
[Rallies AAPL](https://rallies.ai/research/AAPL) uses a compact company/search
header, horizontal underline tabs, and a three-column Chart view: quote/company
summary, key metrics, then price/volume chart and contextual content. Tabs are
15px, selected weight 600 with a 2px underline; light surfaces use thin dividers.
The inspected tabs are Chart, Financials, Funds, Politicians, Insiders, Analyst.
The Financials tab stayed empty in this inspection, so its data-table structure
is an AIFi design choice rather than an observed replication. The mobile view
was inspected, but an exact responsive data-layout match was not established.

Keep AIFi's existing outer rail, inset sidebar/document frame, system typography,
short copy, and avatar menu. The company page lives inside the document surface,
not in a second app shell. Root [DESIGN.md](../../DESIGN.md) owns tokens.

## Navigation And Routes

- Keep Research as the conversational workspace and add Stocks as the company
  browser. Stocks does not replace stored research conversations.
- Planned route: `#/stocks/AAPL?tab=overview`, resolving the provider-independent
  instrument ID internally. Symbol changes resolve through aliases.
- A stock directory/search page precedes the detail route. The Watchlist company
  action opens the stock detail; a separate Ask action opens Research.
- Search results show company, symbol, exchange, and instrument type. Unknown
  symbols are not assumed to exist because a string matches a ticker pattern.
- Initial development fixture selection is AAPL/MSFT/NVDA; the live list expands
  from validated directory membership, not a hardcoded list of three companies.

## Header And Persistent Context

Company icon or letter monogram, legal/display name, ticker, and exchange. A
compact search control and Watchlist action sit alongside. A single data status
shows the latest completed session: `Close · Oct 12` or `Updating…`; selecting it
opens source/freshness details. A design preview instead says `Sample data`.

Do not call EOD prices live. Keep refresh action and watchlist toggle independent
of broker accounts. A refresh queues a job and preserves cached content.

## Tabs

| Tab | Primary content | Required datasets |
| --- | --- | --- |
| Overview | Close/change, a short company identity panel, selected metrics, daily chart, recent filings. | Profile, bars, selected facts, filings. |
| Chart | Wide line/candle chart, volume, ranges 1M/3M/1Y/2Y, adjustment/source control. | Daily OHLCV and corporate actions. |
| Financials | Income/Balance/Cash flow sub-tabs; annual/quarter toggle; sparse normalized rows with source links. | Validated XBRL concepts and period mappings. |
| Filings | Form, report period, filed/accepted date, amendment, original document link; filters All/10-K/10-Q/8-K. | Submissions metadata. |

Funds, Politicians, Insiders, Analyst, news digest, and an AI report arrive only
when their data paths exist. Do not add empty advertised tabs to the first live
page. Filings can later support Form 4/13F research with distinct lag/coverage.

## Overview Composition

Desktop inside the document, maximum 1,180px:

```text
Company / ticker          Search                 Watchlist
Overview   Chart   Financials   Filings

Quote + company      Selected metrics      Price / volume chart
Latest close         Open / previous close Range 1M 3M 1Y 2Y
Daily change         Volume / 52w range     Source and adjustment
Company identity     Revenue / income      Recent filings
```

Inferred AIFi grid: 240px identity, 260px metrics, remaining chart column, with
20–24px spacing and thin dividers. At available content widths below 1,050px,
use a 280px summary column and flexible chart column, moving metrics beneath the
summary. Below 760px stack quote, chart, metrics, and filings, prioritizing chart
before deep tables. Keep the existing frame collapse rules.

Use close/change at 32px/14px, card titles 16px/600, metrics 13px with tabular
numbers, source/date labels 11px. Quote delta compares consistent price bases.
Missing data shows an em dash with concise optional explanation, never zero.

Initial useful metrics: open, previous close, volume, validated 52-week range,
latest fiscal-year revenue and net income. Each financial number names its period.
Company classification uses the actual source scheme; SIC is not silently shown
as a GICS sector. Market cap, P/E, analyst targets, short interest, and forward
estimates are omitted until supported by a compatible source/derivation.

## Chart And Financial Tables

Daily data only: no misleading 1D intraday selector. Line and candle modes use
the same cached bar series; period selectors only change the visible slice.
Hover/focus details show date and OHLCV. Preserve gaps and display the adjustment
basis. Split-adjusted means no dividend total-return promise. No chart redraw
should manufacture a different provider's series.

Financial table columns use fiscal periods and USD/unit labels. Compact row
names link or reveal concept/source/filing details on demand. Annual and quarter
views never mix duration, instant, or YTD contexts. Quarterly/TTM derivations are
labelled and traceable; missing mappings remain unavailable. Use horizontal table
scrolling on mobile without widening the document.

## States And Interactions

- Empty: `No data yet` + `Collect data`. Only supported datasets can queue work.
- Refreshing: keep cached values, show `Updating…`, then updated source time.
- Partial: render available panels, `Some data unavailable`, with detail on demand.
- Stale: show the actual date, not an opaque “fresh” badge based on fetch time.
- Error: retain last good data and expose retry/configuration actions. A blocked
  provider never creates fabricated quotes or silently switches series.
- Market holiday/weekend: the latest completed session remains valid.
- Directory removal: preserve the page/history and display listing status.

Tabs use semantic tab/tablist/tabpanel roles, keyboard arrows/Home/End, and focus
management. Reuse the shared avatar interaction; no blue avatar outline after
Escape. Sources and reset confirmations can use existing Radix primitives.

## Prototype Scope

The standalone preview exercises four tabs, chart range/type changes, statement
and period selection, ticker selection, watchlist toggle, source popup, and theme.
All numbers, filing rows, and chart series are deliberately sample fixtures;
no live endpoint or AI model is called. Original monograms/SVG charts stand in
for vendor assets. The preview keeps product copy concise and its sample label
visible. It does not add application auth, a data service, or modify user state.

## Live Acceptance

- Three targets display bars, source/session dates, and original filing links.
- A refresh returns a durable job, survives navigation, and updates without
  blanking cached data. Reload does not start duplicate jobs.
- Source detail distinguishes provider/feed/basis and filing period/availability.
- Missing/partial/blocked cases and long company names are reviewed in Web and
  Electron; mobile tabs/tables scroll internally.
- Existing chat history, agents, watchlist persistence, themes, and shell behavior
  remain functional when the Stocks page is added.

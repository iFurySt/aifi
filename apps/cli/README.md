# Local Data CLI

The first live collector imports Nasdaq Trader's official symbol-directory files
into SQLite. It needs no provider key. Research collectors also support Massive prices/profiles/actions,
SEC filings/facts/insiders and optional FMP activity datasets. The app-owned service
manages their independent scheduling/settings through private stdio.

Requires Go 1.26.1+ (module version), alongside the existing Node/pnpm toolchain.
Cobra and the CGO-free modernc SQLite driver are pinned in go.mod/go.sum.

From the repository root:

```sh
make check-go                     # vet, race tests, pure-Go build -> bin/aifi
./bin/aifi data directory sync
./bin/aifi data directory status
./bin/aifi data directory list --query AAPL
./bin/aifi data directory list --query Microsoft --limit 20 --offset 0
./bin/aifi data directory list --scope all --limit 200
```

Without a build, run `go run ./cmd/aifi data directory sync` inside apps/cli.
Every command prints JSON; failures print an error to stderr and exit nonzero.
`list` and `status` make no network requests. An empty store reports no snapshot.

## Storage And Configuration

`--data-dir /absolute/path` overrides `AIFI_DATA_DIR`. Otherwise the default is
`os.UserConfigDir()/aifi/data` (the OS user's configuration directory).
The store is `aifi.sqlite`, with SQLite WAL/SHM sidecars. New directories use
0700 and the DB 0600 where the OS supports Unix modes. Directory collection needs no credentials. Optional research credentials are encrypted
at rest by the app host; Go decrypts them only inside collector memory. Stores/source responses must stay outside tracked repository files.

The directory schema stores immutable source bytes/hashes, directory snapshots,
source metadata, listing IDs, per-snapshot memberships/aliases, and sync runs.
These two small directory blobs are stored directly in SQLite; larger future
price/filing payloads may use the pipeline's separate compressed blob store.

## Data Semantics

Both official files are downloaded and validated before the head snapshot can
change. All rows and original fields/symbol conventions are retained. Default
`candidates` excludes test issues and ETFs, but is not a verified common-stock
universe. Remaining `securityType` is `unknown`; no name heuristic invents type,
CIK, FIGI, company identity, exchange MIC, or historical alias continuity.
Use `--scope all` to inspect ETFs/test rows as well.

Listing IDs persist for a source/symbol/exchange key. Membership history preserves
absence/reappearance; absence does not prove delisting, and ticker reuse/renames
need later enrichment. Original ACT/CQS/NASDAQ aliases remain distinct.
The provider creation marker is a raw, timezone-unspecified string; `fetchedAt`
is an actual UTC timestamp. Repeated identical source hashes reuse the snapshot;
recent sync runs record successful checks even if source content did not change.

## App-Owned Scheduler

`aifi service` runs the private stdio scheduler used by local app hosts. Startup
checks due work; default automatic frequency is 24 hours, adjustable 1–720 hours.
Settings, revision conflicts, requests and sync outcomes persist in SQLite v4;
v1 directory data is migrated in place. A disabled source also prevents CLI sync.
`--offline` keeps settings/cache available without network collection.

Manual work can run with automation paused. The worker checks every 30 seconds,
reacts to configuration changes, and catches up after wake. Failed overdue work
backs off 15/30/60 minutes. Stdin EOF/cancellation ends the process and preserves
unfinished manual requests. There is no always-on OS background service.

See [service contracts](../../docs/design-docs/app-data-service.md).

## Failure And Concurrency

- At most two sequential source requests per sync, 30 seconds per HTTP request,
  8 MiB per file, and a two-minute overall sync context. No retry storm or polling.
- HTTPS redirects are restricted to the official Nasdaq Trader hosts.
- Reject malformed headers/rows/flags/creation trailers, duplicates, HTML errors,
  oversized/truncated downloads, older source generations, and directory shrink
  greater than 50%. An alphabetic new exchange code is retained without guessing
  its meaning. The current legacy otherlisted trailer is supported.
- Snapshot/source/membership/head writes are one SQLite transaction; failure or
  cancellation retains the last good head. Raw bytes are revalidated before write.
- A persisted three-minute sync lease prevents concurrent collectors. After crash,
  another manual sync can reclaim an expired lease; stale owners cannot commit.
  Failed/interrupted outcomes remain visible in status. WAL, foreign keys,
  a five-second busy timeout, and one connection per store keep writes explicit.

Retention/backup/compaction commands remain follow-ups. Research collection uses
separate durable jobs, dataset intervals and per-provider quotas. Remote access
and account entitlements are checked when the configured collector runs. Existing UI Reset does not delete this DB.

Design/source selection: [directory sources](../../docs/references/stock-directory-sources.md),
[pipeline](../../docs/design-docs/us-stock-data-pipeline.md), and
[broader data plan](../../docs/exec-plans/active/us-stock-data-foundation.md).

## Index Collection Reads

`directory.list` private RPC accepts optional `collection`: `all-us`, `sp500`,
`nasdaq100`, or `watchlist`. Only watchlist accepts `symbols` (at most 50).
Search/count/paging apply inside that scope; `directory.get` remains global.
SQLite v3 retains reviewed index snapshots/source hashes and unresolved symbols.
There is no membership-write RPC for built-ins. Existing directory/settings and
credential records are preserved by migration.

The bundled seed currently contains 503 S&P securities (datasets PDDL dataset,
observed 2026-10-15) and 101 Nasdaq-100 securities (Nasdaq response dated
2026-10-14). These are security counts, not hardcoded group sizes. Refresh the
reviewed seed with `python3 scripts/update-stock-index-seeds.py`, inspect the diff
and source dates, run CI, and commit. Automatic index downloading/scheduling is
not part of this slice; offline/restart reads never depend on GitHub or Nasdaq.
See [sources and provenance](../../docs/references/stock-index-sources.md).

## Whole-directory research

```sh
./bin/aifi data research status
./bin/aifi data research read AAPL
./bin/aifi data research sync
./bin/aifi data research sync --symbols ADBE,BABA  # bounded repair, at most 50
```

`read`/`status` are SQLite-only. `sync` reconciles every current non-test/non-ETF
candidate, queues work durably and exits; the app-owned service executes it.
No command accepts an API key in its arguments. Configure keys in Settings →
API keys and SEC identification in Data sources. Research settings/status/read
use explicit private RPC methods; no raw SQL, provider URL or plaintext secret
retrieval is exposed to the renderer.

Market jobs fetch raw OHLCV for all US tickers by date, initially up to 730
calendar days, with newest sessions and AAPL/MSFT/NVDA enrichment prioritized.
Company-profile and optional enrichment jobs cover the whole directory;
SEC issuer jobs share a CIK. Splits/dividends use a shared market-wide snapshot
and indexed per-symbol SQLite rows, rather than daily requests per stock.
Immutable SEC accession XML is reused after its first successful collection. Unknown
SEC mappings and unavailable vendor instruments are not fabricated. Prices for
non-company instruments may exist even when SEC financials do not.

Each provider has one worker and a durable shared minute/day budget. Jobs have
15-minute fenced leases, 10-minute execution limits, exponential retry and shared
429 cooldown. Authentication blocks pause a provider; endpoint access blocks
pause its dataset. Saving credentials/contact resets blocked work. Dataset disable
and automatic pause are checked before subsequent requests. Manual sync can run
with automation paused, while disabled datasets remain disabled.

Validated source bytes are gzip-compressed inside SQLite alongside immutable
snapshots and head pointers. Raw daily bars upsert atomically with evidence.
Financial values preserve decimal strings, tags, units, actual periods and filing
identities. Normalized financial coverage is selected standard entity-wide facts
for seven years; custom/segmented statements remain outside this adapter.
SEC submissions retain the recent filing window; insider XML covers its latest
40 Form 4/4-A filings. FMP datasets are optional and disabled by default; their
endpoint entitlements may require paid plans. Institutional pages checkpoint
privately and resume within 24 hours; no partial holdings head is published.

Recent market sessions are rechecked on the configured interval; sessions older
than seven days have a default 30-day repair interval until settings are changed.
A conservative previous-New-York-date watermark avoids collecting an unfinished
session; weekends are skipped and empty holiday responses remain evidenced.
This is EOD collection, not an exchange-grade real-time market calendar.

## Coverage Audit And Repair

Use `python3 scripts/audit-stock-coverage.py --db /path/to/aifi.sqlite` from the
repository root for a read-only coverage/error summary. It uses Python 3's
standard library, never reads credentials and never calls a provider. Stored
snapshot counts do not guarantee complete fields or current quotes.

Targeted `research sync --symbols` validates all symbols before queuing enabled,
configured-source jobs, including mapped SEC issuers. It preserves blocked
entitlements, active leases and retired history. Manual repairs lead background
work; protected index membership prioritizes company/issuer initial collection
before the alphabetical universe. Whole-directory work continues under existing
provider budgets; a queue is not a claim of complete collection. See the
[audit](../../docs/references/stock-data-coverage-audit.md) for the observed gaps.

## Whole-directory backfill

```sh
./bin/aifi data research backfill                      # local record-level audit
./bin/aifi data research backfill --queue              # persist missing-only work
./bin/aifi data research backfill --run --sec-bulk     # independent collector
```

The standalone collector runs until interrupted and emits a JSON progress line
each minute. It can run while the app is closed; this is an explicit foreground
CLI operation, not an installed login service. Restart the same command to resume.
App and CLI workers cooperate through SQLite leases and shared provider budgets.
Daily limits and cooldowns wait for reset; they are never bypassed by this command.
Source switches, disabled datasets and stored credentials remain authoritative.

Backfill requests preserve successful snapshots, active leases, entitlement
blocks and per-company HTTP backoffs. Unattempted companies lead retries and
ordinary refreshes; current index membership prioritizes work within that pass.
This prevents periodic seed/index refreshes from indefinitely starving the rest
of the directory. The audit counts `withRecords`, `empty` and missing job states
separately. A nonempty observation still does not imply complete fields/history.
SEC counts expand shared CIK records to their mapped directory symbols; unmapped
securities remain visible rather than acquiring a guessed issuer.

`--sec-bulk` uses the [official nightly ZIPs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)
for financial facts and recent submissions, using the configured SEC contact.
The two downloads are about 3 GB combined at the observed publication, each
bounded to 3 GiB; normalized evidence needs additional local storage. Private
`bulk-cache/` files use 0600 permissions and a per-archive process lock. Downloads
resume with validated HTTP byte ranges and server version validators; a changed
archive restarts safely. Slow downloads have a cancellable 12-hour request limit,
transient failures back off, and a complete ZIP is reused for 24 hours. Members
are never extracted to filesystem paths. Only exact CIK JSON members (max 32 MiB)
with matching body identity enter existing parsers and atomic fenced commits.
Missing/invalid members fall back to ordinary API collection, preserving good
data. The archive URL/member and source time remain in SQLite evidence.

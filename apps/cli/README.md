# Local Data CLI

The first live collector imports Nasdaq Trader's official symbol-directory files
into SQLite. It needs no provider key. The Web/Electron renderer still uses
fixtures until local transport is implemented.

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
0700 and the DB 0600 where the OS supports Unix modes. No credentials are needed
or saved. Stores/source responses must stay outside tracked repository files.

The v1 migration stores immutable source bytes/hashes, directory snapshots,
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

Retention/backup/compaction commands, automatic schedules, durable multi-dataset
jobs, prices/financial facts, local HTTP/desktop transport, and UI connection are
not implemented in this milestone. Existing UI Reset does not delete this DB.

Design/source selection: [directory sources](../../docs/references/stock-directory-sources.md),
[pipeline](../../docs/design-docs/us-stock-data-pipeline.md), and
[broader data plan](../../docs/exec-plans/active/us-stock-data-foundation.md).

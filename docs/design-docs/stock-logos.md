# Stock Logo Read Capability

Status: implemented, updated 2026-10-15.

## Boundary

Core defines nullable `StockLogoRepository.get(symbol)`; App injects it separately
from StockDirectoryRepository. Local platform uses allowlisted stock.logo reads.
The host first verifies current directory membership through Go, then resolves
reviewed company catalog sources before the original exact-symbol FMP PNG path.
Go remains the SQLite owner. Quotes/profiles/facts stay separate, and a future
provider/cloud adapter can fit the same logo port without changing components.

The renderer has no provider URL or filesystem path. It gets PNG data URLs only;
existing Web/Electron CSP and network interception stay unchanged. No API key or
third-party artwork is bundled into source. See [source provenance](../references/stock-logos.md).

## Catalog Resolution

- Node-only host ships the public catalog v0.1.0 metadata seed, with its MIT
  notice. Startup works without GitHub. Cached metadata is validated before use;
  a corrupt cache falls back to the seed.
- Exact US security symbols/aliases are rebuilt from company records, ignoring
  the supplied index. Validity dates are respected. Only verified PNG entries
  on explicitly trusted paths are eligible; candidate images remain unapproved.
- First logo read starts a background catalog check. Subsequent checks run at
  most once per 24 hours, including an unref'd timer while the host stays alive.
  The fixed public GitHub manifest has a 10-second deadline and 2 MiB limit.
  Concurrent checks coalesce. Validation/network failures preserve the last good
  manifest and persist the check time to avoid repeated requests on restart.
- At most two reviewed sources precede the exact-symbol FMP fallback. Catalog
  images must match recorded SHA-256 and dimensions. No suffix stripping or
  company-domain guessing occurs. Adding an image origin needs a code change.
- Catalog metadata is private `stock-logos/catalog.json`; its updater never
  downloads the entire image universe. Offline mode makes no public requests.

## Requests And Persistence

- Directory pages warm local images as a batch before rows are published. The
  optional `getCached(symbols)` repository port uses `stock.logos.cached`, accepts
  at most 50 symbols, and returns only current-directory disk hits. At most two
  batches run concurrently; one Go membership query avoids repeated per-symbol directory scans. Responses are capped at 8 MiB of data-URL characters. This path never
  joins the provider queue or schedules image refresh; catalog metadata retains
  its independent background refresh. Cache misses are omitted, not recorded as
  missing provider images.
- UI decodes/samples all returned page images before DirectoryFeed sees the page,
  so existing cached artwork is present on the rows' first render after restart
  as well as during scrolling. Preparation failures preserve usable directory
  reads. Existing generation/snapshot checks still discard superseded batches.
  The next page starts within 900px of the list bottom. Per-avatar requests keep
  a 240px lookahead against the real sidebar scroll root for uncached images.
- Uncached/rejected images show a letter immediately, including while a remote
  request is pending; no blank waiting tiles are inserted. First-time provider
  retrieval can still replace a letter later. Instant artwork is guaranteed only
  for usable cached assets, not for logos never downloaded or unavailable at a
  provider. The app does not download the entire universe on launch.
- The local platform adapter shares in-flight reads and keeps a per-repository
  session LRU, bounded to 128 entries and 8 MiB of data-URL characters. Successful
  images avoid repeated IPC/HTTP for five minutes; null results retry after
  30 seconds. Expired positives remain available for immediate rendering and
  survive temporary bridge errors. This is memory only: durable PNGs stay in the
  private host cache, not workspace localStorage or IndexedDB.
- Host requests use a scoped native HTTPS agent honoring configured proxy env
  without changing global local-session/HMR routing. Only the fixed GitHub
  manifest, FMP image path and Tactical Resources PNG upload path are allowed.
- Four image lookup slots per host, at most 16 pending distinct symbols; duplicate
  symbols and shared issuer assets coalesce. Each slot has a 15-second total
  network budget shared by source attempts. Immediate errors advance to fallback;
  after a full timeout, later reads can retry the fallback during the failed
  source's negative-cache interval.
  Web logo reads allow 70 seconds for the bounded queue. Directory/status reads
  remain independent; the catalog refresh has a separate agent socket.
- TLS verification, no redirects, PNG MIME/signature/header validation, max
  256 KiB and max 2048×2048 dimensions. No SVG/HTML, arbitrary URLs, cookies or
  credentials are sent to providers.
- Image keys hash the source URL and expected review checksum in `stock-logos/v2`.
  Shared issuer aliases reuse one image. Writes use private permissions and atomic
  rename. Positive images are fresh for seven days; failures retry after ten
  minutes. A fresh disk hit, including after an online app restart, does not
  download the image again.
- A valid cached image returns immediately even when stale or the download queue
  is full. Reviewed cached sources win. If only a cached fallback exists, it can
  display while the reviewed source is acquired in the background; the next read
  discovers that preferred image. Background refresh shares the same bounds,
  deduplication, negative backoff and shutdown cancellation as cold reads.
- Old exact-source PNGs remain useful when their bytes match required review
  hashes/dimensions. Failed symbol lookups cannot block a new catalog mapping.
- Old good images survive refresh failures. Offline reads use cached data; host
  shutdown cancels retrieval/timers without recording a new negative result.
- Renderer images decode and get optional contrast sampling before becoming
  visible, avoiding white-on-white first frames and delayed cached-image insertion. Weak preparation caches share work/contrast by the existing bounded
  repository objects without retaining an unbounded second image store.
  Tiny/empty/corrupt assets use letters; predominantly white transparent marks
  get a dark background for contrast.
  Images use centered contain sizing within 84% of the avatar, leaving an 8%
  safe inset on every side. A shared 64px analysis trims transparent or flat-white
  outer space, with one sample of edge protection; colored tiles retain their
  full backgrounds. Cropped previews preserve source aspect ratio and cap the
  long edge at 128px. Derived PNGs decode before publication and reuse the same
  weak preparation cache; raw host PNGs, provider requests and disk caches remain
  unchanged. Optional analysis/crop failures keep the original decoded image.

No backup/retention or provider-management UI is added. Directory snapshot counts
and SQLite size exclude PNG/metadata cache bytes. Reviewed coverage is currently
small; unsupported/missing sources retain the original provider and letter fallback.

## Verification

Host tests cover exact aliases/status/validity, malformed manifests, cache/refresh
bounds, last-good/offline reuse, priority over old failures, checksum changes,
raw fallback, shared assets, image validation, concurrency and shutdown. Additional
regressions cover online restart hits without network, stale/queue-full disk hits,
background promotion, bounded renderer memory, synchronous peek, TTL retries and
bridge errors. Batch regressions cover cache-only reads under a saturated provider
queue, membership validation, page preparation ordering, stale responses and cache
failures. Native
validation exercises real AACOW and TREO sources; isolated smoke stays offline.

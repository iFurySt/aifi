# Stock Logo Read Capability

Status: implemented, 2026-10-14.

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

- Visible/near-visible avatars request logos; hidden/deep rows do not preload the
  whole universe. The first letter stays visible until an image succeeds.
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
  rename. Positive cache lasts seven days; failures retry after ten minutes.
- Reviewed sources take precedence over old raw-symbol positives/negatives. Old
  exact-source PNG caches remain useful when their bytes match the required hash
  and dimensions; old failed symbol lookups cannot block a new catalog mapping.
- Old good images survive refresh failures. Offline reads use cached data; host
  shutdown cancels retrieval/timers without recording a new negative result.
- Renderer image decoding handles failures. Tiny/empty assets use letters;
  predominantly white transparent marks get a dark background for contrast.
  Images fill rounded avatars edge to edge with cover sizing and no inset.

No backup/retention or provider-management UI is added. Directory snapshot counts
and SQLite size exclude PNG/metadata cache bytes. Reviewed coverage is currently
small; unsupported/missing sources retain the original provider and letter fallback.

## Verification

Host tests cover exact aliases/status/validity, malformed manifests, cache/refresh
bounds, last-good/offline reuse, priority over old failures, checksum changes,
raw fallback, shared assets, image validation, concurrency and shutdown. Native
validation exercises real AACOW and TREO sources; isolated smoke stays offline.

# Stock Logo Read Capability

Status: implemented, 2026-10-14.

## Boundary

Core defines nullable `StockLogoRepository.get(symbol)`; App injects it separately
from StockDirectoryRepository. Local platform uses allowlisted stock.logo reads.
The host first verifies current directory candidate membership via Go, then reads
its presentation cache or a fixed FMP public PNG URL. Go remains the SQLite owner.
Quotes/profiles/facts stay separate, and a future provider/cloud adapter can fit
the same logo port without modifying stock components.

The renderer has no provider URL or filesystem path. It gets PNG data URLs only;
existing Web/Electron CSP and network interception stay unchanged. No API key or
third-party asset is bundled into source. Source selection is recorded in
[logo references](../references/stock-logos.md).

## Requests And Persistence

- Visible/near-visible avatars request logos; hidden/deep rows do not preload the
  whole universe. The first letter stays visible until an image succeeds.
- Host requests use a scoped native HTTPS agent, honoring configured proxy env
  where supported without changing global local-session/HMR routing.
- Four outbound requests per host, at most 16 pending distinct symbols; duplicate
  symbol calls coalesce. The private logo HTTP read has a 15-second deadline.
  Web logo requests allow up to 70 seconds for the bounded queue; ordinary local
  directory/status requests retain their shorter limits and remain independent.
- Fixed origin/path, symbol validation, TLS verification, no redirect following,
  PNG MIME/signature/header validation, max 256 KiB and max 2048×2048 dimensions.
  No SVG/HTML, arbitrary URL, cookie or credential transmission.
- PNGs use hashed filenames in stock-logos under the private data directory,
  written with private permissions and atomic rename. Seven-day positive cache;
  transient/missing responses retry after a ten-minute negative-cache interval.
- Old good images remain available if refresh fails. Offline mode uses the cache;
  host shutdown cancels queued/active retrieval and does not persist a failure.
- The renderer decodes images and handles failures. Tiny/empty assets use letters;
  predominantly white transparent marks get a dark background for contrast.

No backup/retention UI or asset cache migration is added. Directory snapshot
counts and SQLite size do not include PNG cache bytes. The source may not have an
image for every security; no issuer alias or corporate profile is guessed.

## Verification

Host tests cover caching/coalescing, offline reuse, stale fallback, rejection of
SVG/HTML/oversized images, dimensions, concurrency bounds and shutdown. The platform
adapter is injectable and missing assets are nullable. Native UI/loopback checks
use the real directory and public images; normal smoke remains isolated/offline.

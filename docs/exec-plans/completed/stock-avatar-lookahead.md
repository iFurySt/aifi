# Stock Avatar Scroll Lookahead

## Goal

Prevent letters flashing before available logos as new stock rows enter the
sidebar viewport, including images already on disk but not yet in renderer memory.

## Findings

The avatar observer used the window viewport, so its margin could not expand the
inner stock-list scroll clip. It also treated an unresolved image read as a final
letter fallback, and decoded/sampled contrast only after mounting the image.

## Scope

Use the actual list scroll root with bounded lookahead, prepare/decode contrast
before presentation, and distinguish unresolved neutral placeholders from missing
images. Reuse preparation through weak references to the existing bounded logo
repository objects. Preserve host disk cache, network limits and data contracts.

## Validation

Unit checks cover decode ordering/coalescing, invalid/blank images and contrast.
A real Chrome fixture imports the production StockAvatar inside an inner scroller,
records offscreen read starts, checks a delayed image for letter flashes, scrolls
a prepared row into view and verifies immediate image presentation. Run CI and
actual offline native smoke; rebuild/restart the primary app after delivery.

## Progress

- [x] Identify inner-scroll clipping and fallback-state causes.
- [x] Implement observer/preparation/presentation changes and unit checks.
- [x] Real Chrome scroll checks, CI/native smoke, documentation and history.
- [x] Commit/push, primary rebuild/restart and cleanup.

## Verification Results

- `make ci`: 52 tests, TypeScript/builds and Go vet/race checks pass.
- Isolated actual Electron smoke passes.
- Chrome Default through OBU: an offscreen row 180px below the list viewport
  starts preparation before scrolling, and enters with a ready image.
- A newly entered delayed row has an empty loading tile, then a ready image;
  the delayed-image mutation probe records zero temporary letter flashes.
- Missing images retain letters, white transparent marks have contrast on their
  first ready frame, and a paired observer probe reports window-root=false vs
  inner-scroll-root=true for the same offscreen avatar.
- The fixture imports the production component; fake 80ms/1s reads isolate UI
  scheduling rather than claiming first-time remote downloads are instant.

## Delivery

Implementation pushed; primary checkout rebuilt and the native app restarted.
The native stock list was visually inspected with real cached company images.
The existing Chrome deliverable tab was restored to the primary preview after QA,
with its temporary device metrics cleared. Cache/scroll metrics, fixture screenshot
and offline native smoke evidence were preserved before test-server cleanup.

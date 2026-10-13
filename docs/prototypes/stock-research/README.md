# Stock Research Concept

Open [preview.html](preview.html) directly in a browser. For local HTTP review:

```sh
python3 -m http.server 5184 --bind 127.0.0.1 --directory docs/prototypes/stock-research
```

Then open http://127.0.0.1:5184/preview.html. No build or dependency is needed.

The page exercises four tabs, chart range/type, three ticker fixtures, financial
statement/period selection, filing filters, watchlist state, sample-data help, and
light/dark themes. Values and filing records are examples; nothing is collected
from providers or persisted to the product workspace. The CSP denies network data
connections; fonts, monograms, and charts are local.

Reviewed in Chrome Default through OBU at 1440×1100 and 390×844 on 2026-10-13,
including keyboard tabs, dialog focus return, controls, theme, and table overflow.
Mobile SVGs use rendered dimensions so labels remain readable.

Design: [stock page](../../design-docs/stock-research-page.md),
[data pipeline](../../design-docs/us-stock-data-pipeline.md), and
[root DESIGN.md](../../../DESIGN.md).

![Stock research sample-data concept](overview.png)

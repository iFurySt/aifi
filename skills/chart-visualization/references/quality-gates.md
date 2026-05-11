# Quality Gates

Run these checks before returning a chart artifact.

## Data Integrity

- Source, date range, currency, units, and transformation are known.
- Missing values are labeled or intentionally omitted.
- Calculated percentages disclose denominator and period.
- Aggregations reconcile with the raw data or note why they do not.
- Stale market data is labeled with retrieval date and time zone.

## Visual Integrity

- Title states the analytical question or finding.
- Axes, legends, and tooltips include units.
- Bars start at zero unless clearly justified.
- Colors are distinguishable without relying only on hue.
- Text does not overlap at expected desktop and mobile widths.
- Small categories are aggregated when labels become unreadable.
- The chart does not use 3D effects for quantitative comparison.

## Artifact Integrity

- Static files open locally.
- HTML files contain all required data or document their external data source.
- Scripts print output paths and fail loudly on invalid input.
- File names are descriptive and safe for repeated runs.
- Research outputs are saved under `research/` when they are reusable.

## Delivery Notes

Return the method used, the artifact path, and any known limitations. If the
environment could not render a chosen method, return the spec plus the command
or package needed to render it.

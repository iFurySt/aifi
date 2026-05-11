# Python Analysis Charts

Use Python when the environment has plotting packages or can install them
outside the repository. This is the best path for statistical analysis,
print-quality PNG/PDF output, and multi-panel research figures.

## Preferred Stack

- `pandas` for tabular cleanup and grouping.
- `matplotlib` for deterministic static figures.
- `seaborn` for distributions, regression views, heatmaps, and statistical
  defaults.
- `plotly` for interactive notebooks or exported HTML.

## Headless Matplotlib Pattern

```python
import matplotlib
matplotlib.use("Agg")

import matplotlib.pyplot as plt

plt.rcParams.update({
    "figure.dpi": 120,
    "savefig.dpi": 240,
    "axes.grid": True,
    "grid.alpha": 0.25,
    "axes.spines.top": False,
    "axes.spines.right": False,
})

fig, ax = plt.subplots(figsize=(8, 4.5), constrained_layout=True)
ax.plot(df["date"], df["value"], linewidth=2)
ax.set_title("Revenue Trend")
ax.set_xlabel("Period")
ax.set_ylabel("Revenue (USD millions)")
fig.savefig("revenue-trend.png", bbox_inches="tight", facecolor="white")
plt.close(fig)
```

## Analysis Figure Rules

- Save files explicitly and print artifact paths.
- Use `constrained_layout=True` or `tight_layout()` to prevent label clipping.
- Label units and periods on axes, not only in prose.
- Use log scales only when the label says so.
- For dual axes, explain why the two scales belong together.
- For distributions, show sample size and whether outliers are included.
- For investment work, keep valuation, operating, and market-price metrics in
  separate panels unless a relationship is being tested.

## Good Defaults

- Use horizontal bars for long company names, product names, and categories.
- Use small multiples instead of overloaded legends.
- Use direct labels for short series lists.
- Use a neutral baseline color plus one highlight color for the finding.

#!/usr/bin/env python3
"""Render dependency-free chart visualization examples.

The script intentionally uses only the Python standard library so agents can
validate the chart skill even when plotting packages are unavailable.
"""

from __future__ import annotations

import argparse
import html
import json
import math
from pathlib import Path
from typing import Iterable


PALETTE = ["#2563eb", "#059669", "#dc2626", "#7c3aed", "#d97706", "#0891b2"]


def esc(value: object) -> str:
    return html.escape(str(value), quote=True)


def scale(value: float, old_min: float, old_max: float, new_min: float, new_max: float) -> float:
    if math.isclose(old_max, old_min):
        return (new_min + new_max) / 2
    return new_min + (value - old_min) * (new_max - new_min) / (old_max - old_min)


def write(path: Path, content: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(path)
    return path


def svg_root(width: int, height: int, title: str, desc: str, body: str) -> str:
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img">
  <title>{esc(title)}</title>
  <desc>{esc(desc)}</desc>
  <style>
    text {{ font-family: Inter, Arial, sans-serif; fill: #172033; }}
    .title {{ font-size: 20px; font-weight: 700; }}
    .panel-title {{ font-size: 13px; font-weight: 700; }}
    .axis {{ font-size: 10px; fill: #526070; }}
    .note {{ font-size: 10px; fill: #64748b; }}
    .grid {{ stroke: #d8dee9; stroke-width: 1; }}
  </style>
  <rect width="100%" height="100%" fill="#ffffff"/>
{body}
</svg>
"""


def line_path(points: Iterable[tuple[float, float]]) -> str:
    pairs = list(points)
    if not pairs:
        return ""
    head, *tail = pairs
    return "M " + f"{head[0]:.1f} {head[1]:.1f} " + " ".join(
        f"L {x:.1f} {y:.1f}" for x, y in tail
    )


def render_dashboard(path: Path) -> Path:
    revenue = [18, 21, 24, 23, 29, 34]
    margin = [18, 20, 19, 22, 24, 27]
    scatter = [(3.1, 18), (4.4, 24), (5.2, 25), (6.0, 31), (7.2, 35)]
    heat = [
        [0.2, 0.4, 0.7, 0.5],
        [0.6, 0.3, 0.4, 0.8],
        [0.9, 0.5, 0.2, 0.6],
    ]

    body = ['  <text x="32" y="36" class="title">AIFi Chart Visualization Smoke Dashboard</text>']
    body.append('  <text x="32" y="56" class="note">Sample data for validating bar, line, scatter, and heatmap rendering.</text>')

    # Bar panel
    x0, y0, w, h = 40, 96, 250, 170
    body.append(f'  <text x="{x0}" y="{y0 - 18}" class="panel-title">Category comparison</text>')
    body.append(f'  <line x1="{x0}" y1="{y0 + h}" x2="{x0 + w}" y2="{y0 + h}" class="grid"/>')
    bar_w = 28
    for idx, value in enumerate(revenue):
        bh = scale(value, 0, max(revenue), 0, h - 20)
        x = x0 + 18 + idx * 37
        y = y0 + h - bh
        body.append(f'  <rect x="{x:.1f}" y="{y:.1f}" width="{bar_w}" height="{bh:.1f}" fill="{PALETTE[idx % len(PALETTE)]}" rx="3"/>')
        body.append(f'  <text x="{x + bar_w / 2:.1f}" y="{y0 + h + 14}" text-anchor="middle" class="axis">Q{idx + 1}</text>')
        body.append(f'  <text x="{x + bar_w / 2:.1f}" y="{y - 5:.1f}" text-anchor="middle" class="axis">{value}</text>')

    # Line panel
    x0, y0 = 340, 96
    body.append(f'  <text x="{x0}" y="{y0 - 18}" class="panel-title">Trend line</text>')
    for step in range(4):
        gy = y0 + step * h / 3
        body.append(f'  <line x1="{x0}" y1="{gy:.1f}" x2="{x0 + w}" y2="{gy:.1f}" class="grid"/>')
    line_points = [
        (
            x0 + idx * w / (len(margin) - 1),
            scale(value, min(margin), max(margin), y0 + h - 18, y0 + 10),
        )
        for idx, value in enumerate(margin)
    ]
    body.append(f'  <path d="{line_path(line_points)}" fill="none" stroke="#2563eb" stroke-width="3"/>')
    for x, y in line_points:
        body.append(f'  <circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="#ffffff" stroke="#2563eb" stroke-width="2"/>')

    # Scatter panel
    x0, y0 = 40, 330
    body.append(f'  <text x="{x0}" y="{y0 - 18}" class="panel-title">Relationship</text>')
    body.append(f'  <rect x="{x0}" y="{y0}" width="{w}" height="{h}" fill="#f8fafc" stroke="#d8dee9"/>')
    xs = [x for x, _ in scatter]
    ys = [y for _, y in scatter]
    for idx, (xv, yv) in enumerate(scatter):
        x = scale(xv, min(xs), max(xs), x0 + 24, x0 + w - 24)
        y = scale(yv, min(ys), max(ys), y0 + h - 24, y0 + 24)
        body.append(f'  <circle cx="{x:.1f}" cy="{y:.1f}" r="{5 + idx}" fill="{PALETTE[idx % len(PALETTE)]}" opacity="0.82"/>')
    body.append(f'  <text x="{x0}" y="{y0 + h + 18}" class="axis">X: investment intensity; Y: growth</text>')

    # Heatmap panel
    x0, y0 = 340, 330
    body.append(f'  <text x="{x0}" y="{y0 - 18}" class="panel-title">Signal heatmap</text>')
    cell = 42
    for row_idx, row in enumerate(heat):
        for col_idx, value in enumerate(row):
            intensity = int(scale(value, 0, 1, 235, 65))
            color = f"rgb({intensity},{max(80, intensity - 40)},235)"
            x = x0 + col_idx * (cell + 8)
            y = y0 + row_idx * (cell + 8)
            body.append(f'  <rect x="{x}" y="{y}" width="{cell}" height="{cell}" fill="{color}" rx="4"/>')
            body.append(f'  <text x="{x + cell / 2}" y="{y + 26}" text-anchor="middle" class="axis">{value:.1f}</text>')

    body.append('  <text x="40" y="555" class="note">Source: generated sample data; replace with archived evidence paths for research use.</text>')
    return write(
        path,
        svg_root(
            660,
            580,
            "AIFi chart visualization smoke dashboard",
            "A static SVG dashboard containing a bar chart, line chart, scatter plot, and heatmap.",
            "\n".join(body),
        ),
    )


def render_sankey(path: Path) -> Path:
    links = [
        ("Revenue", "Gross profit", 62),
        ("Revenue", "Cost of revenue", 38),
        ("Gross profit", "Operating profit", 24),
        ("Gross profit", "R&D and SG&A", 38),
        ("Operating profit", "Free cash flow", 17),
        ("Operating profit", "Tax and interest", 7),
    ]
    nodes = {
        "Revenue": (48, 190),
        "Gross profit": (250, 112),
        "Cost of revenue": (250, 292),
        "Operating profit": (455, 112),
        "R&D and SG&A": (455, 248),
        "Free cash flow": (650, 76),
        "Tax and interest": (650, 158),
    }
    body = ['  <text x="32" y="38" class="title">Sample Revenue Flow</text>']
    body.append('  <text x="32" y="58" class="note">Dependency-free Sankey-style SVG for smoke testing.</text>')
    max_value = max(value for _, _, value in links)
    for idx, (source, target, value) in enumerate(links):
        sx, sy = nodes[source]
        tx, ty = nodes[target]
        width = scale(value, 0, max_value, 4, 28)
        color = PALETTE[idx % len(PALETTE)]
        body.append(
            f'  <path d="M {sx + 120} {sy} C {sx + 190} {sy}, {tx - 70} {ty}, {tx} {ty}" '
            f'fill="none" stroke="{color}" stroke-width="{width:.1f}" stroke-opacity="0.42"/>'
        )
        mid_x = (sx + tx + 120) / 2
        mid_y = (sy + ty) / 2 - 8
        body.append(f'  <text x="{mid_x:.1f}" y="{mid_y:.1f}" class="axis">{value}</text>')
    for label, (x, y) in nodes.items():
        body.append(f'  <rect x="{x}" y="{y - 22}" width="120" height="44" fill="#f8fafc" stroke="#cbd5e1" rx="5"/>')
        body.append(f'  <text x="{x + 60}" y="{y + 4}" text-anchor="middle" class="axis">{esc(label)}</text>')
    body.append('  <text x="32" y="392" class="note">Values are sample percentage-points of revenue; source: generated test data.</text>')
    return write(
        path,
        svg_root(
            820,
            420,
            "Sample revenue flow",
            "A static Sankey-style flow chart showing revenue allocation into cost, profit, and cash flow nodes.",
            "\n".join(body),
        ),
    )


def render_plotly(path: Path) -> Path:
    labels = ["Revenue", "Gross profit", "Cost", "Operating profit", "Opex", "Free cash flow"]
    payload = {
        "data": [
            {
                "type": "sankey",
                "node": {"label": labels, "pad": 18, "thickness": 18},
                "link": {
                    "source": [0, 0, 1, 1, 3],
                    "target": [1, 2, 3, 4, 5],
                    "value": [62, 38, 24, 38, 17],
                },
            }
        ],
        "layout": {
            "title": {"text": "Sample Plotly Sankey"},
            "font": {"family": "Inter, Arial, sans-serif", "size": 13},
            "margin": {"t": 56, "r": 24, "b": 32, "l": 24},
        },
    }
    content = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sample Plotly Sankey</title>
  <script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
  <style>body {{ margin: 0; font-family: Inter, Arial, sans-serif; }} #chart {{ width: 100vw; height: 92vh; }}</style>
</head>
<body>
  <div id="chart" role="img" aria-label="Interactive Sankey chart"></div>
  <script>
    const spec = {json.dumps(payload, indent=4)};
    Plotly.newPlot("chart", spec.data, spec.layout, {{ responsive: true, displaylogo: false }});
  </script>
</body>
</html>
"""
    return write(path, content)


def render_echarts(path: Path) -> Path:
    option = {
        "title": {"text": "Sample ECharts Dashboard"},
        "tooltip": {"trigger": "axis"},
        "legend": {"top": 28},
        "grid": {"left": 48, "right": 24, "top": 72, "bottom": 48},
        "xAxis": {"type": "category", "data": ["Q1", "Q2", "Q3", "Q4"]},
        "yAxis": {"type": "value", "name": "Index"},
        "series": [
            {"name": "Revenue", "type": "bar", "data": [18, 21, 24, 29]},
            {"name": "Margin", "type": "line", "data": [18, 20, 22, 24]},
        ],
    }
    content = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sample ECharts Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js"></script>
  <style>body {{ margin: 0; font-family: Inter, Arial, sans-serif; }} #chart {{ width: 100vw; height: 92vh; }}</style>
</head>
<body>
  <div id="chart" role="img" aria-label="Interactive bar and line dashboard"></div>
  <script>
    const chart = echarts.init(document.getElementById("chart"));
    chart.setOption({json.dumps(option, indent=4)});
    window.addEventListener("resize", () => chart.resize());
  </script>
</body>
</html>
"""
    return write(path, content)


def render_mermaid(path: Path) -> Path:
    content = """flowchart LR
  A[Collect source data] --> B[Normalize units and periods]
  B --> C{Choose visual method}
  C -->|static artifact| D[Render SVG or PNG]
  C -->|interactive review| E[Render Plotly or ECharts HTML]
  C -->|process explanation| F[Write Mermaid or Graphviz]
  D --> G[Validate labels, sources, and readability]
  E --> G
  F --> G
"""
    return write(path, content)


def main() -> None:
    parser = argparse.ArgumentParser(description="Render chart visualization skill examples.")
    parser.add_argument("--out-dir", type=Path, default=Path("chart-examples"))
    args = parser.parse_args()

    render_dashboard(args.out_dir / "analysis_dashboard.svg")
    render_sankey(args.out_dir / "sankey_flow.svg")
    render_plotly(args.out_dir / "plotly_sankey.html")
    render_echarts(args.out_dir / "echarts_dashboard.html")
    render_mermaid(args.out_dir / "research_flow.mmd")


if __name__ == "__main__":
    main()

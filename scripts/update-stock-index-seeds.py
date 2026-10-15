#!/usr/bin/env python3
"""Refresh reviewed index seeds; inspect the diff and commit before shipping."""
import argparse
import csv
import datetime as dt
import hashlib
import io
import json
import pathlib
import re
import urllib.request

SOURCES = {
    "sp500": "https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv",
    "nasdaq100": "https://api.nasdaq.com/api/quote/list-type/nasdaq100",
}
ROOT = pathlib.Path(__file__).resolve().parent.parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=pathlib.Path, help="Reuse previously captured sp500csv.txt and nasdaq100.txt offline")
    args = parser.parse_args()
    now = dt.datetime.now(dt.timezone.utc)
    snapshots = []
    for key, url in SOURCES.items():
        if args.source_dir:
            raw = (args.source_dir / ("sp500csv.txt" if key == "sp500" else "nasdaq100.txt")).read_bytes()
        else:
            request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (AIFi index snapshot review)", "Accept": "application/json,text/csv"})
            with urllib.request.urlopen(request, timeout=20) as response:
                if response.url != url:
                    raise ValueError("Unexpected index source redirect")
                raw = response.read(1024 * 1024 + 1)
        if len(raw) > 1024 * 1024:
            raise ValueError("Oversized index response")
        if key == "sp500":
            rows = list(csv.DictReader(io.StringIO(raw.decode("utf-8-sig"))))
            symbols = [row["Symbol"] for row in rows]
            date = now.date().isoformat()  # Observed snapshot, not an official effective date.
            name = "datasets/s-and-p-500-companies (Wikipedia-derived)"
            license_name = "ODC-PDDL-1.0"
            low, high = 500, 550
        else:
            response = json.loads(raw)
            data = response["data"]
            rows = data["data"]["rows"]
            if response["status"]["rCode"] != 200 or data["offset"] != 0 or data["totalrecords"] != len(rows) or data["limit"] < len(rows):
                raise ValueError("Incomplete Nasdaq constituent response")
            symbols = [row["symbol"] for row in rows]
            date = dt.datetime.strptime(data["date"], "%b %d, %Y").date().isoformat()
            name = "Nasdaq"
            license_name = "Source terms; factual symbols only"
            low, high = 100, 110
        if not low <= len(symbols) <= high or len(set(symbols)) != len(symbols) or any(not re.fullmatch(r"[A-Z][A-Z0-9.$^/+=-]{0,13}", symbol) for symbol in symbols):
            raise ValueError("Invalid or truncated index symbols")
        snapshots.append(dict(id=key, snapshotDate=date, fetchedAt=now.isoformat(timespec="seconds").replace("+00:00", "Z"), source=url, sourceName=name, sourceHash=hashlib.sha256(raw).hexdigest(), license=license_name, symbols=sorted(symbols)))
    target = ROOT / "apps/cli/internal/store/index-seed.json"
    target.write_text(json.dumps(snapshots, indent=2) + "\n")
    print("Wrote reviewed seed candidates: " + ", ".join(f"{s['id']}: {len(s['symbols'])}" for s in snapshots))
    print("Review membership changes and provenance, run make ci, then commit.")


if __name__ == "__main__":
    main()

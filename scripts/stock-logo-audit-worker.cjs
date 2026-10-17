const { app, nativeImage } = require("electron");
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const options = JSON.parse(
  fs.readFileSync(path.join(__dirname, "options.json")),
);
const { StockLogoCache, validLogoPNG, trustedLogoURL } = require("./host.cjs");
const hash = (b) => crypto.createHash("sha256").update(b).digest("hex");
app.setPath("userData", path.join(__dirname, "profile"));
app
  .whenReady()
  .then(() => {
    const dir = JSON.parse(fs.readFileSync(options["--directory"]));
    const inventory = JSON.parse(
      fs.readFileSync(path.join(options["--catalog"], "catalog-provider.json")),
    );
    const reviewed = JSON.parse(
      fs.readFileSync(path.join(options["--catalog"], "catalog.json")),
    );
    const fallback = JSON.parse(
      fs.readFileSync(path.join(options["--catalog"], "app-fallbacks.json")),
    );
    if (
      !Array.isArray(dir.items) ||
      dir.items.length !== dir.total ||
      dir.total > 30000 ||
      new Set(dir.items.map((r) => r.symbol)).size !== dir.total
    )
      throw Error("Invalid directory audit scope.");
    const index = new Map(inventory.securities.map((r) => [r.symbol, r])),
      extra = new Map(fallback.items.map((r) => [r.symbol, r]));
    const curated = new Map(
      reviewed.companies.flatMap((c) =>
        c.securities.flatMap((s) =>
          [s.symbol, ...(s.aliases || [])].map((k) => [
            k,
            c.logos.filter(
              (l) => l.status === "verified" && l.format === "png",
            ),
          ]),
        ),
      ),
    );
    const files = new Map(),
      checked = new Map();
    const artifactRoot = path.join(options["--catalog"], ".artifacts");
    // Explicit audit-download directories only. Never traverse application profiles.
    const folders = [
      "full-coverage/images",
      "full-coverage",
      "review-20261017",
      "review-20261017/images",
      "full-20261018",
      "full-20261018/images",
    ].map((p) => path.join(artifactRoot, p));
    for (const folder of folders) {
      if (!fs.existsSync(folder)) continue;
      for (const name of fs.readdirSync(folder)) {
        const file = path.join(folder, name),
          stat = fs.lstatSync(file);
        if (
          !stat.isFile() ||
          stat.isSymbolicLink() ||
          !name.endsWith(".png") ||
          stat.size > 262144
        )
          continue;
        const b = fs.readFileSync(file),
          sha = hash(b);
        if (!files.has(sha)) files.set(sha, file);
      }
    }
    function image(sha, width, height) {
      if (!files.has(sha)) return "bytes-not-found";
      if (checked.has(sha)) return checked.get(sha);
      const b = fs.readFileSync(files.get(sha));
      let outcome = "decoded";
      if (
        !validLogoPNG(b) ||
        b.readUInt32BE(16) !== width ||
        b.readUInt32BE(20) !== height ||
        hash(b) !== sha
      )
        outcome = "invalid-bytes";
      else {
        const img = nativeImage.createFromBuffer(b);
        if (
          img.isEmpty() ||
          img.getSize().width !== width ||
          img.getSize().height !== height
        )
          outcome = "decode-failed";
        else {
          const px = img.resize({ width: 64, height: 64 }).toBitmap();
          let visible = 0,
            white = 0;
          for (let i = 0; i < px.length; i += 4)
            if (px[i + 3] > 32) {
              visible++;
              if (Math.min(px[i], px[i + 1], px[i + 2]) > 224) white++;
            }
          if (!visible || (visible > 4096 * 0.95 && white === visible))
            outcome = "blank-image";
        }
      }
      checked.set(sha, outcome);
      return outcome;
    }
    const cacheDir = options["--import-cache"],
      cache = cacheDir ? new StockLogoCache(cacheDir, true) : null;
    const rows = [];
    for (const stock of dir.items) {
      const r = index.get(stock.symbol),
        candidates = [];
      for (const l of curated.get(stock.symbol) || [])
        candidates.push({ ...l, kind: "reviewed", keyHash: l.sha256 });
      const e = extra.get(stock.symbol);
      if (e) candidates.push({ ...e, kind: e.basis, keyHash: e.sha256 });
      if (
        r?.providerOutcome === "png-unverified" &&
        r.providerIdentityStatus !== "rejected"
      )
        candidates.push({
          url: r.providerSourceUrl,
          sha256: r.sha256,
          width: r.width,
          height: r.height,
          checkedAt: r.checkedAt,
          kind: "provider-unverified",
        });
      let result = {
        symbol: stock.symbol,
        name: stock.name,
        status: r ? "no-supported-source" : "not-in-source-inventory",
        source: null,
        basis: null,
        sha256: null,
        sourceCheckedAt: null,
        runtimeReadable: false,
      };
      for (const c of candidates) {
        if (!trustedLogoURL(c.url)) {
          result.status = "source-not-allowed";
          continue;
        }
        const outcome = image(c.sha256, c.width, c.height);
        result.status = outcome;
        if (outcome !== "decoded") continue;
        result = {
          ...result,
          status: "available",
          source: c.url,
          basis: c.kind,
          sha256: c.sha256,
          sourceCheckedAt: c.checkedAt ?? null,
        };
        if (cacheDir) {
          const pngDir = path.join(cacheDir, "stock-logos/v2");
          fs.mkdirSync(pngDir, { recursive: true, mode: 0o700 });
          const key = hash(c.url + "\n" + (c.keyHash || "unreviewed")),
            dest = path.join(pngDir, key + ".png");
          // Import only checked identical bytes; preserve source observation time.
          if (
            !fs.existsSync(dest) ||
            hash(fs.readFileSync(dest)) !== c.sha256
          ) {
            const temp = dest + ".audit-" + crypto.randomUUID();
            fs.copyFileSync(files.get(c.sha256), temp);
            fs.chmodSync(temp, 0o600);
            fs.renameSync(temp, dest);
            const time = result.sourceCheckedAt
              ? new Date(result.sourceCheckedAt)
              : fs.statSync(files.get(c.sha256)).mtime;
            if (!Number.isNaN(+time)) fs.utimesSync(dest, time, time);
          }
          result.runtimeReadable = !!cache.peek(stock.symbol);
          if (!result.runtimeReadable) result.status = "runtime-cache-rejected";
        }
        break;
      }
      rows.push(result);
    }
    cache?.close();
    const count = (list) =>
      list.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
    const indices = JSON.parse(
      fs.readFileSync(
        path.join(options.root, "apps/cli/internal/store/index-seed.json"),
      ),
    );
    const collections = indices.map((g) => ({
      id: g.id,
      total: g.symbols.length,
      outcomes: count(
        g.symbols.map(
          (s) =>
            rows.find((r) => r.symbol === s) || {
              status: "not-in-current-directory",
            },
        ),
      ),
      gaps: g.symbols.filter(
        (s) => !rows.some((r) => r.symbol === s && r.status === "available"),
      ),
    }));
    const report = {
      auditedAt: new Date().toISOString(),
      directorySnapshot: dir.snapshotId,
      sourceSnapshotDate: inventory.asOf,
      total: rows.length,
      importedCache: !!cacheDir,
      outcomes: count(rows),
      collections,
      uniqueImagesDecoded: checked.size,
      rows,
    };
    const out = options["--output"];
    fs.writeFileSync(
      path.join(out, "availability.json"),
      JSON.stringify(report, null, 2),
    );
    const csv = (r) =>
      [r.symbol, r.name, r.status, r.basis, r.source, r.sourceCheckedAt]
        .map((x) => '"' + String(x ?? "").replaceAll('"', '""') + '"')
        .join(",");
    fs.writeFileSync(
      path.join(out, "availability.csv"),
      "symbol,name,status,basis,url,sourceCheckedAt\n" +
        rows.map(csv).join("\n") +
        "\n",
    );
    fs.writeFileSync(
      path.join(out, "unresolved.csv"),
      "symbol,name,status,basis,url,sourceCheckedAt\n" +
        rows
          .filter((r) => r.status !== "available")
          .map(csv)
          .join("\n") +
        "\n",
    );
    console.log(JSON.stringify({ ...report, rows: undefined }));
    app.exit(0);
  })
  .catch((e) => {
    console.error(e);
    app.exit(1);
  });

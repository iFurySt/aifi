CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY);
CREATE TABLE IF NOT EXISTS sync_runs(
 id TEXT PRIMARY KEY, state TEXT NOT NULL CHECK(state IN ('running','succeeded','failed','interrupted')),
 started_at TEXT NOT NULL, lease_until TEXT NOT NULL, finished_at TEXT, snapshot_id TEXT, error TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS one_directory_sync ON sync_runs((1)) WHERE state='running';
CREATE TABLE IF NOT EXISTS source_objects(
 sha256 TEXT PRIMARY KEY, content BLOB NOT NULL
);
CREATE TABLE IF NOT EXISTS directory_snapshots(
 id TEXT PRIMARY KEY, imported_at TEXT NOT NULL, row_count INTEGER NOT NULL, candidate_count INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS snapshot_sources(
 snapshot_id TEXT NOT NULL REFERENCES directory_snapshots(id), name TEXT NOT NULL,
 sha256 TEXT NOT NULL REFERENCES source_objects(sha256), url TEXT NOT NULL,
 file_creation_time TEXT NOT NULL, generation_key TEXT NOT NULL, fetched_at TEXT NOT NULL,
 PRIMARY KEY(snapshot_id,name)
);
CREATE TABLE IF NOT EXISTS listings(
 id TEXT PRIMARY KEY, source TEXT NOT NULL, source_symbol TEXT NOT NULL, exchange_code TEXT NOT NULL,
 first_seen_at TEXT NOT NULL, last_seen_at TEXT NOT NULL,
 UNIQUE(source,source_symbol,exchange_code)
);
CREATE TABLE IF NOT EXISTS directory_memberships(
 snapshot_id TEXT NOT NULL REFERENCES directory_snapshots(id), listing_id TEXT NOT NULL REFERENCES listings(id),
 name TEXT NOT NULL, etf INTEGER NOT NULL CHECK(etf IN (0,1)), test INTEGER NOT NULL CHECK(test IN (0,1)),
 security_type TEXT NOT NULL, fields_json TEXT NOT NULL,
 PRIMARY KEY(snapshot_id,listing_id)
);
CREATE TABLE IF NOT EXISTS directory_aliases(
 snapshot_id TEXT NOT NULL, listing_id TEXT NOT NULL, convention TEXT NOT NULL, symbol TEXT NOT NULL,
 PRIMARY KEY(snapshot_id,listing_id,convention),
 FOREIGN KEY(snapshot_id,listing_id) REFERENCES directory_memberships(snapshot_id,listing_id)
);
CREATE TABLE IF NOT EXISTS directory_head(
 singleton INTEGER PRIMARY KEY CHECK(singleton=1), snapshot_id TEXT NOT NULL REFERENCES directory_snapshots(id)
);
INSERT OR IGNORE INTO schema_migrations(version) VALUES(1);

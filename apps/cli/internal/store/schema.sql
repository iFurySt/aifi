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
CREATE TABLE IF NOT EXISTS service_settings(singleton INTEGER PRIMARY KEY CHECK(singleton=1), revision INTEGER NOT NULL, settings_json TEXT NOT NULL);
INSERT OR IGNORE INTO service_settings VALUES(1,0,'{"directoryEnabled":true,"automatic":true,"intervalHours":24,"secUserAgent":""}');
CREATE TABLE IF NOT EXISTS directory_requests(singleton INTEGER PRIMARY KEY CHECK(singleton=1), requested INTEGER NOT NULL CHECK(requested IN (0,1)));
INSERT OR IGNORE INTO directory_requests VALUES(1,0);
CREATE TABLE IF NOT EXISTS credential_blobs(provider TEXT NOT NULL, field TEXT NOT NULL, ciphertext TEXT NOT NULL, PRIMARY KEY(provider,field));
INSERT OR IGNORE INTO schema_migrations(version) VALUES(2);

CREATE TABLE IF NOT EXISTS index_snapshots(
 id TEXT PRIMARY KEY, collection_id TEXT NOT NULL CHECK(collection_id IN ('sp500','nasdaq100')),
 snapshot_date TEXT NOT NULL, fetched_at TEXT NOT NULL, source_url TEXT NOT NULL,
 source_name TEXT NOT NULL, source_hash TEXT NOT NULL, member_count INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS index_memberships(
 snapshot_id TEXT NOT NULL REFERENCES index_snapshots(id), symbol TEXT NOT NULL,
 PRIMARY KEY(snapshot_id,symbol)
);
CREATE TABLE IF NOT EXISTS index_heads(
 collection_id TEXT PRIMARY KEY CHECK(collection_id IN ('sp500','nasdaq100')),
 snapshot_id TEXT NOT NULL REFERENCES index_snapshots(id)
);
INSERT OR IGNORE INTO schema_migrations(version) VALUES(3);

CREATE TABLE IF NOT EXISTS research_config(
 singleton INTEGER PRIMARY KEY CHECK(singleton=1), revision INTEGER NOT NULL, config_json TEXT NOT NULL
);
INSERT OR IGNORE INTO research_config VALUES(1,0,'{"fundsSource":"yahoo","analystSource":"yahoo","automatic":true,"historyDays":730,"datasets":{"prices":{"enabled":true,"intervalHours":24},"profile":{"enabled":true,"intervalHours":168},"filings":{"enabled":true,"intervalHours":24},"facts":{"enabled":true,"intervalHours":168},"actions":{"enabled":true,"intervalHours":24},"insiders":{"enabled":true,"intervalHours":24},"funds":{"enabled":true,"intervalHours":168},"politicians":{"enabled":false,"intervalHours":24},"analyst":{"enabled":true,"intervalHours":24},"earnings":{"enabled":true,"intervalHours":24},"peers":{"enabled":true,"intervalHours":168},"news":{"enabled":false,"intervalHours":24}}}');
CREATE TABLE IF NOT EXISTS research_jobs(
 id INTEGER PRIMARY KEY, provider TEXT NOT NULL, dataset TEXT NOT NULL, subject TEXT NOT NULL, window TEXT NOT NULL DEFAULT '',
 manual INTEGER NOT NULL DEFAULT 0, state TEXT NOT NULL DEFAULT 'queued', attempts INTEGER NOT NULL DEFAULT 0,
 next_run TEXT NOT NULL, lease TEXT, lease_until TEXT, last_success TEXT, error TEXT NOT NULL DEFAULT '',
 UNIQUE(provider,dataset,subject,window)
);
CREATE INDEX IF NOT EXISTS research_jobs_due ON research_jobs(state,next_run);
CREATE TABLE IF NOT EXISTS research_aliases(symbol TEXT PRIMARY KEY, cik TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS research_evidence(
 hash TEXT PRIMARY KEY, provider TEXT NOT NULL, source_url TEXT NOT NULL, fetched_at TEXT NOT NULL,
 content_gzip BLOB NOT NULL
);
CREATE TABLE IF NOT EXISTS research_snapshots(
 id TEXT PRIMARY KEY, provider TEXT NOT NULL, dataset TEXT NOT NULL, subject TEXT NOT NULL,
 fetched_at TEXT NOT NULL, payload_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS research_snapshot_sources(
 snapshot_id TEXT NOT NULL REFERENCES research_snapshots(id), evidence_hash TEXT NOT NULL REFERENCES research_evidence(hash),
 PRIMARY KEY(snapshot_id,evidence_hash)
);
CREATE TABLE IF NOT EXISTS research_heads(
 dataset TEXT NOT NULL, subject TEXT NOT NULL, snapshot_id TEXT NOT NULL REFERENCES research_snapshots(id),
 PRIMARY KEY(dataset,subject)
);
CREATE TABLE IF NOT EXISTS daily_bars(
 provider TEXT NOT NULL, symbol TEXT NOT NULL, date TEXT NOT NULL, basis TEXT NOT NULL,
 open REAL NOT NULL, high REAL NOT NULL, low REAL NOT NULL, close REAL NOT NULL, volume REAL NOT NULL,
 snapshot_id TEXT NOT NULL REFERENCES research_snapshots(id), PRIMARY KEY(provider,symbol,date,basis)
);
CREATE INDEX IF NOT EXISTS daily_bars_symbol ON daily_bars(symbol,date);
CREATE TABLE IF NOT EXISTS provider_budgets(
 provider TEXT PRIMARY KEY, next_request TEXT NOT NULL, day TEXT NOT NULL, calls INTEGER NOT NULL,
 cooldown_until TEXT NOT NULL DEFAULT '', blocked TEXT NOT NULL DEFAULT ''
);
INSERT OR IGNORE INTO schema_migrations(version) VALUES(4);

CREATE TABLE IF NOT EXISTS research_staging(
 cache_key TEXT PRIMARY KEY, source_url TEXT NOT NULL, fetched_at TEXT NOT NULL, body BLOB NOT NULL
);

CREATE TABLE IF NOT EXISTS research_actions(
 snapshot_id TEXT NOT NULL REFERENCES research_snapshots(id), symbol TEXT NOT NULL,
 record_key TEXT NOT NULL, payload_json TEXT NOT NULL, PRIMARY KEY(snapshot_id,symbol,record_key)
);
CREATE INDEX IF NOT EXISTS research_actions_symbol ON research_actions(symbol,snapshot_id);
CREATE INDEX IF NOT EXISTS research_evidence_source_url ON research_evidence(source_url,fetched_at DESC);
CREATE INDEX IF NOT EXISTS research_manual_pending ON research_jobs(id) WHERE manual=1;

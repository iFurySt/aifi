package store

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func awaitStorage(t *testing.T, db *Store) DatabaseStorage {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		result, err := db.CachedDatabaseStorage(context.Background())
		if err != nil {
			t.Fatal(err)
		}
		if !result.Pending {
			if result.Error != "" {
				t.Fatal(result.Error)
			}
			return result
		}
		time.Sleep(time.Millisecond)
	}
	t.Fatal("background accounting did not finish")
	return DatabaseStorage{}
}
func TestStorageCachePersistsAndReopensWithoutScanning(t *testing.T) {
	dir := t.TempDir()
	ctx := context.Background()
	db, err := Open(ctx, dir)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	cold, err := db.CachedDatabaseStorage(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if !cold.Pending || cold.Bytes <= 0 || len(cold.Categories) != 0 {
		t.Fatalf("cold snapshot: %+v", cold)
	}
	result := awaitStorage(t, db)
	raw, err := os.ReadFile(filepath.Join(dir, "storage-accounting.json"))
	if err != nil {
		t.Fatal(err)
	}
	var saved storageCacheFile
	if json.Unmarshal(raw, &saved) != nil || !validStorageCache(saved, time.Now()) {
		t.Fatal("invalid durable cache")
	}
	if err = db.Close(); err != nil {
		t.Fatal(err)
	}
	reopened, err := Open(ctx, dir)
	if err != nil {
		t.Fatal(err)
	}
	defer reopened.Close()
	hot, err := reopened.CachedDatabaseStorage(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if hot.Pending || hot.UpdatedAt != result.UpdatedAt || hot.Bytes != result.Bytes {
		t.Fatalf("did not reuse: %+v", hot)
	}
	// A schema change invalidates category accounting, without blocking the reader.
	if _, err = reopened.db.ExecContext(ctx, "CREATE TABLE storage_changed(value TEXT)"); err != nil {
		t.Fatal(err)
	}
	changed, err := reopened.CachedDatabaseStorage(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if !changed.Pending {
		t.Fatal("schema change did not schedule a new snapshot")
	}
}
func TestStorageMetadataDoesNotWaitForCollectorConnection(t *testing.T) {
	ctx := context.Background()
	db, err := Open(ctx, t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	// Hold the only primary connection with an open write transaction.
	tx, err := db.db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback()
	short, cancel := context.WithTimeout(ctx, 250*time.Millisecond)
	defer cancel()
	result, err := db.CachedDatabaseStorage(short)
	if err != nil || result.Bytes <= 0 {
		t.Fatalf("metadata blocked by writer: %+v %v", result, err)
	}
	tx.Rollback()
	awaitStorage(t, db)
}
func TestStorageCacheKeepsGoodDetailsOnReaderFailure(t *testing.T) {
	db, err := Open(context.Background(), t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	good := awaitStorage(t, db)
	db.storage.db.Close()
	result, err := db.CachedDatabaseStorage(context.Background())
	if err != nil || result.UpdatedAt != good.UpdatedAt || len(result.Categories) != 6 || result.Error == "" {
		t.Fatalf("lost cache on read failure: %+v %v", result, err)
	}
}

// Opt-in profile only: read an existing store without migrations or source jobs.
// The aggregate cache is written to a temporary test folder, never that store.
func TestStoragePerformanceRealStore(t *testing.T) {
	dir := os.Getenv("AIFI_STORAGE_PROFILE_DIR")
	if dir == "" {
		t.Skip("set AIFI_STORAGE_PROFILE_DIR for read-only size profiling")
	}
	account, err := newStorageAccounting(dir)
	if err != nil {
		t.Fatal(err)
	}
	account.path = filepath.Join(t.TempDir(), "storage-accounting.json")
	account.cached = nil
	defer account.close()
	start := time.Now()
	cold, err := account.snapshot(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("cold_metadata_ms=%d bytes=%d pending=%v", time.Since(start).Milliseconds(), cold.Bytes, cold.Pending)
	deadline := time.Now().Add(70 * time.Second)
	for time.Now().Before(deadline) {
		time.Sleep(250 * time.Millisecond)
		latest, err := account.snapshot(context.Background())
		if err != nil {
			t.Fatal(err)
		}
		if !latest.Pending {
			if latest.Error != "" {
				t.Fatal(latest.Error)
			}
			elapsed := time.Since(start)
			hotStart := time.Now()
			hot, err := account.snapshot(context.Background())
			if err != nil {
				t.Fatal(err)
			}
			var sum int64
			for _, c := range hot.Categories {
				sum += c.Bytes
			}
			if sum != hot.Bytes {
				t.Fatal("invalid category sum")
			}
			t.Logf("exact_background_ms=%d cached_metadata_ms=%d categories=%d bytes=%d", elapsed.Milliseconds(), time.Since(hotStart).Milliseconds(), len(hot.Categories), hot.Bytes)
			return
		}
	}
	t.Fatal("background accounting exceeded profile deadline")
}

func TestStorageStaleCacheReturnsGoodDetailsWhileRefreshing(t *testing.T) {
	ctx := context.Background()
	dir := t.TempDir()
	db, err := Open(ctx, dir)
	if err != nil {
		t.Fatal(err)
	}
	good := awaitStorage(t, db)
	db.storage.mu.Lock()
	db.storage.cached.Storage.UpdatedAt = time.Now().Add(-2 * storageCacheTTL).UTC().Format(time.RFC3339Nano)
	old := db.storage.cached.Storage.UpdatedAt
	db.storage.mu.Unlock()
	next, err := db.CachedDatabaseStorage(ctx)
	if err != nil || !next.Pending || next.UpdatedAt != old || next.Bytes != good.Bytes || len(next.Categories) != 6 {
		t.Fatalf("stale cache not retained: %+v %v", next, err)
	}
	if _, err = db.storage.db.ExecContext(ctx, "CREATE TABLE forbidden_storage_write(value TEXT)"); err == nil {
		t.Fatal("accounting connection accepted writes")
	}
	db.Close()
}

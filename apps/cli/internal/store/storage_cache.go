package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net/url"
	"os"
	"path/filepath"
	"sync"
	"time"
)

const storageCacheTTL = 10 * time.Minute

type storageCacheFile struct {
	Version int             `json:"version"`
	Schema  int64           `json:"schema"`
	Storage DatabaseStorage `json:"storage"`
}
type storageAccounting struct {
	db         *sql.DB
	path       string
	mu         sync.Mutex
	cached     *storageCacheFile
	pending    bool
	failure    bool
	retryAfter time.Time
	cancel     context.CancelFunc
	done       chan struct{}
	closed     bool
}

func newStorageAccounting(directory string) (*storageAccounting, error) {
	uri := url.URL{Scheme: "file", Path: filepath.ToSlash(filepath.Join(directory, "aifi.sqlite"))}
	uri.RawQuery = "mode=ro&_pragma=query_only(1)&_pragma=busy_timeout(250)"
	db, err := sql.Open("sqlite", uri.String())
	if err != nil {
		return nil, err
	}
	// One long read snapshot plus one cheap metadata/status reader. These never
	// occupy the collector's single writer connection or the service RPC loop.
	db.SetMaxOpenConns(2)
	a := &storageAccounting{db: db, path: filepath.Join(directory, "storage-accounting.json")}
	if file, err := os.Open(a.path); err == nil {
		var cache storageCacheFile
		if json.NewDecoder(io.LimitReader(file, 64<<10)).Decode(&cache) == nil && validStorageCache(cache, time.Now()) {
			a.cached = &cache
		}
		file.Close()
	}
	return a, nil
}
func validStorageCache(c storageCacheFile, now time.Time) bool {
	if c.Version != 1 || c.Storage.Bytes <= 0 || len(c.Storage.Categories) != 6 || c.Storage.Pending || c.Storage.Error != "" {
		return false
	}
	at, err := time.Parse(time.RFC3339Nano, c.Storage.UpdatedAt)
	if err != nil || at.After(now.Add(time.Minute)) {
		return false
	}
	var sum int64
	for i, v := range c.Storage.Categories {
		if v.ID != storageCategories()[i].ID || v.Bytes < 0 || v.Bytes > c.Storage.Bytes-sum {
			return false
		}
		sum += v.Bytes
	}
	return sum == c.Storage.Bytes
}
func (a *storageAccounting) snapshot(ctx context.Context) (DatabaseStorage, error) {
	ctx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()
	var bytes, schema int64
	if err := a.db.QueryRowContext(ctx, `SELECT page_count*page_size,schema_version FROM pragma_page_count,pragma_page_size,pragma_schema_version`).Scan(&bytes, &schema); err != nil {
		a.mu.Lock()
		defer a.mu.Unlock()
		if a.cached != nil {
			result := a.cached.Storage
			result.Error = "Database details unavailable."
			return result, nil
		}
		return DatabaseStorage{}, err
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.closed {
		return DatabaseStorage{}, errors.New("storage accounting closed")
	}
	if a.cached != nil && (a.cached.Schema != schema || a.cached.Storage.Bytes > bytes) {
		a.cached = nil
	}
	result := DatabaseStorage{Bytes: bytes, Categories: []StorageCategory{}}
	if a.cached != nil {
		result = a.cached.Storage
	}
	updated, _ := time.Parse(time.RFC3339Nano, result.UpdatedAt)
	if !a.pending && time.Since(updated) >= storageCacheTTL && time.Now().After(a.retryAfter) {
		work, stop := context.WithTimeout(context.Background(), 60*time.Second)
		a.cancel = stop
		a.done = make(chan struct{})
		a.pending = true
		a.failure = false
		go a.calculate(work, schema, a.done)
	}
	result.Pending = a.pending
	if a.failure {
		result.Error = "Database details unavailable."
	}
	return result, nil
}
func (a *storageAccounting) calculate(ctx context.Context, schema int64, done chan struct{}) {
	defer close(done)
	value, err := calculateDatabaseStorage(ctx, a.db)
	var cache *storageCacheFile
	if err == nil {
		cache = &storageCacheFile{Version: 1, Schema: schema, Storage: value}
		// Persist only aggregates, outside the status mutex: even a slow disk must
		// not make the cheap foreground metadata request wait for cache I/O.
		if data, e := json.Marshal(cache); e == nil {
			if file, e := os.CreateTemp(filepath.Dir(a.path), ".storage-accounting-*"); e == nil {
				name := file.Name()
				_, e = file.Write(data)
				closeErr := file.Close()
				if e == nil && closeErr == nil {
					_ = os.Rename(name, a.path)
				}
				_ = os.Remove(name)
			}
		}
	}
	a.mu.Lock()
	if err == nil {
		a.cached = cache
	} else {
		a.failure = true
		a.retryAfter = time.Now().Add(time.Minute)
	}
	a.pending = false
	if a.cancel != nil {
		a.cancel()
		a.cancel = nil
	}
	a.mu.Unlock()
}
func (a *storageAccounting) close() error {
	a.mu.Lock()
	a.closed = true
	if a.cancel != nil {
		a.cancel()
	}
	done := a.done
	a.mu.Unlock()
	if done != nil {
		<-done
	}
	return a.db.Close()
}
func (s *Store) CachedDatabaseStorage(ctx context.Context) (DatabaseStorage, error) {
	return s.storage.snapshot(ctx)
}

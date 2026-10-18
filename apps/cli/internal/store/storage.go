package store

import (
	"context"
	"database/sql"
	"time"
)

type StorageCategory struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Bytes int64  `json:"bytes"`
}
type DatabaseStorage struct {
	Bytes      int64             `json:"bytes"`
	Categories []StorageCategory `json:"categories"`
	UpdatedAt  string            `json:"updatedAt,omitempty"`
	Pending    bool              `json:"pending,omitempty"`
	Error      string            `json:"error,omitempty"`
}

func storageCategories() []StorageCategory {
	return []StorageCategory{
		{ID: "prices", Label: "Price history"}, {ID: "research", Label: "Research snapshots"},
		{ID: "evidence", Label: "Source evidence"}, {ID: "directory", Label: "Stock directory & indexes"},
		{ID: "system", Label: "Sync & settings"}, {ID: "overhead", Label: "Unused pages & overhead"},
	}
}
func storageCategory(table string) int {
	switch table {
	case "daily_bars":
		return 0
	case "research_snapshots", "research_heads", "research_snapshot_sources", "research_actions", "research_aliases":
		return 1
	case "research_evidence", "research_staging":
		return 2
	case "source_objects", "snapshot_sources", "listings", "directory_snapshots", "directory_memberships", "directory_aliases", "directory_head", "index_snapshots", "index_memberships", "index_heads":
		return 3
	case "sqlite_schema":
		return 5
	default:
		return 4
	}
}

// DatabaseStorage is the exact diagnostic scan. Interactive requests instead use
// CachedDatabaseStorage so neither a cold scan nor collector writes block them.
func (s *Store) DatabaseStorage(ctx context.Context) (DatabaseStorage, error) {
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()
	return calculateDatabaseStorage(ctx, s.storage.db)
}
func calculateDatabaseStorage(ctx context.Context, db *sql.DB) (DatabaseStorage, error) {
	result := DatabaseStorage{Categories: storageCategories()}
	tx, err := db.BeginTx(ctx, &sql.TxOptions{ReadOnly: true})
	if err != nil {
		return result, err
	}
	defer tx.Rollback()
	if err = tx.QueryRowContext(ctx, `SELECT page_count*page_size FROM pragma_page_count,pragma_page_size`).Scan(&result.Bytes); err != nil {
		return result, err
	}
	// Read the small schema once. Joining it to dbstat used to repeat schema work
	// for every database page and materialize a huge GROUP BY before any result.
	names := map[string]int{"sqlite_schema": 5}
	schema, err := tx.QueryContext(ctx, `SELECT name,tbl_name FROM sqlite_schema`)
	if err != nil {
		return result, err
	}
	for schema.Next() {
		var name, table string
		if err = schema.Scan(&name, &table); err != nil {
			schema.Close()
			return result, err
		}
		names[name] = storageCategory(table)
	}
	err = schema.Err()
	schema.Close()
	if err != nil {
		return result, err
	}
	// Stream pages without SQL joins/sorts. Unlike aggregate mode, streaming also
	// lets SQLite observe cancellation between pages of a very large btree.
	rows, err := tx.QueryContext(ctx, `SELECT name,pgsize FROM dbstat`)
	if err != nil {
		return result, err
	}
	defer rows.Close()
	var allocated int64
	for rows.Next() {
		var name string
		var size int64
		if err = rows.Scan(&name, &size); err != nil {
			return result, err
		}
		category, ok := names[name]
		if !ok {
			category = 4
		}
		result.Categories[category].Bytes += size
		allocated += size
	}
	if err = rows.Err(); err != nil {
		return result, err
	}
	result.Categories[5].Bytes += result.Bytes - allocated
	result.UpdatedAt = time.Now().UTC().Format(time.RFC3339Nano)
	return result, nil
}

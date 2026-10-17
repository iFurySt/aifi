package store

import (
	"context"
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
}

// DatabaseStorage accounts for SQLite's logical pages, including indexes. WAL
// file bytes belong to the separate host inventory, never this breakdown.
func (s *Store) DatabaseStorage(ctx context.Context) (DatabaseStorage, error) {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()
	result := DatabaseStorage{Categories: []StorageCategory{
		{ID: "prices", Label: "Price history"},
		{ID: "research", Label: "Research snapshots"},
		{ID: "evidence", Label: "Source evidence"},
		{ID: "directory", Label: "Stock directory & indexes"},
		{ID: "system", Label: "Sync & settings"},
		{ID: "overhead", Label: "Unused pages & overhead"},
	}}
	// A single statement observes one SQLite snapshot while collectors write.
	rows, err := s.db.QueryContext(ctx, `WITH sizes AS (
	 SELECT COALESCE(s.tbl_name,d.name) AS table_name, SUM(d.pgsize) AS bytes
	 FROM dbstat d LEFT JOIN sqlite_schema s ON s.name=d.name GROUP BY table_name
	) SELECT table_name, bytes, (SELECT page_count FROM pragma_page_count) *
	 (SELECT page_size FROM pragma_page_size) FROM sizes`)
	if err != nil {
		return result, err
	}
	defer rows.Close()
	var allocated int64
	for rows.Next() {
		var table string
		var size int64
		if err = rows.Scan(&table, &size, &result.Bytes); err != nil {
			return result, err
		}
		category := 4
		switch table {
		case "daily_bars":
			category = 0
		case "research_snapshots", "research_heads", "research_snapshot_sources", "research_actions", "research_aliases":
			category = 1
		case "research_evidence", "research_staging":
			category = 2
		case "source_objects", "snapshot_sources", "listings", "directory_snapshots", "directory_memberships", "directory_aliases", "directory_head", "index_snapshots", "index_memberships", "index_heads":
			category = 3
		case "sqlite_schema":
			category = 5
		}
		result.Categories[category].Bytes += size
		allocated += size
	}
	if err = rows.Err(); err != nil {
		return result, err
	}
	result.Categories[5].Bytes += result.Bytes - allocated
	return result, nil
}

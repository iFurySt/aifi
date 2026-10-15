package store

import (
	"context"
	"crypto/sha256"
	"database/sql"
	_ "embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"regexp"
	"strings"
	"time"
)

//go:embed index-seed.json
var indexSeed []byte

var collectionSymbol = regexp.MustCompile(`^[A-Z][A-Z0-9.$^/+=-]{0,13}$`)

type indexSnapshot struct {
	ID           string   `json:"id"`
	SnapshotDate string   `json:"snapshotDate"`
	FetchedAt    string   `json:"fetchedAt"`
	Source       string   `json:"source"`
	SourceName   string   `json:"sourceName"`
	SourceHash   string   `json:"sourceHash"`
	License      string   `json:"license"`
	Symbols      []string `json:"symbols"`
}

// Import only reviewed bundled snapshots. There is no renderer membership-write RPC.
func seedIndexes(ctx context.Context, tx *sql.Tx, data []byte) error {
	var seeds []indexSnapshot
	if err := json.Unmarshal(data, &seeds); err != nil {
		return err
	}
	if len(seeds) != 2 {
		return errors.New("invalid built-in index seed")
	}
	seenIDs := map[string]bool{}
	for _, seed := range seeds {
		minimum, maximum := 500, 550
		if seed.ID == "nasdaq100" {
			minimum, maximum = 100, 110
		} else if seed.ID != "sp500" {
			return errors.New("invalid built-in index")
		}
		if seenIDs[seed.ID] {
			return errors.New("duplicate built-in index")
		}
		seenIDs[seed.ID] = true
		if _, err := time.Parse("2006-01-02", seed.SnapshotDate); err != nil {
			return err
		}
		if _, err := time.Parse(time.RFC3339, seed.FetchedAt); err != nil {
			return err
		}
		if bytes, err := hex.DecodeString(seed.SourceHash); err != nil || len(bytes) != 32 {
			return errors.New("invalid source checksum")
		}
		if (seed.ID == "sp500" && seed.Source != "https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv") ||
			(seed.ID == "nasdaq100" && seed.Source != "https://api.nasdaq.com/api/quote/list-type/nasdaq100") ||
			len(seed.Symbols) < minimum || len(seed.Symbols) > maximum {
			return errors.New("invalid index source or coverage")
		}
		seen := map[string]bool{}
		for _, symbol := range seed.Symbols {
			if !collectionSymbol.MatchString(symbol) || seen[symbol] {
				return errors.New("invalid index member")
			}
			seen[symbol] = true
		}
		canonical, _ := json.Marshal(seed)
		checksum := sha256.Sum256(canonical)
		snapshotID := seed.ID + ":" + hex.EncodeToString(checksum[:])
		if _, err := tx.ExecContext(ctx, `INSERT OR IGNORE INTO index_snapshots(id,collection_id,snapshot_date,fetched_at,source_url,source_name,source_hash,member_count) VALUES(?,?,?,?,?,?,?,?)`, snapshotID, seed.ID, seed.SnapshotDate, seed.FetchedAt, seed.Source, seed.SourceName, seed.SourceHash, len(seed.Symbols)); err != nil {
			return err
		}
		for _, symbol := range seed.Symbols {
			if _, err := tx.ExecContext(ctx, `INSERT OR IGNORE INTO index_memberships(snapshot_id,symbol) VALUES(?,?)`, snapshotID, symbol); err != nil {
				return err
			}
		}
		// An older executable must not roll a newer reviewed head backwards.
		if _, err := tx.ExecContext(ctx, `INSERT INTO index_heads(collection_id,snapshot_id) VALUES(?,?)
   ON CONFLICT(collection_id) DO UPDATE SET snapshot_id=excluded.snapshot_id
   WHERE (SELECT fetched_at FROM index_snapshots WHERE id=index_heads.snapshot_id) < ?`, seed.ID, snapshotID, seed.FetchedAt); err != nil {
			return err
		}
	}
	return nil
}

type CollectionSelection struct {
	Collection string   `json:"collection,omitempty"`
	Symbols    []string `json:"symbols,omitempty"`
}

type CollectionInfo struct {
	ID                string   `json:"id"`
	SnapshotID        string   `json:"snapshotId,omitempty"`
	SnapshotDate      string   `json:"snapshotDate,omitempty"`
	FetchedAt         string   `json:"fetchedAt,omitempty"`
	Source            string   `json:"source,omitempty"`
	SourceName        string   `json:"sourceName,omitempty"`
	MemberCount       int      `json:"memberCount"`
	AvailableCount    int      `json:"availableCount"`
	UnresolvedSymbols []string `json:"unresolvedSymbols"`
}

func (selection CollectionSelection) Validate() error {
	switch selection.Collection {
	case "", "all-us", "sp500", "nasdaq100":
		if selection.Symbols != nil {
			return errors.New("built-in membership is read-only")
		}
	case "watchlist":
		if len(selection.Symbols) > 50 {
			return errors.New("watchlist too large")
		}
		for _, symbol := range selection.Symbols {
			if !collectionSymbol.MatchString(symbol) {
				return errors.New("invalid watchlist symbol")
			}
		}
	default:
		return errors.New("invalid stock collection")
	}
	return nil
}

func (s *Store) collection(ctx context.Context, selection CollectionSelection) (*CollectionInfo, []string, error) {
	if err := selection.Validate(); err != nil {
		return nil, nil, err
	}
	if selection.Collection == "" || selection.Collection == "all-us" {
		return nil, nil, nil
	}
	info := &CollectionInfo{ID: selection.Collection, UnresolvedSymbols: []string{}}
	symbols := []string{}
	if selection.Collection == "watchlist" {
		seen := map[string]bool{}
		for _, symbol := range selection.Symbols {
			if !seen[symbol] {
				symbols = append(symbols, symbol)
				seen[symbol] = true
			}
		}
	} else {
		if err := s.db.QueryRowContext(ctx, `SELECT p.id,p.snapshot_date,p.fetched_at,p.source_url,p.source_name FROM index_heads h JOIN index_snapshots p ON p.id=h.snapshot_id WHERE h.collection_id=?`, selection.Collection).Scan(&info.SnapshotID, &info.SnapshotDate, &info.FetchedAt, &info.Source, &info.SourceName); err != nil {
			return nil, nil, errors.New("index membership unavailable")
		}
		rows, err := s.db.QueryContext(ctx, `SELECT symbol FROM index_memberships WHERE snapshot_id=? ORDER BY symbol`, info.SnapshotID)
		if err != nil {
			return nil, nil, err
		}
		for rows.Next() {
			var symbol string
			if err = rows.Scan(&symbol); err != nil {
				rows.Close()
				return nil, nil, err
			}
			symbols = append(symbols, symbol)
		}
		err = rows.Err()
		rows.Close()
		if err != nil {
			return nil, nil, err
		}
	}
	info.MemberCount = len(symbols)
	return info, symbols, nil
}

func symbolFilter(symbols []string) (string, []any) {
	if len(symbols) == 0 {
		return " AND 0", nil
	}
	marks := make([]string, len(symbols))
	args := make([]any, len(symbols))
	for i, symbol := range symbols {
		marks[i] = "?"
		args[i] = symbol
	}
	return " AND UPPER(l.source_symbol) IN (" + strings.Join(marks, ",") + ")", args
}

func (s *Store) ListCollection(ctx context.Context, query string, limit, offset int, selection CollectionSelection) (Page, error) {
	return s.list(ctx, query, limit, offset, false, false, selection)
}

package store

import (
	"bytes"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"github.com/ifuryst/aifi/apps/cli/internal/market"
)

// Immutable whole reports are archived once and referenced by many company
// snapshots. Publishing a company still requires its own fenced transaction.
func (s *Store) ArchiveFundEvidence(ctx context.Context, ev market.Evidence) (market.Evidence, error) {
	if !market.IsFundSourceURL(ev.URL) || len(ev.Body) == 0 || len(ev.Body) > 32<<20 || ev.Hash != "" || ev.FetchedAt.IsZero() {
		return ev, errors.New("invalid fund evidence")
	}
	hash := sha256.Sum256(append([]byte(ev.URL+"\n"), ev.Body...))
	h := hex.EncodeToString(hash[:])
	var exists int
	if err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM research_evidence WHERE hash=? AND provider='thirteenf' AND source_url=?", h, ev.URL).Scan(&exists); err != nil {
		return ev, err
	}
	if exists == 0 {
		var body bytes.Buffer
		w := gzip.NewWriter(&body)
		if _, err := w.Write(ev.Body); err != nil {
			return ev, err
		}
		if err := w.Close(); err != nil {
			return ev, err
		}
		if _, err := s.db.ExecContext(ctx, "INSERT OR IGNORE INTO research_evidence VALUES(?,?,?,?,?)", h, "thirteenf", ev.URL, stamp(ev.FetchedAt), body.Bytes()); err != nil {
			return ev, err
		}
	}
	var at string
	if err := s.db.QueryRowContext(ctx, "SELECT fetched_at FROM research_evidence WHERE hash=? AND provider='thirteenf' AND source_url=?", h, ev.URL).Scan(&at); err != nil {
		return ev, err
	}
	fetched, err := time.Parse(time.RFC3339Nano, at)
	if err != nil {
		return ev, err
	}
	return market.Evidence{URL: ev.URL, Hash: h, FetchedAt: fetched}, nil
}

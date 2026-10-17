package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"

	"github.com/ifuryst/aifi/apps/cli/internal/market"
)

// A provider switch cannot fold another source's sample into a holder history.
// Each committed payload already contains a bounded history of observed periods.
func (s *Store) FundsHistory(ctx context.Context, provider, symbol string) ([]market.Record, error) {
	var raw string
	err := s.db.QueryRowContext(ctx, `SELECT payload_json FROM research_snapshots WHERE provider=? AND dataset='funds' AND subject=? ORDER BY fetched_at DESC,rowid DESC LIMIT 1`, provider, symbol).Scan(&raw)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var payload market.Payload
	if err = json.Unmarshal([]byte(raw), &payload); err != nil {
		return nil, err
	}
	return payload.Records, nil
}

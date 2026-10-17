package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

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

func (s *Store) BoundFundsJobs(ctx context.Context, window string, now time.Time) error {
	_, err := s.db.ExecContext(ctx, "UPDATE research_jobs SET state='retired',manual=0 WHERE provider='thirteenf' AND dataset='funds' AND window!=? AND state!='running'", window)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx, "UPDATE research_jobs SET state='queued',next_run=? WHERE provider='thirteenf' AND dataset='funds' AND window=? AND state='retired'", stamp(now), window)
	return err
}

// Explicit dataset sync preserves independent datasets and provider budgets.
func (s *Store) RequestFundsSync(ctx context.Context) error {
	cfg, err := s.ResearchConfig(ctx)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx, "UPDATE research_jobs SET state='queued',manual=1,next_run=?,error='' WHERE dataset='funds' AND provider=? AND state NOT IN ('running','retired')", stamp(time.Now()), cfg.FundsSource)
	return err
}

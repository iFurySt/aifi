package store

import (
	"context"
	"errors"
	"strings"
	"time"
)

// RequestSymbolResearchSync explicitly queues a bounded repair. Ordinary reads
// remain network-free; provider budgets, credentials and dataset switches apply.
func (s *Store) RequestSymbolResearchSync(ctx context.Context, symbols []string) error {
	if len(symbols) == 0 || len(symbols) > 50 {
		return errors.New("choose 1–50 directory symbols")
	}
	cfg, err := s.ResearchConfig(ctx)
	if err != nil {
		return err
	}
	known, err := s.ResearchSymbols(ctx)
	if err != nil {
		return err
	}
	allowed := map[string]bool{}
	for _, symbol := range known {
		allowed[symbol] = true
	}
	subjects := map[string]bool{}
	for _, raw := range symbols {
		symbol := strings.ToUpper(strings.TrimSpace(raw))
		if !allowed[symbol] {
			return errors.New("symbol is not in the current stock directory")
		}
		subjects[symbol] = true
		cik, err := s.CIK(ctx, symbol)
		if err != nil {
			return err
		}
		if cik != "" {
			subjects["cik:"+cik] = true
		}
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for subject := range subjects {
		for dataset, v := range cfg.Datasets {
			if !v.Enabled {
				continue
			}
			// Keep active leases, blocked entitlements and retired history intact.
			if _, err = tx.ExecContext(ctx, `UPDATE research_jobs SET manual=1,next_run=? WHERE subject=? AND dataset=? AND provider=? AND state IN ('queued','idle','failed')`, stamp(time.Now()), subject, dataset, cfg.ProviderFor(dataset)); err != nil {
				return err
			}
		}
	}
	return tx.Commit()
}

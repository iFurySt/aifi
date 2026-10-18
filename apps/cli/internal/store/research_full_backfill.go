package store

import (
	"context"
	"database/sql"
	"errors"
	"sort"
	"time"

	"github.com/ifuryst/aifi/apps/cli/internal/market"
)

// RequestResearchBackfill marks only missing selected-source work as explicit.
// Backoffs, successful snapshots, disabled sources and active leases survive.
func (s *Store) RequestResearchBackfill(ctx context.Context) (int64, error) {
	cfg, err := s.ResearchConfig(ctx)
	if err != nil {
		return 0, err
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	var count int64
	for dataset, v := range cfg.Datasets {
		if !v.Enabled {
			continue
		}
		providers := []string{cfg.ProviderFor(dataset)}
		if cfg.AllowsProvider("nasdaq", dataset) {
			providers = append(providers, "nasdaq")
		}
		for _, provider := range providers {
			r, err := tx.ExecContext(ctx, `UPDATE research_jobs SET manual=1 WHERE dataset=? AND provider=? AND state IN ('queued','idle','failed') AND NOT EXISTS (SELECT 1 FROM research_heads h JOIN research_snapshots s ON s.id=h.snapshot_id WHERE h.dataset=research_jobs.dataset AND h.subject=research_jobs.subject AND s.provider=research_jobs.provider) AND (subject IN (SELECT l.source_symbol FROM directory_head h JOIN directory_memberships m ON m.snapshot_id=h.snapshot_id JOIN listings l ON l.id=m.listing_id WHERE m.etf=0 AND m.test=0) OR subject IN (SELECT 'cik:'||a.cik FROM research_aliases a JOIN listings l ON l.source_symbol=a.symbol JOIN directory_memberships m ON m.listing_id=l.id JOIN directory_head h ON h.snapshot_id=m.snapshot_id WHERE m.etf=0 AND m.test=0) OR (provider='massive' AND dataset='prices' AND subject GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]') OR (dataset='actions' AND subject='us'))`, dataset, provider)
			if err != nil {
				return 0, err
			}
			n, err := r.RowsAffected()
			if err != nil {
				return 0, err
			}
			count += n
		}
	}
	return count, tx.Commit()
}

func (s *Store) SECBulkSubjects(ctx context.Context, dataset string) ([]string, error) {
	if dataset != "facts" && dataset != "filings" {
		return nil, errors.New("invalid bulk dataset")
	}
	rows, err := s.db.QueryContext(ctx, `SELECT DISTINCT 'cik:'||a.cik FROM research_aliases a JOIN listings l ON l.source_symbol=a.symbol JOIN directory_memberships m ON m.listing_id=l.id JOIN directory_head h ON h.snapshot_id=m.snapshot_id WHERE m.etf=0 AND m.test=0 ORDER BY 1`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var subject string
		if err = rows.Scan(&subject); err != nil {
			return nil, err
		}
		out = append(out, subject)
	}
	return out, rows.Err()
}

// A validated local bulk member is an alternative to a failed HTTP request, so
// its import need not wait for the per-company network retry. It still requires
// a current selected source, a missing head and an exclusive fenced lease.
func (s *Store) ClaimSECBulkJob(ctx context.Context, dataset, subject string, now time.Time) (*market.Job, error) {
	if dataset != "facts" && dataset != "filings" {
		return nil, errors.New("invalid bulk dataset")
	}
	cfg, err := s.ResearchConfig(ctx)
	if err != nil {
		return nil, err
	}
	if !cfg.Datasets[dataset].Enabled || cfg.ProviderFor(dataset) != "sec" {
		return nil, nil
	}
	lease := id()
	var j market.Job
	err = s.db.QueryRowContext(ctx, `UPDATE research_jobs SET state='running',lease=?,lease_until=? WHERE provider='sec' AND dataset=? AND subject=? AND window='' AND (state IN ('queued','idle','failed') OR (state='running' AND lease_until<=?)) AND NOT EXISTS (SELECT 1 FROM research_heads h JOIN research_snapshots s ON s.id=h.snapshot_id WHERE h.dataset=research_jobs.dataset AND h.subject=research_jobs.subject AND s.provider='sec') RETURNING id,provider,dataset,subject,window,attempts,manual`, lease, stamp(now.Add(15*time.Minute)), dataset, subject, stamp(now)).Scan(&j.ID, &j.Provider, &j.Dataset, &j.Subject, &j.Window, &j.Attempts, &j.Manual)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	j.Lease = lease
	return &j, nil
}

type BackfillDataset struct {
	Dataset             string         `json:"dataset"`
	Provider            string         `json:"provider"`
	Total               int            `json:"total"`
	WithRecords         int            `json:"withRecords"`
	FallbackWithRecords int            `json:"fallbackWithRecords,omitempty"`
	Empty               int            `json:"empty"`
	Missing             map[string]int `json:"missing"`
}
type BackfillProgress struct {
	NewestStoredPriceDate           string            `json:"newestStoredPriceDate,omitempty"`
	PricesBehindNewestStoredSession int               `json:"pricesBehindNewestStoredSession"`
	At                              time.Time         `json:"at"`
	Universe                        int               `json:"universe"`
	Datasets                        []BackfillDataset `json:"datasets"`
}

// BackfillProgress is a local audit, not a collector. Empty observations are
// separate from useful records; a stored snapshot never implies full history.
func (s *Store) ResearchBackfillProgress(ctx context.Context) (BackfillProgress, error) {
	out := BackfillProgress{At: time.Now().UTC(), Datasets: []BackfillDataset{}}
	cfg, err := s.ResearchConfig(ctx)
	if err != nil {
		return out, err
	}
	tx, err := s.db.BeginTx(ctx, &sql.TxOptions{ReadOnly: true})
	if err != nil {
		return out, err
	}
	defer tx.Rollback()
	type target struct{ symbol, cik string }
	targets := []target{}
	rows, err := tx.QueryContext(ctx, `SELECT DISTINCT l.source_symbol,COALESCE(a.cik,'') FROM directory_head h JOIN directory_memberships m ON m.snapshot_id=h.snapshot_id JOIN listings l ON l.id=m.listing_id LEFT JOIN research_aliases a ON a.symbol=l.source_symbol WHERE m.etf=0 AND m.test=0`)
	if err != nil {
		return out, err
	}
	for rows.Next() {
		var v target
		if err = rows.Scan(&v.symbol, &v.cik); err != nil {
			rows.Close()
			return out, err
		}
		targets = append(targets, v)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return out, err
	}
	out.Universe = len(targets)
	type head struct {
		provider string
		nonempty bool
	}
	heads := map[string]head{}
	rows, err = tx.QueryContext(ctx, `SELECT h.dataset,h.subject,s.provider,CASE h.dataset WHEN 'prices' THEN EXISTS(SELECT 1 FROM daily_bars b WHERE b.provider=s.provider AND b.symbol=h.subject LIMIT 1) WHEN 'profile' THEN COALESCE(json_extract(s.payload_json,'$.profile.description'),'')<>'' OR COALESCE(json_extract(s.payload_json,'$.profile.industry'),'')<>'' WHEN 'facts' THEN COALESCE(json_array_length(s.payload_json,'$.facts'),0)>0 WHEN 'filings' THEN COALESCE(json_array_length(s.payload_json,'$.filings'),0)>0 ELSE COALESCE(json_array_length(s.payload_json,'$.records'),0)>0 END FROM research_heads h JOIN research_snapshots s ON s.id=h.snapshot_id`)
	if err != nil {
		return out, err
	}
	for rows.Next() {
		var dataset, subject string
		var v head
		if err = rows.Scan(&dataset, &subject, &v.provider, &v.nonempty); err != nil {
			rows.Close()
			return out, err
		}
		heads[dataset+":"+subject] = v
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return out, err
	}
	jobs := map[string]string{}
	rows, err = tx.QueryContext(ctx, `SELECT provider,dataset,subject,state FROM research_jobs WHERE state!='retired' ORDER BY id`)
	if err != nil {
		return out, err
	}
	for rows.Next() {
		var p, d, subject, state string
		if err = rows.Scan(&p, &d, &subject, &state); err != nil {
			rows.Close()
			return out, err
		}
		jobs[p+":"+d+":"+subject] = state
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return out, err
	}
	prices := map[string]string{}
	rows, err = tx.QueryContext(ctx, "SELECT symbol,MAX(date) FROM daily_bars WHERE provider=? GROUP BY symbol", cfg.PriceSource)
	if err != nil {
		return out, err
	}
	for rows.Next() {
		var symbol, date string
		if err = rows.Scan(&symbol, &date); err != nil {
			rows.Close()
			return out, err
		}
		prices[symbol] = date
		if date > out.NewestStoredPriceDate {
			out.NewestStoredPriceDate = date
		}
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return out, err
	}
	for _, target := range targets {
		if date := prices[target.symbol]; date != "" && date < out.NewestStoredPriceDate {
			out.PricesBehindNewestStoredSession++
		}
	}
	for dataset, v := range cfg.Datasets {
		if !v.Enabled || dataset == "actions" {
			continue
		}
		p := cfg.ProviderFor(dataset)
		d := BackfillDataset{Dataset: dataset, Provider: p, Total: len(targets), Missing: map[string]int{}}
		for _, target := range targets {
			if dataset == "prices" && p == "massive" {
				if prices[target.symbol] != "" {
					d.WithRecords++
				} else {
					d.Missing["pendingMarketDays"]++
				}
				continue
			}
			subject := target.symbol
			if p == "sec" {
				if target.cik == "" {
					d.Missing["unmapped"]++
					continue
				}
				subject = "cik:" + target.cik
			}
			if h, ok := heads[dataset+":"+subject]; ok && (h.provider == p || h.provider == "nasdaq" && cfg.AllowsProvider("nasdaq", dataset)) {
				if h.nonempty {
					d.WithRecords++
					if h.provider == "nasdaq" {
						d.FallbackWithRecords++
					}
				} else {
					d.Empty++
				}
				continue
			}
			state := jobs[p+":"+dataset+":"+subject]
			if state == "" {
				state = "unscheduled"
			}
			d.Missing[state]++
		}
		out.Datasets = append(out.Datasets, d)
	}
	sort.Slice(out.Datasets, func(i, j int) bool { return out.Datasets[i].Dataset < out.Datasets[j].Dataset })
	return out, tx.Commit()
}

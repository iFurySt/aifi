package command

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/ifuryst/aifi/apps/cli/internal/market"
	"github.com/ifuryst/aifi/apps/cli/internal/research"
	"github.com/ifuryst/aifi/apps/cli/internal/store"
	"github.com/spf13/cobra"
)

func newBackfillCommand(dataDir *string) *cobra.Command {
	var run, queue, bulk bool
	command := &cobra.Command{Use: "backfill", Short: "Audit or resume missing whole-directory research; JSON progress", Args: cobra.NoArgs, RunE: func(cmd *cobra.Command, _ []string) error {
		if bulk && !run {
			return errors.New("--sec-bulk requires --run")
		}
		path := *dataDir
		if path == "" {
			base, err := os.UserConfigDir()
			if err != nil {
				return err
			}
			path = filepath.Join(base, "aifi", "data")
		}
		path, err := filepath.Abs(path)
		if err != nil {
			return err
		}
		ctx, cancel := context.WithCancel(cmd.Context())
		defer cancel()
		db, err := store.Open(ctx, path)
		if err != nil {
			return err
		}
		defer db.Close()
		engine := research.New(db, path, false)
		if queue || run {
			if err = engine.Reconcile(ctx, true); err != nil {
				return err
			}
			if _, err = db.RequestResearchBackfill(ctx); err != nil {
				return err
			}
		}
		encoder := json.NewEncoder(cmd.OutOrStdout())
		report := func() error {
			progress, err := db.ResearchBackfillProgress(ctx)
			if err != nil {
				return err
			}
			return encoder.Encode(progress)
		}
		if err = report(); err != nil || !run {
			return err
		}
		var workers sync.WaitGroup
		workers.Add(1)
		go func() { defer workers.Done(); engine.Run(ctx) }()
		if bulk {
			for _, dataset := range []string{"facts", "filings"} {
				workers.Add(1)
				go func(dataset string) {
					defer workers.Done()
					for attempt := 0; ctx.Err() == nil; attempt++ {
						err := importSECBulk(ctx, db, engine.Client, dataset, filepath.Join(path, "bulk-cache"), cmd)
						if err == nil || ctx.Err() != nil {
							return
						}
						// Never print contact headers or arbitrary provider bodies.
						var failure *market.Failure
						_ = errors.As(err, &failure)
						code := backfillFailureCode(err)
						fmt.Fprintf(cmd.ErrOrStderr(), "SEC %s: %s; normal per-company collector continues\n", dataset, code)
						if code != "network_error" && code != "incomplete_response" && code != "rate_limited" && code != "store_busy" && code != "store_timeout" {
							return
						}
						delay := time.Duration(1<<min(attempt, 5)) * time.Minute
						if failure != nil && failure.RetryAfter > delay {
							delay = failure.RetryAfter
						}
						if code == "rate_limited" {
							_ = db.CooldownProvider(ctx, "sec", "", time.Now().Add(delay))
						}
						timer := time.NewTimer(delay)
						select {
						case <-ctx.Done():
							timer.Stop()
							return
						case <-timer.C:
						}
					}
				}(dataset)
			}
		}
		defer func() { cancel(); workers.Wait() }()
		ticker := time.NewTicker(time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return nil
			case <-ticker.C:
				if err = report(); err != nil {
					return err
				}
			}
		}
	}}
	command.Flags().BoolVar(&queue, "queue", false, "Persist missing-only requests without changing successful jobs or backoffs")
	command.Flags().BoolVar(&run, "run", false, "Run independent resumable workers until interrupted; same shared budgets as the app")
	command.Flags().BoolVar(&bulk, "sec-bulk", false, "Import official SEC nightly facts/submissions ZIPs (about 3 GB total, max 3 GiB each)")
	return command
}

func importSECBulk(ctx context.Context, db *store.Store, client *market.Client, dataset, cacheDir string, cmd *cobra.Command) error {
	cfg, err := db.ResearchConfig(ctx)
	if err != nil {
		return err
	}
	if !cfg.Datasets[dataset].Enabled || cfg.ProviderFor(dataset) != "sec" {
		return nil
	}
	fmt.Fprintf(cmd.ErrOrStderr(), "SEC %s: preparing official bulk archive\n", dataset)
	archive, err := client.DownloadSECBulk(market.WithJob(ctx, market.Job{Provider: "sec", Dataset: dataset, Manual: true}), dataset, cacheDir)
	if err != nil {
		return err
	}
	defer archive.Close()
	subjects, err := db.SECBulkSubjects(ctx, dataset)
	if err != nil {
		return err
	}
	stored, failed := 0, 0
	for _, subject := range subjects {
		if err = ctx.Err(); err != nil {
			return err
		}
		job, err := db.ClaimSECBulkJob(ctx, dataset, subject, time.Now())
		if err != nil {
			return err
		}
		if job == nil {
			continue
		}
		result, collectErr := client.CollectSECBulk(ctx, *job, archive)
		if collectErr == nil {
			fresh, configErr := db.ResearchConfig(ctx)
			if configErr != nil {
				return configErr
			}
			if !fresh.Datasets[dataset].Enabled || fresh.ProviderFor(dataset) != "sec" {
				collectErr = &market.Failure{Code: "paused"}
			} else {
				collectErr = db.FinishResearchJob(ctx, *job, result, time.Now(), time.Now().Add(time.Duration(fresh.Datasets[dataset].IntervalHours)*time.Hour))
			}
		}
		if collectErr != nil {
			code := backfillFailureCode(collectErr)
			// A missing/invalid bulk member is not proof that the live API has
			// no data. Preserve the normal HTTP fallback and its source checks.
			cleanup, stop := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
			err = db.FailResearchJob(cleanup, *job, code, time.Now().Add(time.Minute), false)
			stop()
			if err != nil {
				return err
			}
			failed++
		} else {
			stored++
		}
		if (stored+failed)%250 == 0 {
			fmt.Fprintf(cmd.ErrOrStderr(), "SEC %s: imported %d, fallback %d\n", dataset, stored, failed)
		}
	}
	fmt.Fprintf(cmd.ErrOrStderr(), "SEC %s: imported %d, fallback %d; existing snapshots retained\n", dataset, stored, failed)
	return nil
}

// SQLite extended BUSY/LOCKED codes are transient across cooperating app/CLI
// writers. Keep their classification, not the raw database error text, in logs.
func backfillFailureCode(err error) string {
	var failure *market.Failure
	if errors.As(err, &failure) {
		return failure.Code
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return "store_timeout"
	}
	var coded interface{ Code() int }
	if errors.As(err, &coded) {
		switch coded.Code() & 0xff {
		case 5, 6:
			return "store_busy"
		}
	}
	return "bulk_import_failed"
}

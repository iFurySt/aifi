// Package research owns bounded, resumable all-directory collection.
package research

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"encoding/base64"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
	_ "time/tzdata"

	"github.com/ifuryst/aifi/apps/cli/internal/market"
	"github.com/ifuryst/aifi/apps/cli/internal/store"
)

type Engine struct {
	DB            *store.Store
	Client        *market.Client
	Offline       bool
	Now           func() time.Time
	fingerprint   string
	lastReconcile time.Time
	yahooCursor   int
}

func New(db *store.Store, path string, offline bool) *Engine {
	e := &Engine{DB: db, Offline: offline, Now: time.Now}
	c := market.NewClient()
	e.Client = c
	c.ReadPayload = db.ResearchPayload
	c.ReadFundsHistory = db.FundsHistory
	c.ReadEvidence = db.ResearchEvidence
	c.ReadArchive = db.ResearchArchive
	c.ReadStage = db.ResearchStage
	c.SaveStage = db.SaveResearchStage
	c.Key = func(ctx context.Context, p string) (map[string]string, error) {
		blobs, err := db.EncryptedCredentials(ctx, p)
		if err != nil {
			return nil, err
		}
		out := map[string]string{}
		if len(blobs) == 0 {
			return out, nil
		}
		key, err := os.ReadFile(filepath.Join(path, "aifi-vault.key"))
		if err != nil || len(key) != 32 {
			return nil, &market.Failure{Code: "vault_unavailable"}
		}
		block, err := aes.NewCipher(key)
		if err != nil {
			return nil, &market.Failure{Code: "vault_unavailable"}
		}
		gcm, err := cipher.NewGCM(block)
		if err != nil {
			return nil, err
		}
		for field, blob := range blobs {
			raw, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(blob, "v1:"))
			if err != nil || len(raw) < 29 {
				return nil, &market.Failure{Code: "vault_unavailable"}
			}
			sealed := append(append([]byte{}, raw[28:]...), raw[12:28]...)
			plain, err := gcm.Open(nil, raw[:12], sealed, nil)
			if err != nil {
				return nil, &market.Failure{Code: "vault_unavailable"}
			}
			out[field] = string(plain)
		}
		return out, nil
	}
	c.SECContact = func(ctx context.Context) (string, error) {
		settings, err := db.Settings(ctx)
		return settings.SECUserAgent, err
	}
	c.Gate = func(ctx context.Context, p string) error {
		for {
			cfg, err := db.ResearchConfig(ctx)
			if err != nil {
				return err
			}

			if j, ok := market.ContextJob(ctx); ok {
				if !cfg.Automatic && !j.Manual {
					return &market.Failure{Code: "paused"}
				}
				if j.Dataset != "identity" && j.Provider != cfg.ProviderFor(j.Dataset) && !(j.Provider == "sec" && j.Dataset == "filings" && cfg.Datasets["insiders"].Enabled) {
					return &market.Failure{Code: "paused"}
				}
				if j.Dataset != "identity" && !cfg.Datasets[j.Dataset].Enabled {
					return &market.Failure{Code: "paused"}
				}
			}
			wait, blocked, err := db.ReserveProvider(ctx, p, cfg.Limits[p], e.Now())
			if err != nil {
				return err
			}
			if blocked != "" {
				return &market.Failure{Code: blocked}
			}
			if wait <= 0 {
				return nil
			}
			if wait > time.Minute {
				return &market.Failure{Code: "quota_wait", RetryAfter: wait}
			}
			timer := time.NewTimer(wait)
			select {
			case <-ctx.Done():
				timer.Stop()
				return ctx.Err()
			case <-timer.C:
			}
		}
	}
	return e
}

// Reconcile is independent of page visits. Each current candidate gets jobs,
// including unknown/unmapped listings; mapping misses remain visible in status.
func (e *Engine) Reconcile(ctx context.Context, force bool) error {
	cfg, err := e.DB.ResearchConfig(ctx)
	if err != nil {
		return err
	}
	fingerprint, err := e.DB.ResearchFingerprint(ctx)
	if err != nil {
		return err
	}
	now := e.Now()
	fingerprint += "/" + market.Marshal(cfg)
	if !force && fingerprint == e.fingerprint && now.Sub(e.lastReconcile) < time.Hour {
		return nil
	}
	manualIssuers, err := e.DB.ManualIssuers(ctx)
	if err != nil {
		return err
	}
	symbols, err := e.DB.ResearchSymbols(ctx)
	if err != nil {
		return err
	}
	jobs := []market.Job{{Provider: "sec", Dataset: "identity", Subject: "us"}, {Provider: "massive", Dataset: "actions", Subject: "us"}}
	// Date-only batches are intentionally raw; split adjustments are computed from
	// persisted actions, so a new split cannot leave older stored bars inconsistent.
	location, err := time.LoadLocation("America/New_York")
	if err != nil {
		return err
	}
	local := now.In(location)
	end := time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, location).AddDate(0, 0, -1)
	for i := 0; i < cfg.HistoryDays; i++ {
		date := end.AddDate(0, 0, -i)
		if date.Weekday() == time.Saturday || date.Weekday() == time.Sunday {
			continue
		}
		jobs = append(jobs, market.Job{Provider: "massive", Dataset: "prices", Subject: date.Format("2006-01-02")})
	}
	quarter := time.Date(local.Year(), time.Month(((int(local.Month())-1)/3)*3+1), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 0, -1).Format("2006-01-02")
	for _, symbol := range symbols {
		for _, d := range []string{"prices", "profile", "facts", "filings", "analyst", "earnings", "peers", "funds"} {
			jobs = append(jobs, market.Job{Provider: "yahoo", Dataset: d, Subject: symbol})
		}
		for _, d := range []string{"profile", "funds", "politicians", "analyst", "news"} {
			p := "massive"
			if d == "funds" || d == "politicians" || d == "analyst" || d == "news" {
				p = "fmp"
			}
			j := market.Job{Provider: p, Dataset: d, Subject: symbol}
			if d == "funds" {
				j.Window = quarter
			}
			jobs = append(jobs, j)
		}
		cik, err := e.DB.CIK(ctx, symbol)
		if err != nil {
			return err
		}
		if cik != "" {
			for _, d := range []string{"filings", "facts", "insiders"} {
				jobs = append(jobs, market.Job{Provider: "sec", Dataset: d, Subject: "cik:" + cik, Manual: manualIssuers[cik]})
			}
		}
	}
	// Bounded transactions keep local reads responsive even for the full directory.
	for start := 0; start < len(jobs); start += 500 {
		stop := min(start+500, len(jobs))
		if err = e.DB.AddResearchJobs(ctx, jobs[start:stop], now); err != nil {
			return err
		}
	}
	if err = e.DB.BoundPriceJobs(ctx, end.AddDate(0, 0, -cfg.HistoryDays+1).Format("2006-01-02"), now); err != nil {
		return err
	}
	if err = e.DB.UseSharedActions(ctx); err != nil {
		return err
	}
	if cfg.PriceSource == "yahoo" && cfg.Datasets["prices"].IntervalHours <= 24 {
		if err = e.DB.WakeCompletedYahooPrices(ctx, now); err != nil {
			return err
		}
	}
	if err = e.DB.WakeYahooQuoteMetadata(ctx, now); err != nil {
		return err
	}
	if err = e.DB.WakeFinancialFacts(ctx, now); err != nil {
		return err
	}
	e.fingerprint = fingerprint
	e.lastReconcile = now
	return nil
}
func (e *Engine) Step(ctx context.Context, p string) (bool, error) {
	cfg, err := e.DB.ResearchConfig(ctx)
	if err != nil {
		return false, err
	}
	if e.Offline {
		return false, nil
	}
	enabled := []string{}
	for d, v := range cfg.Datasets {
		if v.Enabled && p == cfg.ProviderFor(d) {
			enabled = append(enabled, d)
		}
	}
	if cfg.Datasets["filings"].Enabled || cfg.Datasets["facts"].Enabled || cfg.Datasets["insiders"].Enabled {
		enabled = append(enabled, "identity")
	}
	if p == "sec" && cfg.Datasets["insiders"].Enabled && cfg.ProviderFor("filings") != "sec" && cfg.Datasets["filings"].Enabled {
		enabled = append(enabled, "filings")
	}
	// Do not claim thousands of jobs just to rediscover an unavailable account.
	keys, err := e.Client.Key(ctx, p)
	if err != nil {
		return false, nil
	}
	if p != "sec" && p != "yahoo" && keys["apiKey"] == "" {
		return false, nil
	}
	if p == "sec" {
		contact, err := e.Client.SECContact(ctx)
		if err != nil || !strings.Contains(contact, "@") {
			return false, nil
		}
	}
	providerBlock, err := e.DB.ProviderBlocked(ctx, p)
	if err != nil || providerBlock != "" {
		return false, err
	}
	wait, err := e.DB.ProviderWait(ctx, p, cfg.Limits[p], e.Now())
	if err != nil || wait > time.Minute {
		return false, err
	}
	var j *market.Job
	if p == "yahoo" {
		// Rotate datasets before claiming: an existing universe-size price backlog
		// must not starve company details and financials. All requests share a budget.
		order := []string{"profile", "filings", "facts", "prices", "analyst", "earnings", "peers", "funds"}
		for i := 0; i < len(order); i++ {
			d := order[e.yahooCursor%len(order)]
			e.yahooCursor++
			if !cfg.Datasets[d].Enabled || cfg.ProviderFor(d) != p {
				continue
			}
			j, err = e.DB.ClaimResearchJob(ctx, p, []string{d}, !cfg.Automatic, e.Now())
			if err != nil || j != nil {
				break
			}
		}
	} else {
		j, err = e.DB.ClaimResearchJob(ctx, p, enabled, !cfg.Automatic, e.Now())
	}
	if err != nil || j == nil {
		return false, err
	}
	jobCtx, cancel := context.WithTimeout(ctx, 10*time.Minute)
	defer cancel()
	result, err := e.Client.Collect(jobCtx, *j)
	now := e.Now()
	if err == nil {
		hours := 24
		if v, ok := cfg.Datasets[j.Dataset]; ok {
			hours = v.IntervalHours
		}
		next := now.Add(time.Duration(hours) * time.Hour)
		if p == "yahoo" && j.Dataset == "prices" {
			next = market.NextPriceRefresh(now, hours, result.Payload.Quote)
		}
		if j.Dataset == "prices" && p != "yahoo" {
			date, _ := time.Parse("2006-01-02", j.Subject)
			if now.Sub(date) > 7*24*time.Hour {
				next = now.Add(30 * 24 * time.Hour)
			}
		}
		if p == "yahoo" && j.Dataset == "prices" {
			cutoff := now.AddDate(0, 0, -cfg.HistoryDays).Format("2006-01-02")
			bars := result.Bars[:0]
			for _, b := range result.Bars {
				if b.Date >= cutoff {
					bars = append(bars, b)
				}
			}
			result.Bars = bars
		}
		if p == "yahoo" && j.Dataset == "prices" && len(result.Bars) == 0 {
			err = &market.Failure{Code: "not_found"}
		} else {
			err = e.DB.FinishResearchJob(ctx, *j, result, now, next)
		}
		if err == nil {
			return true, nil
		}
	}
	code := "collection_failed"
	retry := time.Duration(1<<min(j.Attempts, 6)) * time.Minute
	blocked := false
	var failure *market.Failure
	if errors.As(err, &failure) {
		code = failure.Code
		if (code == "access_denied" || code == "invalid_key") && p == "yahoo" {
			code = "rate_limited"
			failure = &market.Failure{Code: code, RetryAfter: 15 * time.Minute}
		}
		if code == "access_denied" {
			_ = e.DB.BlockResearchDataset(ctx, p, j.Dataset, code)
		}
		if code == "not_found" || code == "unsupported_symbol" {
			hours := cfg.Datasets[j.Dataset].IntervalHours
			if hours < 24 {
				hours = 24
			}
			retry = time.Duration(hours) * time.Hour
		}
		if failure.RetryAfter > retry {
			retry = failure.RetryAfter
		}
		blocked = code == "access_denied" || code == "invalid_key" || code == "unsupported_dataset"
		if code == "invalid_key" || (p == "sec" && code == "access_denied") {
			_ = e.DB.CooldownProvider(ctx, p, code, now)
		} else if code == "rate_limited" {
			_ = e.DB.CooldownProvider(ctx, p, "", now.Add(retry))
		}
	}
	if errors.Is(err, context.Canceled) {
		code = "interrupted"
		retry = time.Minute
	}
	cleanup, stop := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
	defer stop()
	return true, e.DB.FailResearchJob(cleanup, *j, code, now.Add(retry), blocked)
}
func (e *Engine) Run(ctx context.Context) {
	if e.Offline {
		return
	}
	var workers sync.WaitGroup
	// One worker per provider; all requests also pass the durable shared budget.
	for _, p := range []string{"massive", "sec", "fmp", "yahoo"} {
		workers.Add(1)
		go func(provider string) {
			defer workers.Done()
			for ctx.Err() == nil {
				worked, _ := e.Step(ctx, provider)
				delay := time.Second
				if !worked {
					delay = 5 * time.Second
				}
				timer := time.NewTimer(delay)
				select {
				case <-ctx.Done():
					timer.Stop()
					return
				case <-timer.C:
				}
			}
		}(p)
	}
	defer workers.Wait()
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for ctx.Err() == nil {
		_ = e.Reconcile(ctx, false)
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

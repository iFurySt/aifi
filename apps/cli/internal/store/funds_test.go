package store

import (
	"context"
	"github.com/ifuryst/aifi/apps/cli/internal/market"
	"testing"
	"time"
)

func TestFundsOfflineHistoryAndProviderIsolation(t *testing.T) {
	ctx := context.Background()
	path := t.TempDir()
	db, err := Open(ctx, path)
	if err != nil {
		t.Fatal(err)
	}
	now := time.Now().UTC()
	for _, provider := range []string{"yahoo", "fmp"} {
		if err = db.AddResearchJobs(ctx, []market.Job{{Provider: provider, Dataset: "funds", Subject: "AAPL"}}, now); err != nil {
			t.Fatal(err)
		}
		j, e := db.ClaimResearchJob(ctx, provider, []string{"funds"}, false, now)
		if e != nil || j == nil {
			t.Fatal(j, e)
		}
		records := []market.Record{}
		for i := 0; i < 250; i++ {
			records = append(records, market.Record{"recordKind": "holding", "name": provider, "holderKind": "institution", "holderId": provider, "reportDate": "2026-06-30", "shares": 100})
		}
		e = db.FinishResearchJob(ctx, *j, market.Result{Payload: market.Payload{Version: 1, Records: records}, Evidence: []market.Evidence{{URL: "https://example.invalid/synthetic", Body: []byte(`{"fixture":true}`), FetchedAt: now}}}, now, now.Add(time.Hour))
		if e != nil {
			t.Fatal(e)
		}
	}
	db.Close()
	db, err = Open(ctx, path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	for _, p := range []string{"yahoo", "fmp"} {
		rows, e := db.FundsHistory(ctx, p, "AAPL")
		if e != nil || len(rows) != 250 || rows[0]["name"] != p {
			t.Fatal("cross-source history or lost rows", e, len(rows))
		}
	}
	view, e := db.ResearchRead(ctx, "AAPL")
	if e != nil || len(view.Datasets["funds"].Data.Records) != 250 {
		t.Fatal("local read truncated below funds contract", e)
	}
}
func TestFundsSettingsDefaultsAndExistingPause(t *testing.T) {
	ctx := context.Background()
	db, err := Open(ctx, t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	c, err := db.ResearchConfig(ctx)
	if err != nil || c.ProviderFor("funds") != "yahoo" || !c.Datasets["funds"].Enabled {
		t.Fatal(c, err)
	}
	c.FundsSource = ""
	c.Datasets["funds"] = DatasetConfig{false, 72}
	if _, err = db.db.ExecContext(ctx, "UPDATE research_config SET config_json=?", market.Marshal(c)); err != nil {
		t.Fatal(err)
	}
	c, err = db.ResearchConfig(ctx)
	if err != nil || c.FundsSource != "yahoo" || c.Datasets["funds"].Enabled || c.Datasets["funds"].IntervalHours != 72 {
		t.Fatal("old paused config changed", c, err)
	}
	c.FundsSource = "fmp"
	c, err = db.SaveResearchConfig(ctx, c)
	if err != nil || c.ProviderFor("funds") != "fmp" {
		t.Fatal(c, err)
	}
	c.FundsSource = "unknown"
	if _, err = db.SaveResearchConfig(ctx, c); err == nil {
		t.Fatal("unknown funds source accepted")
	}
}

func TestHistoricalFundsConfigAndScopedSync(t *testing.T) {
	ctx := context.Background()
	db, e := Open(ctx, t.TempDir())
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close()
	cfg, e := db.ResearchConfig(ctx)
	if e != nil {
		t.Fatal(e)
	}
	cfg.FundsSource = "thirteenf"
	cfg.FundsHistoryQuarters = 14
	cfg, e = db.SaveResearchConfig(ctx, cfg)
	if e != nil || cfg.Limits["thirteenf"].PerMinute != 12 {
		t.Fatal(cfg, e)
	}
	now := time.Now().UTC()
	jobs := []market.Job{{Provider: "thirteenf", Dataset: "funds", Subject: "AAPL", Window: "2026-06-30:14"}, {Provider: "thirteenf", Dataset: "funds", Subject: "AAPL", Window: "2026-06-30:8"}, {Provider: "yahoo", Dataset: "funds", Subject: "AAPL"}, {Provider: "yahoo", Dataset: "prices", Subject: "AAPL"}}
	if e = db.AddResearchJobs(ctx, jobs, now); e != nil {
		t.Fatal(e)
	}
	if _, e = db.db.ExecContext(ctx, "UPDATE research_jobs SET state='idle'"); e != nil {
		t.Fatal(e)
	}
	if e = db.BoundFundsJobs(ctx, "2026-06-30:14", now); e != nil {
		t.Fatal(e)
	}
	if e = db.RequestFundsSync(ctx); e != nil {
		t.Fatal(e)
	}
	var n int
	if e = db.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM research_jobs WHERE state='queued' AND manual=1").Scan(&n); e != nil || n != 1 {
		t.Fatal(n, e)
	}
	if e = db.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM research_jobs WHERE provider='yahoo' AND state='idle' AND manual=0").Scan(&n); e != nil || n != 2 {
		t.Fatal(n, e)
	}
	cfg.FundsHistoryQuarters = 100
	if _, e = db.SaveResearchConfig(ctx, cfg); e == nil {
		t.Fatal("unbounded history accepted")
	}
}

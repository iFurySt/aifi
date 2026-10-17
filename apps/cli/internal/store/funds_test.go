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

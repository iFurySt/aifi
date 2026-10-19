package store

import (
	"context"
	"github.com/ifuryst/aifi/apps/cli/internal/market"
	"strings"
	"testing"
	"time"
)

func TestNewsDefaultsLegacySelectionsAndDisabledCoverage(t *testing.T) {
	db := openTest(t)
	ctx := context.Background()
	cfg, err := db.ResearchConfig(ctx)
	if err != nil || cfg.NewsSource != "yahoo" || !cfg.Datasets["news"].Enabled {
		t.Fatal(cfg, err)
	}
	for _, enabled := range []bool{false, true} {
		raw := market.Marshal(cfg)
		raw = strings.Replace(raw, `"newsSource":"yahoo",`, "", 1)
		if !enabled {
			raw = strings.Replace(raw, `"news":{"enabled":true`, `"news":{"enabled":false`, 1)
		}
		if _, err = db.db.ExecContext(ctx, "UPDATE research_config SET config_json=? WHERE singleton=1", raw); err != nil {
			t.Fatal(err)
		}
		legacy, err := db.ResearchConfig(ctx)
		expected := "yahoo"
		if enabled {
			expected = "fmp"
		}
		if err != nil || legacy.NewsSource != expected || legacy.Datasets["news"].Enabled != enabled {
			t.Fatal(legacy, err)
		}
	}
	cfg, _ = db.ResearchConfig(ctx)
	cfg.NewsSource = "yahoo"
	cfg.Datasets["news"] = DatasetConfig{false, 24}
	if _, err = db.SaveResearchConfig(ctx, cfg); err != nil {
		t.Fatal(err)
	}
	view, err := db.ResearchRead(ctx, "AAPL")
	if err != nil || view.Coverage["news"] != "disabled" {
		t.Fatal(view.Coverage, err)
	}
	cfg, _ = db.ResearchConfig(ctx)
	cfg.NewsSource = "untrusted"
	if _, err = db.SaveResearchConfig(ctx, cfg); err == nil {
		t.Fatal("invalid source saved")
	}
}
func TestNewsSnapshotSurvivesRestartFailureAndDisabledSync(t *testing.T) {
	ctx := context.Background()
	path := t.TempDir()
	db, err := Open(ctx, path)
	if err != nil {
		t.Fatal(err)
	}
	now := time.Now().UTC()
	job := market.Job{Provider: "yahoo", Dataset: "news", Subject: "AAPL"}
	if err = db.AddResearchJobs(ctx, []market.Job{job}, now); err != nil {
		t.Fatal(err)
	}
	j, err := db.ClaimResearchJob(ctx, "yahoo", []string{"news"}, false, now)
	if err != nil || j == nil {
		t.Fatal(err)
	}
	result := market.Result{Payload: market.Payload{Records: []market.Record{{"title": "Saved headline", "publishedDate": "2026-10-19T14:00:00Z", "url": "https://finance.yahoo.com/news/saved.html"}}}, Evidence: []market.Evidence{{URL: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=AAPL&region=US&lang=en-US", Body: []byte(`<rss>source fixture</rss>`), FetchedAt: now}}}
	if err = db.FinishResearchJob(ctx, *j, result, now, now.Add(time.Hour)); err != nil {
		t.Fatal(err)
	}
	db.Close()
	db, err = Open(ctx, path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	j, err = db.ClaimResearchJob(ctx, "yahoo", []string{"news"}, false, now.Add(2*time.Hour))
	if err != nil || j == nil {
		t.Fatal(err)
	}
	if err = db.FailResearchJob(ctx, *j, "network_error", now.Add(3*time.Hour), false); err != nil {
		t.Fatal(err)
	}
	cfg, _ := db.ResearchConfig(ctx)
	cfg.Datasets["news"] = DatasetConfig{false, 24}
	if _, err = db.SaveResearchConfig(ctx, cfg); err != nil {
		t.Fatal(err)
	}
	view, err := db.ResearchRead(ctx, "AAPL")
	if err != nil || view.Coverage["news"] != "stored" || view.Datasets["news"].Data.Records[0]["title"] != "Saved headline" {
		t.Fatal(view, err)
	}
	ev, err := db.ResearchEvidence(ctx, "news", "AAPL")
	if err != nil || len(ev) != 1 || !strings.Contains(string(ev[0].Body), "source fixture") {
		t.Fatal(ev, err)
	}
}

package store

import (
	"context"
	"testing"
	"time"

	"github.com/ifuryst/aifi/apps/cli/internal/market"
)

func TestFullBackfillPreservesSuccessBackoffSourcesAndLeases(t *testing.T) {
	db := openTest(t)
	ctx := context.Background()
	commitTest(t, db, fixtures(t, "1012202621:31", true))
	cfg, _ := db.ResearchConfig(ctx)
	cfg.FactsSource = "sec"
	cfg.FilingsSource = "sec"
	if _, err := db.SaveResearchConfig(ctx, cfg); err != nil {
		t.Fatal(err)
	}
	db.db.Exec("INSERT INTO research_aliases VALUES('MSFT','0000789019')")
	now := time.Now()
	future := now.Add(time.Hour)
	jobs := []market.Job{{Provider: "yahoo", Dataset: "profile", Subject: "AAPL"}, {Provider: "yahoo", Dataset: "profile", Subject: "MSFT"}, {Provider: "yahoo", Dataset: "prices", Subject: "CLASS.B"}, {Provider: "sec", Dataset: "facts", Subject: "cik:0000789019"}, {Provider: "yahoo", Dataset: "facts", Subject: "MSFT"}, {Provider: "fmp", Dataset: "news", Subject: "MSFT"}, {Provider: "yahoo", Dataset: "profile", Subject: "GONE"}}
	if err := db.AddResearchJobs(ctx, jobs, now.Add(-time.Minute)); err != nil {
		t.Fatal(err)
	}
	j, err := db.ClaimResearchJob(ctx, "yahoo", []string{"profile"}, false, now)
	if err != nil || j == nil || j.Subject != "AAPL" {
		t.Fatal(j, err)
	}
	result := market.Result{Payload: market.Payload{Profile: &market.Profile{Name: "Apple", Description: "Description"}}, Evidence: []market.Evidence{{URL: "https://finance.yahoo.com/quote/AAPL/profile/", Body: []byte(`{"ok":true}`), FetchedAt: now}}}
	if err = db.FinishResearchJob(ctx, *j, result, now, future); err != nil {
		t.Fatal(err)
	}
	db.db.Exec("UPDATE research_jobs SET state='failed',attempts=4,next_run=? WHERE provider='sec'", stamp(future))
	active, err := db.ClaimResearchJob(ctx, "yahoo", []string{"prices"}, false, now)
	if err != nil || active == nil {
		t.Fatal(active, err)
	}
	if _, err = db.RequestResearchBackfill(ctx); err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		p, d, subject string
		manual        int
	}{{"yahoo", "profile", "AAPL", 0}, {"yahoo", "profile", "MSFT", 1}, {"yahoo", "profile", "GONE", 0}, {"yahoo", "prices", "CLASS.B", 0}, {"yahoo", "facts", "MSFT", 0}, {"fmp", "news", "MSFT", 0}, {"sec", "facts", "cik:0000789019", 1}} {
		var m int
		if err = db.db.QueryRow("SELECT manual FROM research_jobs WHERE provider=? AND dataset=? AND subject=?", tc.p, tc.d, tc.subject).Scan(&m); err != nil || m != tc.manual {
			t.Fatal(tc, m, err)
		}
	}
	var next, lease string
	db.db.QueryRow("SELECT next_run FROM research_jobs WHERE provider='sec'").Scan(&next)
	if next != stamp(future) {
		t.Fatal("retry backoff reset", next)
	}
	db.db.QueryRow("SELECT lease FROM research_jobs WHERE id=?", active.ID).Scan(&lease)
	if lease != active.Lease {
		t.Fatal("active lease replaced")
	}
	bulk, err := db.ClaimSECBulkJob(ctx, "facts", "cik:0000789019", now)
	if err != nil || bulk == nil {
		t.Fatal("local alternative waited for network backoff", bulk, err)
	}
	if again, err := db.ClaimSECBulkJob(ctx, "facts", bulk.Subject, now); err != nil || again != nil {
		t.Fatal("double bulk claim", again, err)
	}
}
func TestNeverAttemptedCompaniesLeadRetryAndRefresh(t *testing.T) {
	db := openTest(t)
	ctx := context.Background()
	now := time.Now()
	db.AddResearchJobs(ctx, []market.Job{{Provider: "yahoo", Dataset: "profile", Subject: "AAPL"}, {Provider: "yahoo", Dataset: "profile", Subject: "ZZZ"}, {Provider: "yahoo", Dataset: "profile", Subject: "AAA"}}, now.Add(-time.Hour))
	db.db.Exec("UPDATE research_jobs SET last_success=?,state='idle' WHERE subject='AAPL'", stamp(now.Add(-24*time.Hour)))
	db.db.Exec("UPDATE research_jobs SET attempts=5,state='failed' WHERE subject='AAA'")
	j, err := db.ClaimResearchJob(ctx, "yahoo", []string{"profile"}, false, now)
	if err != nil || j == nil || j.Subject != "ZZZ" {
		t.Fatal("first pass starved", j, err)
	}
}
func TestBackfillAuditSeparatesEmptyRecordsAndMissing(t *testing.T) {
	db := openTest(t)
	ctx := context.Background()
	commitTest(t, db, fixtures(t, "1012202621:31", true))
	now := time.Now()
	db.AddResearchJobs(ctx, []market.Job{{Provider: "yahoo", Dataset: "earnings", Subject: "AAPL"}, {Provider: "yahoo", Dataset: "earnings", Subject: "MSFT"}, {Provider: "yahoo", Dataset: "earnings", Subject: "CLASS.B"}}, now)
	for _, records := range [][]market.Record{{{"type": "quarter", "epsActual": 1}}, nil} {
		j, err := db.ClaimResearchJob(ctx, "yahoo", []string{"earnings"}, false, now)
		if err != nil || j == nil {
			t.Fatal(j, err)
		}
		r := market.Result{Payload: market.Payload{Records: records}, Evidence: []market.Evidence{{URL: "https://finance.yahoo.com/quote/fixture/analysis/", Body: []byte(`{"source":"fixture"}`), FetchedAt: now}}}
		if err = db.FinishResearchJob(ctx, *j, r, now, now.Add(time.Hour)); err != nil {
			t.Fatal(err)
		}
	}
	p, err := db.ResearchBackfillProgress(ctx)
	if err != nil {
		t.Fatal(err)
	}
	for _, d := range p.Datasets {
		if d.Dataset == "earnings" {
			if d.Total != 3 || d.WithRecords != 1 || d.Empty != 1 || d.Missing["queued"] != 1 {
				t.Fatal(d)
			}
			return
		}
	}
	t.Fatal("earnings audit absent")
}

func TestFullBackfillSupportsSharedMarketPriceAndActionJobs(t *testing.T) {
	db := openTest(t)
	ctx := context.Background()
	commitTest(t, db, fixtures(t, "1012202621:31", true))
	now := time.Now()
	cfg, _ := db.ResearchConfig(ctx)
	cfg.PriceSource = "massive"
	if _, err := db.SaveResearchConfig(ctx, cfg); err != nil {
		t.Fatal(err)
	}
	db.AddResearchJobs(ctx, []market.Job{{Provider: "massive", Dataset: "prices", Subject: "2026-10-16"}, {Provider: "massive", Dataset: "actions", Subject: "us"}}, now)
	if _, err := db.RequestResearchBackfill(ctx); err != nil {
		t.Fatal(err)
	}
	j, err := db.ClaimResearchJob(ctx, "massive", []string{"prices"}, true, now)
	if err != nil || j == nil {
		t.Fatal("shared price work was not requested", j, err)
	}
	r := market.Result{Bars: []market.Bar{{Symbol: "AAPL", Date: "2026-10-16", Open: 100, High: 110, Low: 95, Close: 105, Volume: 1000}}, Evidence: []market.Evidence{{URL: "https://api.massive.com/fixture", Body: []byte(`{"fixture":true}`), FetchedAt: now}}}
	if err = db.FinishResearchJob(ctx, *j, r, now, now.Add(time.Hour)); err != nil {
		t.Fatal(err)
	}
	p, err := db.ResearchBackfillProgress(ctx)
	if err != nil {
		t.Fatal(err)
	}
	for _, d := range p.Datasets {
		if d.Dataset == "prices" {
			if d.WithRecords != 1 || d.Missing["pendingMarketDays"] != 2 || p.NewestStoredPriceDate != "2026-10-16" {
				t.Fatal(d, p)
			}
			return
		}
	}
	t.Fatal("market price audit absent")
}

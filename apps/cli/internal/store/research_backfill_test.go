package store

import (
	"context"
	"github.com/ifuryst/aifi/apps/cli/internal/market"
	"testing"
	"time"
)

func TestTargetedResearchRepairPreservesScopeAndBlocks(t *testing.T) {
	db := openTest(t)
	ctx := context.Background()
	commitTest(t, db, fixtures(t, "1012202621:31", true))
	cfg, _ := db.ResearchConfig(ctx)
	cfg.FilingsSource = "sec"
	cfg.Datasets["news"] = DatasetConfig{false, 24}
	if _, err := db.SaveResearchConfig(ctx, cfg); err != nil {
		t.Fatal(err)
	}
	db.db.Exec("INSERT INTO research_aliases VALUES('MSFT','0000789019')")
	now := time.Now().Add(-time.Hour)
	jobs := []market.Job{{Provider: "yahoo", Dataset: "prices", Subject: "AAPL"}, {Provider: "yahoo", Dataset: "prices", Subject: "MSFT"}, {Provider: "yahoo", Dataset: "profile", Subject: "MSFT"}, {Provider: "sec", Dataset: "filings", Subject: "cik:0000789019"}, {Provider: "yahoo", Dataset: "news", Subject: "MSFT"}}
	if err := db.AddResearchJobs(ctx, jobs, now); err != nil {
		t.Fatal(err)
	}
	db.db.Exec("UPDATE research_jobs SET state='blocked' WHERE dataset='profile'")
	if err := db.RequestSymbolResearchSync(ctx, []string{"msft"}); err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		subject, dataset string
		manual           int
	}{{"MSFT", "prices", 1}, {"cik:0000789019", "filings", 1}, {"MSFT", "profile", 0}, {"MSFT", "news", 0}, {"AAPL", "prices", 0}} {
		var manual int
		if err := db.db.QueryRow("SELECT manual FROM research_jobs WHERE subject=? AND dataset=?", tc.subject, tc.dataset).Scan(&manual); err != nil || manual != tc.manual {
			t.Fatal(tc, manual, err)
		}
	}
	j, err := db.ClaimResearchJob(ctx, "yahoo", []string{"prices"}, false, time.Now())
	if err != nil || j == nil || j.Subject != "MSFT" {
		t.Fatal("explicit repair did not lead seeds", j, err)
	}
	if err := db.RequestSymbolResearchSync(ctx, []string{"AAPL", "UNKNOWN"}); err == nil {
		t.Fatal("unknown symbol accepted")
	}
	var manual int
	db.db.QueryRow("SELECT manual FROM research_jobs WHERE subject='AAPL'").Scan(&manual)
	if manual != 0 {
		t.Fatal("invalid request partially queued")
	}
}
func TestIndexedCompanyLeadsAlphabeticalBacklog(t *testing.T) {
	db := openTest(t)
	ctx := context.Background()
	now := time.Now()
	// Current index membership, including shared SEC issuer subjects, determines
	// priority. No duplicate hardcoded list or network request is needed.
	db.db.Exec("INSERT INTO index_snapshots VALUES('idx','sp500','2026-10-17','2026-10-17','https://example.invalid','fixture','hash',1)")
	db.db.Exec("INSERT OR REPLACE INTO index_heads VALUES('sp500','idx')")
	db.db.Exec("INSERT INTO index_memberships VALUES('idx','ZZZ')")
	db.db.Exec("INSERT INTO research_aliases VALUES('ZZZ','0000000123')")
	for _, provider := range []string{"yahoo", "sec"} {
		subject := "ZZZ"
		if provider == "sec" {
			subject = "cik:0000000123"
		}
		if err := db.AddResearchJobs(ctx, []market.Job{{Provider: provider, Dataset: "profile", Subject: "AAA"}, {Provider: provider, Dataset: "profile", Subject: subject}}, now); err != nil {
			t.Fatal(err)
		}
		j, err := db.ClaimResearchJob(ctx, provider, []string{"profile"}, false, now)
		if err != nil || j == nil || j.Subject != subject {
			t.Fatal("index backlog priority", j, err)
		}
	}
}

package store

import (
	"context"
	"github.com/ifuryst/aifi/apps/cli/internal/market"
	"testing"
	"time"
)

func TestNasdaqFallbackRequiresEligiblePrimaryAndNeverDisplacesGoodData(t *testing.T) {
	db := openTest(t)
	ctx := context.Background()
	now := time.Now().UTC()
	jobs := []market.Job{{Provider: "yahoo", Dataset: "profile", Subject: "A"}, {Provider: "nasdaq", Dataset: "profile", Subject: "A"}}
	if err := db.AddResearchJobs(ctx, jobs, now); err != nil {
		t.Fatal(err)
	}
	claim := func(p string) *market.Job {
		t.Helper()
		j, e := db.ClaimResearchJob(ctx, p, []string{"profile"}, false, now)
		if e != nil {
			t.Fatal(e)
		}
		return j
	}
	if j := claim("nasdaq"); j != nil {
		t.Fatal("backup ran before primary")
	}
	primary := claim("yahoo")
	if err := db.FailResearchJob(ctx, *primary, "invalid_company_page", now.Add(time.Hour), false); err != nil {
		t.Fatal(err)
	}
	backup := claim("nasdaq")
	if backup == nil {
		t.Fatal("failed primary did not enable backup")
	}
	// Primary completes concurrently after the backup lease was claimed.
	if _, err := db.db.Exec("UPDATE research_jobs SET state='running',lease=?,lease_until=? WHERE id=?", primary.Lease, stamp(now.Add(time.Hour)), primary.ID); err != nil {
		t.Fatal(err)
	}
	result := market.Result{Payload: market.Payload{Profile: &market.Profile{Symbol: "A", Name: "Primary"}}, Evidence: []market.Evidence{{URL: "https://finance.yahoo.com/quote/A/profile/", Body: []byte("primary"), FetchedAt: now}}}
	if err := db.FinishResearchJob(ctx, *primary, result, now, now.Add(time.Hour)); err != nil {
		t.Fatal(err)
	}
	result.Payload.Profile.Name = "Backup"
	result.Evidence[0].URL = "https://api.nasdaq.com/api/company/A/company-profile"
	if err := db.FinishResearchJob(ctx, *backup, result, now, now.Add(time.Hour)); err != nil {
		t.Fatal(err)
	}
	p, err := db.ResearchPayload(ctx, "profile", "A")
	if err != nil || p.Profile.Name != "Primary" {
		t.Fatal(p, err)
	}
	cfg, err := db.ResearchConfig(ctx)
	if err != nil {
		t.Fatal(err)
	}
	cfg.ProfileSource = "massive"
	if cfg.AllowsProvider("nasdaq", "profile") {
		t.Fatal("backup ignored selected source")
	}
	cfg.ProfileSource = "yahoo"
	delete(cfg.Limits, "nasdaq")
	if cfg, err = db.SaveResearchConfig(ctx, cfg); err != nil || cfg.Limits["nasdaq"].PerMinute == 0 {
		t.Fatal("old six-budget settings rejected", err)
	}
}

func TestFundEvidenceSharedReferencesAndSourceSpecificStagingTTL(t *testing.T) {
	path := t.TempDir()
	ctx := context.Background()
	db, err := Open(ctx, path)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { db.Close() }()
	now := time.Now().UTC()
	ev := market.Evidence{URL: "https://13f.info/data/13f/000000000126000001", Body: []byte(`{"data":[]}`), FetchedAt: now}
	ref, err := db.ArchiveFundEvidence(ctx, ev)
	if err != nil || ref.Hash == "" || len(ref.Body) != 0 {
		t.Fatal(ref, err)
	}
	for _, symbol := range []string{"A", "B"} {
		if err = db.AddResearchJobs(ctx, []market.Job{{Provider: "thirteenf", Dataset: "funds", Subject: symbol}}, now); err != nil {
			t.Fatal(err)
		}
		job, e := db.ClaimResearchJob(ctx, "thirteenf", []string{"funds"}, false, now)
		if e != nil || job == nil {
			t.Fatal(job, e)
		}
		bad := ref
		bad.Hash = "0000000000000000000000000000000000000000000000000000000000000000"
		result := market.Result{Payload: market.Payload{Version: 2}, Evidence: []market.Evidence{bad}}
		if err = db.FinishResearchJob(ctx, *job, result, now, now.Add(time.Hour)); err == nil {
			t.Fatal("forged evidence reference accepted")
		}
		result.Evidence = []market.Evidence{ref}
		if err = db.FinishResearchJob(ctx, *job, result, now, now.Add(time.Hour)); err != nil {
			t.Fatal(err)
		}
	}
	var count int
	db.db.QueryRow("SELECT COUNT(*) FROM research_evidence").Scan(&count)
	if count != 1 {
		t.Fatal("shared report duplicated", count)
	}
	for _, tc := range []struct {
		key   string
		age   time.Duration
		found bool
	}{{"thirteenf-v1:week", 6 * 24 * time.Hour, true}, {"yahoo:week", 6 * 24 * time.Hour, false}, {"thirteenf-v1:expired", 31 * 24 * time.Hour, false}} {
		page := ev
		page.FetchedAt = now.Add(-tc.age)
		if err = db.SaveResearchStage(ctx, tc.key, page); err != nil {
			t.Fatal(err)
		}
		got, e := db.ResearchStage(ctx, tc.key)
		if e != nil || (got != nil) != tc.found {
			t.Fatal(tc, got, e)
		}
	}
	db.Close()
	db, err = Open(ctx, path)
	if err != nil {
		t.Fatal(err)
	}
	proof, err := db.ResearchEvidence(ctx, "funds", "B")
	if err != nil || len(proof) != 1 || string(proof[0].Body) != string(ev.Body) {
		t.Fatal("offline source lost", err)
	}
}

func TestNasdaqFallbackDoesNotWaitBehindUniverseSizedInitialBacklog(t *testing.T) {
	db := openTest(t)
	ctx := context.Background()
	now := time.Now().UTC()
	jobs := []market.Job{{Provider: "yahoo", Dataset: "analyst", Subject: "A"}, {Provider: "nasdaq", Dataset: "analyst", Subject: "A"}}
	if err := db.AddResearchJobs(ctx, jobs, now); err != nil {
		t.Fatal(err)
	}
	if j, e := db.ClaimResearchJob(ctx, "nasdaq", []string{"analyst"}, false, now.Add(9*time.Minute)); e != nil || j != nil {
		t.Fatal("backup skipped primary grace period", j, e)
	}
	if j, e := db.ClaimResearchJob(ctx, "nasdaq", []string{"analyst"}, false, now.Add(11*time.Minute)); e != nil || j == nil {
		t.Fatal("first attempt starved behind primary backlog", j, e)
	}
}

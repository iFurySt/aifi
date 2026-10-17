package store

import (
	"context"
	"github.com/ifuryst/aifi/apps/cli/internal/market"
	"testing"
	"time"
)

func TestActivityScopedSyncAndOfflineRead(t *testing.T) {
	ctx := context.Background()
	dir := t.TempDir()
	db, e := Open(ctx, dir)
	if e != nil {
		t.Fatal(e)
	}
	cfg, e := db.ResearchConfig(ctx)
	if e != nil {
		t.Fatal(e)
	}
	cfg.PoliticiansSource = "congress"
	cfg, e = db.SaveResearchConfig(ctx, cfg)
	if e != nil {
		t.Fatal(e)
	}
	now := time.Now().UTC()
	jobs := []market.Job{{Provider: "congress", Dataset: "politicians", Subject: "TEST"}, {Provider: "fmp", Dataset: "politicians", Subject: "TEST"}, {Provider: "yahoo", Dataset: "prices", Subject: "TEST"}}
	if e = db.AddResearchJobs(ctx, jobs, now); e != nil {
		t.Fatal(e)
	}
	if e = db.RequestActivitySync(ctx, "politicians"); e != nil {
		t.Fatal(e)
	}
	var n int
	if e = db.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM research_jobs WHERE manual=1").Scan(&n); e != nil || n != 1 {
		t.Fatal(n, e)
	}
	j, e := db.ClaimResearchJob(ctx, "congress", []string{"politicians"}, false, now.Add(time.Second))
	if e != nil || j == nil {
		t.Fatal(e, j)
	}
	rows := []market.Record{}
	for i := 0; i < 240; i++ {
		rows = append(rows, market.Record{"name": "Fixture", "transactionDate": "2026-10-01", "type": "buy", "amount": "$1,001 - $15,000"})
	}
	if e = db.FinishResearchJob(ctx, *j, market.Result{Payload: market.Payload{Version: 1, Records: rows}, Evidence: []market.Evidence{{URL: "https://congressinfor-production.up.railway.app/trades/TEST?limit=100&offset=0", Body: []byte(`{"fixture":true}`), FetchedAt: now}}}, now, now.Add(time.Hour)); e != nil {
		t.Fatal(e)
	}
	db.Close()
	db, e = Open(ctx, dir)
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close()
	v, e := db.ResearchRead(ctx, "TEST")
	if e != nil || v.Datasets["politicians"].Provider != "congress" || len(v.Datasets["politicians"].Data.Records) != 240 {
		t.Fatal(e, v)
	}
	status, e := db.ResearchStatus(ctx)
	if e != nil {
		t.Fatal(e)
	}
	for _, p := range status.Progress {
		if p.Dataset == "politicians" && p.Total != 1 {
			t.Fatal("inactive provider counted", p)
		}
	}
	if e = db.RequestActivitySync(ctx, "prices"); e == nil {
		t.Fatal("unscoped sync accepted")
	}
}

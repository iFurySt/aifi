package store

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"testing"
	"time"

	"github.com/ifuryst/aifi/apps/cli/internal/directory"
	"github.com/ifuryst/aifi/apps/cli/internal/market"
)

func TestResearchAtomicPersistenceRestartAndLease(t *testing.T) {
	ctx := context.Background()
	path := t.TempDir()
	db, e := Open(ctx, path)
	if e != nil {
		t.Fatal(e)
	}
	now := time.Now().UTC()
	job := market.Job{Provider: "massive", Dataset: "prices", Subject: "2026-10-14"}
	if e = db.AddResearchJobs(ctx, []market.Job{job, job}, now); e != nil {
		t.Fatal(e)
	}
	claimed, e := db.ClaimResearchJob(ctx, "massive", []string{"prices"}, false, now)
	if e != nil || claimed == nil {
		t.Fatal(e)
	}
	if second, _ := db.ClaimResearchJob(ctx, "massive", []string{"prices"}, false, now); second != nil {
		t.Fatal("double claim")
	}
	result := market.Result{Payload: market.Payload{Complete: true}, Evidence: []market.Evidence{{URL: "https://api.massive.com/test", Body: []byte(`{"test":"source"}`), FetchedAt: now}}, Bars: []market.Bar{{Symbol: "AAPL", Date: "2026-10-14", Open: 100, High: 110, Low: 95, Close: 105, Volume: 1000}}}
	invalid := result
	invalid.Bars = append(append([]market.Bar{}, result.Bars...), market.Bar{Symbol: "BAD", Date: "invalid"})
	if e = db.FinishResearchJob(ctx, *claimed, invalid, now, now.Add(time.Hour)); e == nil {
		t.Fatal("invalid batch committed")
	}
	nonfinite := result
	nonfinite.Bars = append([]market.Bar{}, result.Bars...)
	nonfinite.Bars[0].High = math.Inf(1)
	if e = db.FinishResearchJob(ctx, *claimed, nonfinite, now, now.Add(time.Hour)); e == nil {
		t.Fatal("nonfinite market price committed")
	}
	view, _ := db.ResearchRead(ctx, "AAPL")
	if len(view.Bars) != 0 {
		t.Fatal("partial atomic batch")
	}
	if e = db.FinishResearchJob(ctx, *claimed, result, now, now.Add(time.Hour)); e != nil {
		t.Fatal(e)
	}
	if e = db.FinishResearchJob(ctx, *claimed, result, now, now.Add(time.Hour)); e == nil {
		t.Fatal("stale lease committed")
	}
	db.Close()
	db, e = Open(ctx, path)
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close()
	view, e = db.ResearchRead(ctx, "AAPL")
	if e != nil || len(view.Bars) != 1 || view.Bars[0].Close != 105 || view.Coverage["prices"] != "stored" {
		t.Fatalf("offline reopen: %+v %v", view, e)
	}
	ev, e := db.ResearchEvidence(ctx, "prices", job.Subject)
	if e != nil || len(ev) != 1 || !strings.Contains(string(ev[0].Body), "source") {
		t.Fatal("raw evidence lost", e)
	}
	if e = db.RequestResearchSync(ctx); e != nil {
		t.Fatal(e)
	}
	reclaimed, e := db.ClaimResearchJob(ctx, "massive", []string{"prices"}, true, time.Now().Add(time.Second))
	if e != nil || reclaimed == nil {
		t.Fatal("manual request did not persist", e)
	}
	expired, e := db.ClaimResearchJob(ctx, "massive", []string{"prices"}, true, time.Now().Add(16*time.Minute))
	if e != nil || expired == nil || expired.Lease == reclaimed.Lease {
		t.Fatal("expired lease not recovered", e)
	}
	if e = db.FinishResearchJob(ctx, *reclaimed, result, time.Now().Add(17*time.Minute), now.Add(time.Hour)); e == nil {
		t.Fatal("old worker overwrote new lease")
	}
}
func TestResearchGlobalBudgetAndSettings(t *testing.T) {
	db := openTest(t)
	ctx := context.Background()
	now := time.Date(2026, 10, 15, 12, 0, 0, 0, time.UTC)
	limit := ProviderLimit{5, 2}
	for i := 0; i < 2; i++ {
		wait, blocked, e := db.ReserveProvider(ctx, "massive", limit, now.Add(time.Duration(i)*12*time.Second))
		if e != nil || blocked != "" || wait != 0 {
			t.Fatal(wait, blocked, e)
		}
	}
	wait, _, e := db.ReserveProvider(ctx, "massive", limit, now.Add(time.Minute))
	if e != nil || wait < 11*time.Hour {
		t.Fatal("daily cap ignored", wait, e)
	}
	if e = db.CooldownProvider(ctx, "sec", "access_denied", now); e != nil {
		t.Fatal(e)
	}
	_, blocked, _ := db.ReserveProvider(ctx, "sec", ProviderLimit{240, 10000}, now)
	if blocked != "access_denied" {
		t.Fatal("blocked provider made a request")
	}
	db.ResetResearchProvider(ctx, "sec")
	_, blocked, _ = db.ReserveProvider(ctx, "sec", ProviderLimit{240, 10000}, now)
	if blocked != "" {
		t.Fatal("credentials/config cannot unblock")
	}
	cfg, e := db.ResearchConfig(ctx)
	if e != nil || cfg.Limits["massive"].PerMinute != 5 || cfg.HistoryDays != 730 {
		t.Fatal(cfg, e)
	}
	old := cfg
	cfg.HistoryDays = 365
	next, e := db.SaveResearchConfig(ctx, cfg)
	if e != nil || next.Revision != 1 {
		t.Fatal(e)
	}
	if _, e = db.SaveResearchConfig(ctx, old); e == nil {
		t.Fatal("stale settings overwrote newer")
	}
	cfg = next
	cfg.Datasets["shell"] = DatasetConfig{true, 1}
	if _, e = db.SaveResearchConfig(ctx, cfg); e == nil {
		t.Fatal("unknown dataset accepted")
	}
}
func TestResearchSharedIssuerAndReadBounds(t *testing.T) {
	db := openTest(t)
	ctx := context.Background()
	now := time.Now()
	jobs := []market.Job{{Provider: "sec", Dataset: "identity", Subject: "us"}, {Provider: "sec", Dataset: "facts", Subject: "cik:0000320193"}}
	db.AddResearchJobs(ctx, jobs, now)
	j, _ := db.ClaimResearchJob(ctx, "sec", []string{"identity"}, false, now)
	result := market.Result{Aliases: map[string]string{"AAPL": "0000320193", "AAPL.B": "0000320193"}, Payload: market.Payload{Complete: true}, Evidence: []market.Evidence{{URL: "https://www.sec.gov/test", Body: []byte("test"), FetchedAt: now}}}
	if e := db.FinishResearchJob(ctx, *j, result, now, now.Add(time.Hour)); e != nil {
		t.Fatal(e)
	}
	j, _ = db.ClaimResearchJob(ctx, "sec", []string{"facts"}, false, now)
	result.Aliases = nil
	result.Payload.Facts = []market.Fact{{Metric: "revenue", Value: "12345678901234567890", Unit: "USD", End: "2026-09-30"}}
	if e := db.FinishResearchJob(ctx, *j, result, now, now.Add(time.Hour)); e != nil {
		t.Fatal(e)
	}
	view, e := db.ResearchRead(ctx, "AAPL.B")
	if e != nil || view.Datasets["facts"].Data.Facts[0].Value != "12345678901234567890" {
		t.Fatal("issuer mapping/decimal lost", e)
	}
	b, _ := json.Marshal(view)
	if strings.Contains(string(b), "content_gzip") || strings.Contains(string(b), "ciphertext") {
		t.Fatal("private blobs escaped")
	}
}

func TestOldUnconfiguredBackfillCannotBlockCurrentPrices(t *testing.T) {
	db := openTest(t)
	ctx := context.Background()
	now := time.Now()
	db.AddResearchJobs(ctx, []market.Job{{Provider: "massive", Dataset: "prices", Subject: "2020-01-02"}, {Provider: "massive", Dataset: "prices", Subject: "2026-10-14"}}, now)
	if e := db.BoundPriceJobs(ctx, "2024-10-15", now); e != nil {
		t.Fatal(e)
	}
	j, e := db.ClaimResearchJob(ctx, "massive", []string{"prices"}, false, now)
	if e != nil || j == nil || j.Subject != "2026-10-14" {
		t.Fatal("expired unconfigured history was claimed", e)
	}
	if second, _ := db.ClaimResearchJob(ctx, "massive", []string{"prices"}, false, now); second != nil {
		t.Fatal("retired history fetched")
	}
}

func TestSharedActionSnapshotIsQueriedBySymbolAndPublishesEmptyCoverage(t *testing.T) {
	db := openTest(t)
	ctx := context.Background()
	now := time.Now()
	db.AddResearchJobs(ctx, []market.Job{{Provider: "massive", Dataset: "actions", Subject: "us"}, {Provider: "massive", Dataset: "actions", Subject: "OLD"}}, now)
	db.UseSharedActions(ctx)
	j, e := db.ClaimResearchJob(ctx, "massive", []string{"actions"}, false, now)
	if e != nil || j == nil || j.Subject != "us" {
		t.Fatal(e)
	}
	r := market.Result{Payload: market.Payload{Complete: true, Records: []market.Record{{"ticker": "AAPL", "kind": "splits", "execution_date": "2026-01-01", "split_from": 1, "split_to": 2}, {"ticker": "MSFT", "kind": "dividends", "cash_amount": 1}}}, Evidence: []market.Evidence{{URL: "https://api.massive.com/stocks/v1/splits", Body: []byte(`{"source":"all market"}`), FetchedAt: now}}}
	if e = db.FinishResearchJob(ctx, *j, r, now, now.Add(time.Hour)); e != nil {
		t.Fatal(e)
	}
	for symbol, count := range map[string]int{"AAPL": 1, "MSFT": 1, "OTHER": 0} {
		data, e := db.ResearchRead(ctx, symbol)
		if e != nil || len(data.Datasets["actions"].Data.Records) != count || !data.Datasets["actions"].Data.Complete {
			t.Fatal("shared action lookup", symbol, e)
		}
	}
	if next, _ := db.ClaimResearchJob(ctx, "massive", []string{"actions"}, false, now); next != nil {
		t.Fatal("per-listing actions still scheduled")
	}
}

func TestLargeQueueReconciliationAllowsAnotherHostToOpen(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	path := t.TempDir()
	db, e := Open(ctx, path)
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close()
	jobs := make([]market.Job, 12000)
	for i := range jobs {
		jobs[i] = market.Job{Provider: "massive", Dataset: "profile", Subject: fmt.Sprintf("S%05d", i)}
	}
	for start := 0; start < len(jobs); start += 500 {
		if e = db.AddResearchJobs(ctx, jobs[start:min(start+500, len(jobs))], time.Now()); e != nil {
			t.Fatal(e)
		}
	}
	done := make(chan error, 1)
	go func() {
		for start := 0; start < len(jobs); start += 500 {
			if e := db.AddResearchJobs(ctx, jobs[start:min(start+500, len(jobs))], time.Now()); e != nil {
				done <- e
				return
			}
		}
		done <- nil
	}()
	other, e := Open(ctx, path)
	if e != nil {
		t.Fatal("second app host could not open during a directory-size queue reconciliation", e)
	}
	other.Close()
	if e = <-done; e != nil {
		t.Fatal(e)
	}
	var plan string
	rows, e := db.db.QueryContext(ctx, "EXPLAIN QUERY PLAN SELECT EXISTS(SELECT 1 FROM research_jobs WHERE manual=1)")
	if e != nil {
		t.Fatal(e)
	}
	for rows.Next() {
		var a, b, c int
		var detail string
		if e = rows.Scan(&a, &b, &c, &detail); e != nil {
			t.Fatal(e)
		}
		plan += detail
	}
	rows.Close()
	if !strings.Contains(plan, "research_manual_pending") {
		t.Fatal("manual pending lookup scans the entire universe", plan)
	}
}

func TestPausedFutureListingsDoNotInheritAnOldManualRequest(t *testing.T) {
	db := openTest(t)
	ctx := context.Background()
	now := time.Now()
	db.AddResearchJobs(ctx, []market.Job{{Provider: "massive", Dataset: "profile", Subject: "OLD"}}, now)
	db.RequestResearchSync(ctx)
	db.db.Exec("INSERT INTO research_aliases VALUES('OLD','0000000001'),('NEW','0000000002')")
	issuers, e := db.ManualIssuers(ctx)
	if e != nil || !issuers["0000000001"] || issuers["0000000002"] {
		t.Fatal("manual scope included a later new company", issuers, e)
	}
	db.AddResearchJobs(ctx, []market.Job{{Provider: "massive", Dataset: "profile", Subject: "NEW"}, {Provider: "sec", Dataset: "facts", Subject: "cik:0000000001", Manual: issuers["0000000001"]}, {Provider: "sec", Dataset: "facts", Subject: "cik:0000000002", Manual: issuers["0000000002"]}}, now)
	j, e := db.ClaimResearchJob(ctx, "sec", []string{"facts"}, true, now)
	if e != nil || j == nil || j.Subject != "cik:0000000001" {
		t.Fatal("original manual issuer did not expand", e)
	}
	if later, _ := db.ClaimResearchJob(ctx, "sec", []string{"facts"}, true, now); later != nil {
		t.Fatal("automation pause ignored for a new listing")
	}
}

func TestCoverageAggregatesSymbolsBeforeJoiningDirectory(t *testing.T) {
	db := openTest(t)
	files := fixtures(t, "1014202621:31", true)
	// 1,000 candidates plus many price sessions reproduces the former O(bars ×
	// listings) status join, which blocked local reads as ingestion progressed.
	text := "Symbol|Security Name|Market Category|Test Issue|Financial Status|Round Lot Size|ETF|NextShares\n"
	for i := 0; i < 1000; i++ {
		text += fmt.Sprintf("Q%04d|Scale common stock|Q|N|N|100|N|N\n", i)
	}
	text += "File Creation Time: 1014202621:31|||||||\n"
	large, err := directory.Parse("nasdaqlisted", []byte(text))
	if err != nil {
		t.Fatal(err)
	}
	large.URL = files[0].URL
	large.FetchedAt = files[0].FetchedAt
	files[0] = large
	commitTest(t, db, files)
	ctx := context.Background()
	_, err = db.db.ExecContext(ctx, `INSERT INTO research_snapshots VALUES('scale','yahoo','prices','Q0000','2026-10-15','{"complete":true}')`)
	if err != nil {
		t.Fatal(err)
	}
	_, err = db.db.ExecContext(ctx, `WITH RECURSIVE n(x) AS (VALUES(0) UNION ALL SELECT x+1 FROM n WHERE x<19999) INSERT INTO daily_bars SELECT 'yahoo',printf('Q%04d',x % 100),date('2025-01-01','+' || (x / 100) || ' days'),'split-adjusted',100,110,90,105,1000,'scale' FROM n`)
	if err != nil {
		t.Fatal(err)
	}
	timed, stop := context.WithTimeout(ctx, 3*time.Second)
	defer stop()
	status, err := db.ResearchStatus(timed)
	if err != nil || status.Priced != 100 {
		t.Fatal("coverage must count securities once without scanning each session against each listing", status.Priced, err)
	}
}

func TestPriceSourceSelectionDoesNotMixBasisAndRetainsLastGood(t *testing.T) {
	db := openTest(t)
	ctx := context.Background()
	now := time.Now()
	for _, provider := range []string{"yahoo", "massive"} {
		subject := "OTHER.B"
		basis := "split-adjusted"
		price := 100.0
		if provider == "massive" {
			subject = "2026-10-14"
			basis = "raw"
			price = 200
		}
		db.AddResearchJobs(ctx, []market.Job{{Provider: provider, Dataset: "prices", Subject: subject}}, now)
		j, err := db.ClaimResearchJob(ctx, provider, []string{"prices"}, false, now)
		if err != nil || j == nil {
			t.Fatal(err)
		}
		result := market.Result{Evidence: []market.Evidence{{URL: "https://example.invalid/" + provider, Body: []byte(`{"source":"fixture"}`), FetchedAt: now}}, Basis: basis, Payload: market.Payload{Complete: true}, Bars: []market.Bar{{Symbol: "OTHER.B", Date: "2026-10-14", Open: price, High: price + 1, Low: price - 1, Close: price, Volume: 1000}}}
		if err = db.FinishResearchJob(ctx, *j, result, now, now.Add(time.Hour)); err != nil {
			t.Fatal(err)
		}
	}
	v, err := db.ResearchRead(ctx, "OTHER.B")
	if err != nil || len(v.Bars) != 1 || v.Bars[0].Close != 100 || v.Basis != "split-adjusted" {
		t.Fatal(v, err)
	}
	cfg, _ := db.ResearchConfig(ctx)
	cfg.PriceSource = "massive"
	if _, err = db.SaveResearchConfig(ctx, cfg); err != nil {
		t.Fatal(err)
	}
	v, err = db.ResearchRead(ctx, "OTHER.B")
	if err != nil || len(v.Bars) != 1 || v.Bars[0].Close != 200 || v.Basis != "raw" {
		t.Fatal("source series mixed", v, err)
	}
	// Invalid Yahoo restatement must roll back its deletion and head update.
	j, err := db.ClaimResearchJob(ctx, "yahoo", []string{"prices"}, false, now.Add(25*time.Hour))
	if err != nil || j == nil {
		t.Fatal(err)
	}
	if err = db.FinishResearchJob(ctx, *j, market.Result{Evidence: []market.Evidence{{URL: "https://example.invalid/yahoo", Body: []byte(`{"source":"invalid replacement"}`), FetchedAt: now}}, Basis: "split-adjusted", Payload: market.Payload{Complete: true}, Bars: []market.Bar{{Symbol: "OTHER.B", Date: "invalid"}}}, now.Add(25*time.Hour), now.Add(26*time.Hour)); err == nil {
		t.Fatal("invalid replacement accepted")
	}
	cfg, _ = db.ResearchConfig(ctx)
	cfg.PriceSource = "yahoo"
	db.SaveResearchConfig(ctx, cfg)
	v, err = db.ResearchRead(ctx, "OTHER.B")
	if err != nil || len(v.Bars) != 1 || v.Bars[0].Close != 100 {
		t.Fatal("last-good Yahoo snapshot lost", v, err)
	}
}

func TestCompanyFactsChooseConfiguredSourceWithoutMergingPeriods(t *testing.T) {
	db := openTest(t)
	ctx := context.Background()
	now := time.Now()
	commit := func(j market.Job, r market.Result) {
		t.Helper()
		if err := db.AddResearchJobs(ctx, []market.Job{j}, now); err != nil {
			t.Fatal(err)
		}
		claimed, err := db.ClaimResearchJob(ctx, j.Provider, []string{j.Dataset}, false, now)
		if err != nil || claimed == nil {
			t.Fatal(err)
		}
		r.Evidence = []market.Evidence{{URL: "https://example.invalid/" + j.Provider + "/" + j.Dataset, Body: []byte(market.Marshal(r.Payload)), FetchedAt: now}}
		if err = db.FinishResearchJob(ctx, *claimed, r, now, now.Add(time.Hour)); err != nil {
			t.Fatal(err)
		}
	}
	commit(market.Job{Provider: "sec", Dataset: "identity", Subject: "us"}, market.Result{Aliases: map[string]string{"OTHER.B": "0000000123"}, Payload: market.Payload{Complete: true}})
	commit(market.Job{Provider: "sec", Dataset: "facts", Subject: "cik:0000000123"}, market.Result{Payload: market.Payload{Facts: []market.Fact{{Metric: "revenue", Value: "100", Unit: "USD", End: "2025-09-27", Start: "2024-09-29", Filed: "2025-10-30", Form: "10-K"}}, Complete: false}})
	commit(market.Job{Provider: "yahoo", Dataset: "facts", Subject: "OTHER.B"}, market.Result{Payload: market.Payload{Facts: []market.Fact{{Period: "annual", Metric: "revenue", Value: "101", Unit: "USD", End: "2025-09-30"}}, Complete: false}})
	cfg, _ := db.ResearchConfig(ctx)
	for _, source := range []string{"sec", "yahoo"} {
		cfg.FactsSource = source
		var err error
		cfg, err = db.SaveResearchConfig(ctx, cfg)
		if err != nil {
			t.Fatal(err)
		}
		data, err := db.ResearchRead(ctx, "OTHER.B")
		if err != nil || data.Datasets["facts"].Provider != source || len(data.Datasets["facts"].Data.Facts) != 1 {
			t.Fatal("source periods mixed", market.Marshal(data), err)
		}
	}
}

func TestCompletedYahooSessionWakesIdleJobsWithoutOverridingBackoff(t *testing.T) {
	ctx := context.Background()
	db := openTest(t)
	end := time.Date(2026, 10, 16, 20, 0, 0, 0, time.UTC)
	for _, symbol := range []string{"OLD", "INTRA", "SETTLED", "FAILED"} {
		at := end.Add(-time.Hour)
		window := "Yahoo completed sessions v2"
		if symbol == "OLD" {
			window = "Yahoo completed sessions"
		}
		if symbol == "SETTLED" {
			at = end.Add(11 * time.Minute)
		}
		job := market.Job{Provider: "yahoo", Dataset: "prices", Subject: symbol}
		if err := db.AddResearchJobs(ctx, []market.Job{job}, at); err != nil {
			t.Fatal(err)
		}
		claimed, err := db.ClaimResearchJob(ctx, "yahoo", []string{"prices"}, false, at)
		if err != nil || claimed == nil {
			t.Fatal(err)
		}
		result := market.Result{Evidence: []market.Evidence{{URL: "https://query1.finance.yahoo.com/v8/finance/chart/" + symbol, Body: []byte(`{"fixture":true}`), FetchedAt: at}}, Payload: market.Payload{Window: window, Quote: &market.MarketQuote{Price: 100, AsOf: at.Format(time.RFC3339), SessionEnd: end.Unix()}}}
		if err = db.FinishResearchJob(ctx, *claimed, result, at, end.Add(24*time.Hour)); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := db.db.ExecContext(ctx, `UPDATE research_jobs SET state='failed' WHERE subject='FAILED'`); err != nil {
		t.Fatal(err)
	}
	now := end.Add(15 * time.Minute)
	if err := db.WakeCompletedYahooPrices(ctx, now); err != nil {
		t.Fatal(err)
	}
	for _, symbol := range []string{"OLD", "INTRA", "SETTLED", "FAILED"} {
		var next string
		if err := db.db.QueryRowContext(ctx, `SELECT next_run FROM research_jobs WHERE subject=?`, symbol).Scan(&next); err != nil {
			t.Fatal(err)
		}
		shouldWake := symbol == "OLD" || symbol == "INTRA"
		if (next == stamp(now)) != shouldWake {
			t.Fatalf("%s next=%s wake=%v", symbol, next, shouldWake)
		}
	}
}

func TestYahooValuationUpgradePreservesFailedBackoffAndStopsAfterVersionedCommit(t *testing.T) {
	ctx := context.Background()
	db := openTest(t)
	now := time.Now().UTC()
	future := now.Add(7 * 24 * time.Hour)
	for _, symbol := range []string{"OLD", "CURRENT", "BACKOFF"} {
		job := market.Job{Provider: "yahoo", Dataset: "profile", Subject: symbol}
		if err := db.AddResearchJobs(ctx, []market.Job{job}, now); err != nil {
			t.Fatal(err)
		}
		j, err := db.ClaimResearchJob(ctx, "yahoo", []string{"profile"}, false, now)
		if err != nil || j == nil {
			t.Fatal(err)
		}
		version := 0
		if symbol == "CURRENT" {
			version = 1
		}
		cap := 5000000000000.0
		result := market.Result{Payload: market.Payload{Version: version, Quote: &market.MarketQuote{Price: 100, AsOf: now.Format(time.RFC3339), MarketCap: &cap}}, Evidence: []market.Evidence{{URL: "https://finance.yahoo.com/quote/" + symbol + "/profile/", Body: []byte(`{"fixture":true}`), FetchedAt: now}}}
		if err = db.FinishResearchJob(ctx, *j, result, now, future); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := db.db.ExecContext(ctx, `UPDATE research_jobs SET state='failed' WHERE subject='BACKOFF'`); err != nil {
		t.Fatal(err)
	}
	if err := db.WakeYahooQuoteMetadata(ctx, now.Add(time.Minute)); err != nil {
		t.Fatal(err)
	}
	for _, symbol := range []string{"OLD", "CURRENT", "BACKOFF"} {
		var next string
		if err := db.db.QueryRowContext(ctx, `SELECT next_run FROM research_jobs WHERE subject=?`, symbol).Scan(&next); err != nil {
			t.Fatal(err)
		}
		if (next == stamp(future)) != (symbol != "OLD") {
			t.Fatal(symbol, next)
		}
	}
	view, err := db.ResearchRead(ctx, "CURRENT")
	if err != nil || view.Datasets["profile"].Data.Quote == nil || view.Datasets["profile"].Data.Quote.MarketCap == nil || *view.Datasets["profile"].Data.Quote.MarketCap != 5000000000000 {
		t.Fatal("valuation lost in local snapshot", err)
	}
}

func TestFinancialFactsUpgradeKeepsLastGoodBackoffAndStopsAfterCommit(t *testing.T) {
	ctx := context.Background()
	db := openTest(t)
	now := time.Now().UTC()
	future := now.Add(24 * time.Hour)
	for _, provider := range []string{"sec", "yahoo"} {
		for _, state := range []string{"OLD", "CURRENT", "BACKOFF"} {
			subject := provider + state
			if err := db.AddResearchJobs(ctx, []market.Job{{Provider: provider, Dataset: "facts", Subject: subject}}, now); err != nil {
				t.Fatal(err)
			}
			job, err := db.ClaimResearchJob(ctx, provider, []string{"facts"}, false, now)
			if err != nil || job == nil {
				t.Fatal(err)
			}
			version := 0
			if state == "CURRENT" {
				version = market.FinancialFactsVersion
			}
			payload := market.Payload{Version: version, Facts: []market.Fact{{Metric: "researchAndDevelopment", Unit: "USD", Value: "12.25", End: "2026-06-30"}}}
			if err = db.FinishResearchJob(ctx, *job, market.Result{Payload: payload, Evidence: []market.Evidence{{URL: "https://source.example.invalid/facts.json", Body: []byte(`{"fixture":true}`), FetchedAt: now}}}, now, future); err != nil {
				t.Fatal(err)
			}
		}
	}
	if _, err := db.db.ExecContext(ctx, `UPDATE research_jobs SET state='failed' WHERE subject LIKE '%BACKOFF'`); err != nil {
		t.Fatal(err)
	}
	wake := now.Add(time.Minute)
	if err := db.WakeFinancialFacts(ctx, wake); err != nil {
		t.Fatal(err)
	}
	for _, provider := range []string{"sec", "yahoo"} {
		for _, state := range []string{"OLD", "CURRENT", "BACKOFF"} {
			subject := provider + state
			var next string
			if err := db.db.QueryRowContext(ctx, `SELECT next_run FROM research_jobs WHERE subject=?`, subject).Scan(&next); err != nil {
				t.Fatal(err)
			}
			if (next == stamp(wake)) != (state == "OLD") {
				t.Fatal(subject, next)
			}
			payload, err := db.ResearchPayload(ctx, "facts", subject)
			if err != nil || len(payload.Facts) != 1 || payload.Facts[0].Value != "12.25" {
				t.Fatal("upgrade erased stored data", subject, err)
			}
		}
		job, err := db.ClaimResearchJob(ctx, provider, []string{"facts"}, false, wake)
		if err != nil || job == nil {
			t.Fatal(err)
		}
		if err = db.FinishResearchJob(ctx, *job, market.Result{Payload: market.Payload{Version: market.FinancialFactsVersion, Facts: []market.Fact{{Metric: "researchAndDevelopment", Value: "13.5", Unit: "USD", End: "2026-06-30"}}}, Evidence: []market.Evidence{{URL: "https://source.example.invalid/facts.json", Body: []byte(`{"fixture":true}`), FetchedAt: wake}}}, wake, future); err != nil {
			t.Fatal(err)
		}
	}
	if err := db.WakeFinancialFacts(ctx, wake.Add(time.Minute)); err != nil {
		t.Fatal(err)
	}
	var next string
	if err := db.db.QueryRowContext(ctx, `SELECT next_run FROM research_jobs WHERE subject='secOLD'`).Scan(&next); err != nil || next != stamp(future) {
		t.Fatal("current snapshot woke again", next, err)
	}
}

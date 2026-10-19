package research

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/ifuryst/aifi/apps/cli/internal/directory"
	"github.com/ifuryst/aifi/apps/cli/internal/market"
	"github.com/ifuryst/aifi/apps/cli/internal/store"
)

func TestUniverseJobsAndReconcileAfterMapping(t *testing.T) {
	ctx := context.Background()
	path := t.TempDir()
	db, e := store.Open(ctx, path)
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close()
	first, _ := directory.Parse("nasdaqlisted", []byte("Symbol|Security Name|Market Category|Test Issue|Financial Status|Round Lot Size|ETF|NextShares\nAAPL|Apple|Q|N|N|100|N|N\nUNKNOWN|Unknown issuer|Q|N|N|100|N|N\nFile Creation Time: 1014202621:31|||||||\n"))
	second, _ := directory.Parse("otherlisted", []byte("ACT Symbol|Security Name|Exchange|CQS Symbol|ETF|Round Lot Size|Test Issue|NASDAQ Symbol\nCLASS.B|Class B|N|CLASS.B|N|100|N|CLASS/B\nFile Creation Time: 1014202621:31||||||\n"))
	first.URL = "https://www.nasdaqtrader.com/first"
	second.URL = "https://www.nasdaqtrader.com/second"
	first.FetchedAt = time.Now()
	second.FetchedAt = time.Now()
	run, e := db.Start(ctx, time.Now())
	if e != nil {
		t.Fatal(e)
	}
	if _, e = db.Commit(ctx, run, []directory.File{first, second}, time.Now()); e != nil {
		t.Fatal(e)
	}
	cfg, _ := db.ResearchConfig(ctx)
	cfg.FactsSource = "sec"
	if _, e = db.SaveResearchConfig(ctx, cfg); e != nil {
		t.Fatal(e)
	}
	engine := New(db, path, false)
	if e = engine.Reconcile(ctx, true); e != nil {
		t.Fatal(e)
	}
	status, e := db.ResearchStatus(ctx)
	if e != nil || status.Universe != 3 {
		t.Fatal(status, e)
	}
	for _, d := range []string{"profile", "actions", "funds", "politicians", "analyst", "news"} {
		found := false
		for _, p := range status.Progress {
			if p.Dataset == d {
				found = true
				if p.Total != map[string]int{"actions": 1, "profile": 3, "funds": 3, "politicians": 3, "analyst": 3, "news": 6}[d] {
					t.Fatalf("%s not all-directory: %+v", d, p)
				}
			}
		}
		if !found {
			t.Fatal("missing jobs", d)
		}
	}
	j, e := db.ClaimResearchJob(ctx, "sec", []string{"identity"}, false, time.Now())
	if e != nil || j == nil {
		t.Fatal(e)
	}
	r := market.Result{Aliases: map[string]string{"AAPL": "0000320193"}, Payload: market.Payload{Complete: true}, Evidence: []market.Evidence{{URL: "https://www.sec.gov/map", Body: []byte(`{"original":true}`), FetchedAt: time.Now()}}}
	if e = db.FinishResearchJob(ctx, *j, r, time.Now(), time.Now().Add(time.Hour)); e != nil {
		t.Fatal(e)
	}
	if e = engine.Reconcile(ctx, false); e != nil {
		t.Fatal(e)
	}
	status, _ = db.ResearchStatus(ctx)
	for _, p := range status.Progress {
		if p.Dataset == "facts" && p.Total != 1 {
			t.Fatal("issuer jobs not mapped", p)
		}
	}
	if e = engine.Reconcile(ctx, true); e != nil {
		t.Fatal(e)
	}
	again, _ := db.ResearchStatus(ctx)
	if len(status.Progress) != len(again.Progress) {
		t.Fatal("duplicate jobs")
	}
	// Missing keys never start provider requests or consume thousands of jobs.
	engine.Client.Key = func(context.Context, string) (map[string]string, error) { return map[string]string{}, nil }
	worked, e := engine.Step(ctx, "massive")
	if e != nil || worked {
		t.Fatal("unconfigured provider ran")
	}
}
func TestVaultNodeCompatibleGCMAndTamper(t *testing.T) {
	ctx := context.Background()
	path := t.TempDir()
	db, e := store.Open(ctx, path)
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close()
	key := make([]byte, 32)
	nonce := make([]byte, 12)
	os.WriteFile(filepath.Join(path, "aifi-vault.key"), key, 0600)
	block, _ := aes.NewCipher(key)
	gcm, _ := cipher.NewGCM(block)
	sealed := gcm.Seal(nil, nonce, []byte("private"), nil)
	raw := append(append(append([]byte{}, nonce...), sealed[len(sealed)-16:]...), sealed[:len(sealed)-16]...)
	db.PutCredentials(ctx, "massive", map[string]string{"apiKey": "v1:" + base64.StdEncoding.EncodeToString(raw)})
	engine := New(db, path, false)
	keys, e := engine.Client.Key(ctx, "massive")
	if e != nil || keys["apiKey"] != "private" {
		t.Fatal("Node GCM format mismatch", e)
	}
	raw[len(raw)-1] ^= 1
	db.PutCredentials(ctx, "massive", map[string]string{"apiKey": "v1:" + base64.StdEncoding.EncodeToString(raw)})
	if _, e = engine.Client.Key(ctx, "massive"); e == nil {
		t.Fatal("tampered key decrypted")
	}
}

func TestDatasetPauseAndAuthBlockDoNotDrainUniverse(t *testing.T) {
	ctx := context.Background()
	path := t.TempDir()
	db, err := store.Open(ctx, path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	engine := New(db, path, false)
	engine.Client.Key = func(context.Context, string) (map[string]string, error) {
		return map[string]string{"apiKey": "synthetic"}, nil
	}
	cfg, _ := db.ResearchConfig(ctx)
	cfg.Datasets["profile"] = store.DatasetConfig{Enabled: false, IntervalHours: 24}
	if _, err = db.SaveResearchConfig(ctx, cfg); err != nil {
		t.Fatal(err)
	}
	if err = engine.Client.Gate(market.WithJob(ctx, market.Job{Dataset: "profile"}), "massive"); err == nil || err.Error() != "paused" {
		t.Fatal("disabled dataset issued a request", err)
	}
	db.AddResearchJobs(ctx, []market.Job{{Provider: "massive", Dataset: "prices", Subject: "2026-10-14"}}, time.Now())
	db.CooldownProvider(ctx, "massive", "invalid_key", time.Now())
	worked, err := engine.Step(ctx, "massive")
	if err != nil || worked {
		t.Fatal("blocked account drained queued jobs", err)
	}
}

type fixtureHTTP func(*http.Request) (*http.Response, error)

func (f fixtureHTTP) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func TestCollectionToOfflineResearchReadForNonDemoSymbol(t *testing.T) {
	ctx := context.Background()
	path := t.TempDir()
	db, err := store.Open(ctx, path)
	if err != nil {
		t.Fatal(err)
	}
	cfg, _ := db.ResearchConfig(ctx)
	cfg.PriceSource = "massive"
	cfg.ProfileSource = "massive"
	cfg.FactsSource = "sec"
	cfg.FilingsSource = "sec"
	if _, err = db.SaveResearchConfig(ctx, cfg); err != nil {
		t.Fatal(err)
	}
	engine := New(db, path, false)
	engine.Client.Gate = nil
	engine.Client.Key = func(context.Context, string) (map[string]string, error) {
		return map[string]string{"apiKey": "test-only-private-key"}, nil
	}
	engine.Client.SECContact = func(context.Context) (string, error) { return "AIFi fixture test@example.invalid", nil }
	requests := 0
	engine.Client.HTTP = &http.Client{Transport: fixtureHTTP(func(r *http.Request) (*http.Response, error) {
		requests++
		raw := ""
		switch {
		case strings.Contains(r.URL.Path, "/aggs/grouped/"):
			date := r.URL.Path[strings.LastIndex(r.URL.Path, "/")+1:]
			at, _ := time.Parse("2006-01-02", date)
			raw = fmt.Sprintf(`{"status":"OK","adjusted":false,"results":[{"T":"OTHER.B","t":%d,"o":100,"h":110,"l":90,"c":105,"v":1234}]}`, at.UnixMilli())
		case strings.Contains(r.URL.Path, "/reference/tickers/"):
			raw = `{"results":{"ticker":"OTHER.B","name":"Other Company Class B","type":"CS","currency_name":"usd","description":"Real fixture source profile"}}`
		case strings.Contains(r.URL.Path, "/stocks/v1/"):
			raw = `{"status":"OK","results":[]}`
		case strings.Contains(r.URL.Path, "/submissions/"):
			raw = `{"name":"Other Company","filings":{"recent":{"accessionNumber":["0000000123-26-000001"],"form":["10-K"],"reportDate":["2026-09-30"],"filingDate":["2026-10-14"],"acceptanceDateTime":["2026-10-14T12:00:00Z"],"primaryDocument":["annual.htm"]}}}`
		case strings.Contains(r.URL.Path, "/companyfacts/"):
			raw = `{"entityName":"Other Company","facts":{"us-gaap":{"Revenues":{"units":{"USD":[{"val":123000000,"start":"2025-10-01","end":"2026-09-30","filed":"2026-10-14","accn":"0000000123-26-000001","fy":2026,"fp":"FY","form":"10-K"}]}}}}}`
		default:
			t.Fatalf("unexpected endpoint %s", r.URL.Path)
		}
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(raw)), Header: http.Header{}}, nil
	})}
	now := time.Now()
	mapping := market.Job{Provider: "sec", Dataset: "identity", Subject: "us"}
	db.AddResearchJobs(ctx, []market.Job{mapping}, now)
	identity, _ := db.ClaimResearchJob(ctx, "sec", []string{"identity"}, false, now)
	if err = db.FinishResearchJob(ctx, *identity, market.Result{Aliases: map[string]string{"OTHER.B": "0000000123"}, Payload: market.Payload{Complete: true}, Evidence: []market.Evidence{{URL: "https://www.sec.gov/files/company_tickers_exchange.json", Body: []byte(`{"source":"fixture"}`), FetchedAt: now}}}, now, now.Add(time.Hour)); err != nil {
		t.Fatal(err)
	}
	jobs := []market.Job{{Provider: "massive", Dataset: "prices", Subject: "2026-10-14"}, {Provider: "massive", Dataset: "profile", Subject: "OTHER.B"}, {Provider: "massive", Dataset: "actions", Subject: "OTHER.B"}, {Provider: "sec", Dataset: "filings", Subject: "cik:0000000123"}, {Provider: "sec", Dataset: "facts", Subject: "cik:0000000123"}, {Provider: "sec", Dataset: "insiders", Subject: "cik:0000000123"}}
	db.AddResearchJobs(ctx, jobs, now)
	for _, provider := range []string{"massive", "sec"} {
		for i := 0; i < 3; i++ {
			worked, e := engine.Step(ctx, provider)
			if e != nil || !worked {
				t.Fatal(provider, i, e)
			}
		}
	}
	before := requests
	db.Close()
	db, err = store.Open(ctx, path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	data, err := db.ResearchRead(ctx, "OTHER.B")
	if err != nil || len(data.Bars) != 1 || data.Bars[0].Close != 105 || data.Datasets["profile"].Data.Profile.Name != "Other Company Class B" || len(data.Datasets["facts"].Data.Facts) != 1 || len(data.Datasets["filings"].Data.Filings) != 1 || data.Datasets["insiders"].Provider != "sec" || len(data.Datasets["prices"].Sources) != 1 {
		t.Fatal("persisted source read failed", market.Marshal(data), err)
	}
	if requests != before {
		t.Fatal("offline read called a provider")
	}
}

func TestNewIssuerMissingDataRetriesWithoutPermanentBlock(t *testing.T) {
	ctx := context.Background()
	db, e := store.Open(ctx, t.TempDir())
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close()
	cfg, _ := db.ResearchConfig(ctx)
	cfg.ProfileSource = "massive"
	if _, e = db.SaveResearchConfig(ctx, cfg); e != nil {
		t.Fatal(e)
	}
	now := time.Now()
	db.AddResearchJobs(ctx, []market.Job{{Provider: "massive", Dataset: "profile", Subject: "NEW"}}, now)
	engine := New(db, "", false)
	engine.Client.Gate = nil
	engine.Client.Key = func(context.Context, string) (map[string]string, error) {
		return map[string]string{"apiKey": "fixture-key"}, nil
	}
	engine.Client.HTTP = &http.Client{Transport: fixtureHTTP(func(*http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: 404, Header: http.Header{}, Body: io.NopCloser(strings.NewReader("not published yet"))}, nil
	})}
	worked, e := engine.Step(ctx, "massive")
	if e != nil || !worked {
		t.Fatal(e)
	}
	if j, _ := db.ClaimResearchJob(ctx, "massive", []string{"profile"}, false, now.Add(24*time.Hour)); j != nil {
		t.Fatal("new issuer retried too aggressively")
	}
	if j, e := db.ClaimResearchJob(ctx, "massive", []string{"profile"}, false, now.Add(169*time.Hour)); e != nil || j == nil {
		t.Fatal("temporarily missing data permanently blocked", e)
	}
}

func TestKeylessPricesPersistRestateAndReadOffline(t *testing.T) {
	ctx := context.Background()
	path := t.TempDir()
	db, err := store.Open(ctx, path)
	if err != nil {
		t.Fatal(err)
	}
	engine := New(db, path, false)
	cfg, _ := db.ResearchConfig(ctx)
	if cfg.PriceSource != "yahoo" || cfg.Limits["yahoo"].PerMinute != 20 {
		t.Fatal("keyless default missing", cfg)
	}
	now := time.Date(2026, 10, 15, 21, 0, 0, 0, time.UTC)
	engine.Now = func() time.Time { return now }
	engine.Client.Now = engine.Now
	calls := 0
	closePrice := 105.0
	engine.Client.HTTP = &http.Client{Transport: fixtureHTTP(func(r *http.Request) (*http.Response, error) {
		calls++
		if r.URL.Host != "query1.finance.yahoo.com" || r.Header.Get("Authorization") != "" {
			t.Fatal("not keyless", r.URL)
		}
		raw := fmt.Sprintf(`{"chart":{"error":null,"result":[{"meta":{"symbol":"OTHER-B","currency":"USD","exchangeTimezoneName":"America/New_York"},"timestamp":[1791984600],"indicators":{"quote":[{"open":[100],"high":[110],"low":[90],"close":[%v],"volume":[1234]}]}}]}}`, closePrice)
		return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(raw))}, nil
	})}
	if err = db.AddResearchJobs(ctx, []market.Job{{Provider: "yahoo", Dataset: "prices", Subject: "OTHER.B"}}, now); err != nil {
		t.Fatal(err)
	}
	if worked, err := engine.Step(ctx, "yahoo"); err != nil || !worked {
		t.Fatal(worked, err)
	}
	first, err := db.ResearchRead(ctx, "OTHER.B")
	if err != nil || len(first.Bars) != 1 || first.Bars[0].Close != 105 || first.Basis != "split-adjusted" || first.Datasets["prices"].Provider != "yahoo" || len(first.Datasets["prices"].Sources) != 1 {
		t.Fatal(market.Marshal(first), err)
	}
	// A subsequent restated window replaces old split-adjusted values atomically.
	now = now.Add(25 * time.Hour)
	closePrice = 100
	if worked, err := engine.Step(ctx, "yahoo"); err != nil || !worked {
		t.Fatal(worked, err)
	}
	db.Close()
	db, err = store.Open(ctx, path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	for i := 0; i < 3; i++ {
		v, err := db.ResearchRead(ctx, "OTHER.B")
		if err != nil || len(v.Bars) != 1 || v.Bars[0].Close != 100 || v.Coverage["prices"] != "stored" {
			t.Fatal(market.Marshal(v), err)
		}
	}
	if calls != 2 {
		t.Fatal("local/offline reads fetched provider", calls)
	}
	engine.DB = db
	cfg, _ = db.ResearchConfig(ctx)
	cfg.Automatic = false
	if _, err = db.SaveResearchConfig(ctx, cfg); err != nil {
		t.Fatal(err)
	}
	now = now.Add(25 * time.Hour)
	if worked, err := engine.Step(ctx, "yahoo"); err != nil || worked {
		t.Fatal("paused sync executed", worked, err)
	}
	if calls != 2 {
		t.Fatal("paused source requested")
	}
}

func TestKeylessCompanyCollectionBeatsPriceBacklogAndSurvivesOfflineRestart(t *testing.T) {
	ctx := context.Background()
	path := t.TempDir()
	db, err := store.Open(ctx, path)
	if err != nil {
		t.Fatal(err)
	}
	engine := New(db, path, false)
	calls := 0
	engine.Client.HTTP = &http.Client{Transport: fixtureHTTP(func(r *http.Request) (*http.Response, error) {
		calls++
		if r.Header.Get("Cookie") != "" || r.Header.Get("Authorization") != "" {
			t.Fatal("keyless source used credentials")
		}
		body := ""
		if r.URL.Host == "finance.yahoo.com" {
			embedded := `{"quoteSummary":{"error":null,"result":[{"price":{"symbol":"OTHER-B","currency":"USD","quoteType":"EQUITY","longName":"Other Company"},"assetProfile":{"industry":"Hardware","longBusinessSummary":"Other Company makes hardware."},"financialData":{"targetMeanPrice":{"raw":120},"numberOfAnalystOpinions":{"raw":39}},"earningsGaap":{"financialCurrency":"USD","earningsChart":{"quarterly":[{"fiscalQuarter":"3Q2026","periodEndDate":{"fmt":"2026-06-30"},"actual":{"raw":1.2},"estimate":{"raw":1.1}}]}},"secFilings":{"filings":[{"date":"2026-10-14","type":"8-K","edgarUrl":"https://finance.yahoo.com/sec-filing/OTHER-B/0000000123-26-000001_123"}]}}]}}`
			body = `<html><script type="application/json" data-sveltekit-fetched data-url="https://query1.finance.yahoo.com/v10/finance/quoteSummary/OTHER-B">` + market.Marshal(map[string]any{"status": 200, "body": embedded}) + `</script></html>`
		} else if strings.Contains(r.URL.Path, "recommendationsbysymbol") {
			body = `{"finance":{"result":[{"symbol":"OTHER-B","recommendedSymbols":[{"symbol":"MSFT","score":0.2}]}],"error":null}}`
		} else if strings.Contains(r.URL.Path, "fundamentals-timeseries") {
			body = `{"timeseries":{"error":null,"result":[{"meta":{"symbol":["OTHER-B"],"type":["annualTotalRevenue"]},"annualTotalRevenue":[{"asOfDate":"2025-09-30","periodType":"12M","currencyCode":"USD","reportedValue":{"raw":123456}}]}]}}`
		} else {
			body = `{"chart":{"error":null,"result":[{"meta":{"symbol":"Q0000","currency":"USD","instrumentType":"EQUITY"},"timestamp":[1791979200],"indicators":{"quote":[{"open":[10],"high":[11],"low":[9],"close":[10],"volume":[100]}]}}]}}`
		}
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(body)), Header: http.Header{}}, nil
	})}
	jobs := []market.Job{}
	for i := 0; i < 1000; i++ {
		jobs = append(jobs, market.Job{Provider: "yahoo", Dataset: "prices", Subject: fmt.Sprintf("Q%04d", i)})
	}
	for _, d := range []string{"profile", "filings", "facts", "analyst", "earnings", "peers"} {
		jobs = append(jobs, market.Job{Provider: "yahoo", Dataset: d, Subject: "OTHER.B"})
	}
	if err = db.AddResearchJobs(ctx, jobs, time.Now()); err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 7; i++ {
		if worked, err := engine.Step(ctx, "yahoo"); err != nil || !worked {
			t.Fatal(i, worked, err)
		}
	}
	if calls != 5 {
		t.Fatal("profile/filings did not reuse public page", calls)
	}
	db.Close()
	db, err = store.Open(ctx, path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	for i := 0; i < 3; i++ {
		data, err := db.ResearchRead(ctx, "OTHER.B")
		if err != nil || data.Datasets["profile"].Data.Profile == nil || data.Datasets["profile"].Data.Profile.Industry != "Hardware" || len(data.Datasets["facts"].Data.Facts) != 1 || len(data.Datasets["filings"].Data.Filings) != 1 {
			t.Fatal(market.Marshal(data), err)
		}
		if len(data.Datasets["analyst"].Data.Records) != 1 || len(data.Datasets["earnings"].Data.Records) != 1 || len(data.Datasets["peers"].Data.Records) != 1 {
			t.Fatal("outlook records lost on offline restart", market.Marshal(data))
		}
		for _, d := range []string{"profile", "facts", "filings", "analyst", "earnings", "peers"} {
			if data.Coverage[d] != "stored" || data.Datasets[d].Provider != "yahoo" || len(data.Datasets[d].Sources) != 1 {
				t.Fatal(d, market.Marshal(data))
			}
		}
	}
	if calls != 5 {
		t.Fatal("local reads fetched sources", calls)
	}
	failed := New(db, path, false)
	failed.Now = func() time.Time { return time.Now().Add(8 * 24 * time.Hour) }
	failed.Client.Now = failed.Now
	failed.Client.HTTP = &http.Client{Transport: fixtureHTTP(func(*http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(strings.NewReader("<html>Page format changed</html>"))}, nil
	})}
	if worked, err := failed.Step(ctx, "yahoo"); err != nil || !worked {
		t.Fatal(worked, err)
	}
	last, err := db.ResearchRead(ctx, "OTHER.B")
	if err != nil || last.Datasets["profile"].Data.Profile == nil || last.Datasets["profile"].Data.Profile.Industry != "Hardware" {
		t.Fatal("failed public-page refresh erased last-good profile", market.Marshal(last), err)
	}
}

func TestNasdaqBackupRunsAfterPublicPageFailureAndRespectsPause(t *testing.T) {
	ctx := context.Background()
	path := t.TempDir()
	db, err := store.Open(ctx, path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	now := time.Now().UTC()
	engine := New(db, path, false)
	engine.Now = func() time.Time { return now }
	engine.Client.Now = engine.Now
	if err = db.AddResearchJobs(ctx, []market.Job{{Provider: "yahoo", Dataset: "profile", Subject: "A"}, {Provider: "nasdaq", Dataset: "profile", Subject: "A"}}, now); err != nil {
		t.Fatal(err)
	}
	engine.Client.HTTP = &http.Client{Transport: fixtureHTTP(func(r *http.Request) (*http.Response, error) {
		body := `<html><title>Agilent profile</title>Profile Information Not Available</html>`
		if r.URL.Host == "api.nasdaq.com" {
			body = `{"data":{"Symbol":{"value":"A"},"CompanyName":{"value":"Agilent"},"CompanyDescription":{"value":"Laboratory instruments"}}}`
		}
		return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(body))}, nil
	})}
	// Test request policy independently of wall-clock budget waits.
	engine.Client.Gate = func(context.Context, string) error { return nil }
	if worked, e := engine.Step(ctx, "yahoo"); e != nil || !worked {
		t.Fatal(worked, e)
	}
	// Missing page now waits for its normal cadence; the backup is independent.
	if j, e := db.ClaimResearchJob(ctx, "yahoo", []string{"profile"}, false, now.Add(2*time.Hour)); e != nil || j != nil {
		t.Fatal("missing page retried before cadence", j, e)
	}
	cfg, _ := db.ResearchConfig(ctx)
	cfg.Datasets["profile"] = store.DatasetConfig{Enabled: false, IntervalHours: 168}
	cfg, err = db.SaveResearchConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	if worked, e := engine.Step(ctx, "nasdaq"); e != nil || worked {
		t.Fatal("disabled backup ran", worked, e)
	}
	cfg.Datasets["profile"] = store.DatasetConfig{Enabled: true, IntervalHours: 168}
	if _, err = db.SaveResearchConfig(ctx, cfg); err != nil {
		t.Fatal(err)
	}
	if worked, e := engine.Step(ctx, "nasdaq"); e != nil || !worked {
		t.Fatal("backup did not run", worked, e)
	}
	view, e := db.ResearchRead(ctx, "A")
	if e != nil || view.Datasets["profile"].Provider != "nasdaq" || view.Datasets["profile"].Data.Profile.Description == "" {
		t.Fatal(view, e)
	}
}

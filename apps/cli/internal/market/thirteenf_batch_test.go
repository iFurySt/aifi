package market

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"testing"
)

func TestWholeFundReportIndexesCUSIPWithoutTickerAndExcludesDerivatives(t *testing.T) {
	index, err := parseBulkFundReport([]byte(`{"data":[["BRK.B","Berkshire","COM","084670702",20,1,100,null,null],[null,"Apple","COM","037833100",30,1,200,null,null],["AAPL","Apple","COM","037833100",99,1,999,null,"Call"],["AAPL","Apple","NOTE","037833100",99,1,999,null,null],["AAPL","Apple","COM","037833100",99,1,999,100,null]]}`))
	if err != nil || len(index.symbols["BRK-B"]) != 1 || len(index.symbols["AAPL"]) != 0 || len(index.cusips["037833100"]) != 1 || index.cusips["037833100"][0].value != 30000 {
		t.Fatal(index, err)
	}
	for _, raw := range []string{`{}`, `{"data":[["AAPL"]]}`, `{"data":[["AAPL","Apple","COM","bad",20,1,100,null,null]]}`, `{"data":[["AAPL","Apple","COM","037833100",20,1,-100,null,null]]}`} {
		if _, err := parseBulkFundReport([]byte(raw)); err == nil {
			t.Fatal("invalid whole report accepted", raw)
		}
	}
}

func TestWholeFundCollectorPreservesCUSIPAcrossUnknownTickerAndLeavesIdentityGaps(t *testing.T) {
	prior := fundManagers
	fundManagers = []FundManager{{CIK: "0000000001", DisplayName: "Fixture", ProfileURL: "https://13f.info/manager/0000000001-fixture"}}
	defer func() { fundManagers = prior }()
	old := `{"data":[[null,"Apple","COM","037833100",20,1,100,null,null]]}`
	calls := 0
	c := testClient(t, func(r *http.Request) (int, string) {
		calls++
		switch r.URL.Path {
		case "/manager/0000000001-fixture":
			return 200, managerPage("0000000001")
		case "/data/13f/000000000126000001":
			return 200, `{"data":[["AAPL","Apple","COM","037833100",30,1,200,null,null]]}`
		default:
			return 200, old
		}
	})
	run := func() Result {
		t.Helper()
		c.fundBatch = fundBatchCache{}
		r, e := c.Collect(context.Background(), Job{Provider: "thirteenf", Dataset: "funds", Subject: "AAPL", Window: "2026-06-30:14"})
		if e != nil {
			t.Fatal(e)
		}
		return r
	}
	r := run()
	if len(r.Payload.Records) != 2 || r.Payload.Records[1]["shares"] != float64(100) || r.Payload.Records[1]["reportedAbsence"] != nil {
		t.Fatal("unknown source ticker became zero", r.Payload)
	}
	old = `{"data":[["AAPL","Another instrument","COM","123456789",20,1,100,null,null]]}`
	r = run()
	if len(r.Payload.Records) != 1 {
		t.Fatal("changed CUSIP stitched", r.Payload)
	}
	old = `{"data":[["AAPL","Apple","COM","037833100",20,1,100,null,null],["AAPL","Ambiguous","COM","123456789",20,1,100,null,null]]}`
	c.fundBatch = fundBatchCache{}
	if _, err := c.Collect(context.Background(), Job{Provider: "thirteenf", Dataset: "funds", Subject: "AAPL", Window: "2026-06-30:14"}); err == nil {
		t.Fatal("ambiguous ticker accepted")
	}
	if calls != 9 {
		t.Fatal(calls)
	}
}

func TestFundIdentityAnchorsAllManagersToNewestCUSIP(t *testing.T) {
	report := func(cusip string) bulkFundReport {
		return bulkFundReport{index: bulkFundIndex{symbols: map[string][]bulkFundPosition{"X": {{cusip: cusip, shares: 100}}}}}
	}
	windows := []bulkFundWindow{{byDate: map[string]bulkFundReport{"2026-06-30": report("123456789")}}, {byDate: map[string]bulkFundReport{"2026-03-31": report("987654321")}}}
	got, err := fundWindowCUSIP(windows, []string{"2026-06-30", "2026-03-31"}, "X")
	if err != nil || got != "123456789" {
		t.Fatal("old manager identity displaced current security", got, err)
	}
	windows[1].byDate["2026-06-30"] = report("987654321")
	if _, err := fundWindowCUSIP(windows, []string{"2026-06-30", "2026-03-31"}, "X"); err == nil {
		t.Fatal("conflicting current CUSIPs accepted")
	}
}

func TestInvalidSharedReportIsRevalidatedAndReplacedBeforeCaching(t *testing.T) {
	calls, saves := 0, 0
	c := testClient(t, func(*http.Request) (int, string) { calls++; return 200, `{"data":[]}` })
	cached := Evidence{URL: "https://13f.info/data/13f/000000000126000001", Body: []byte(`{"error":"temporarily unavailable"}`), FetchedAt: c.Now()}
	c.ReadStage = func(context.Context, string) (*Evidence, error) { return &cached, nil }
	c.SaveStage = func(_ context.Context, _ string, ev Evidence) error { saves++; cached = ev; return nil }
	for i := 0; i < 2; i++ {
		c.fundBatch.reports = map[string]bulkFundReport{}
		if _, err := c.batchFundReport(context.Background(), fundReport{ID: "000000000126000001-fixture"}); err != nil {
			t.Fatal(err)
		}
	}
	if calls != 1 || saves != 1 {
		t.Fatal("malformed stage reused or valid repair redownloaded", calls, saves)
	}
}

func TestLocalSharedFundReportSamples(t *testing.T) {
	path := os.Getenv("AIFI_FUND_REPORT_SAMPLES")
	if path == "" {
		t.Skip("optional local public report samples")
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var reports []json.RawMessage
	if err = json.Unmarshal(raw, &reports); err != nil || len(reports) == 0 {
		t.Fatal(err)
	}
	total := 0
	for i, raw := range reports {
		index, err := parseBulkFundReport(raw)
		if err != nil {
			t.Fatalf("report %d: %v", i, err)
		}
		total += index.count
	}
	t.Logf("validated %d shared reports / %d common-share rows", len(reports), total)
}

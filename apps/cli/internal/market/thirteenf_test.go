package market

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"testing"
	"time"
)

func managerPage(cik string) string {
	return fmt.Sprintf(`<h1 data-cik="%s">Fixture</h1><table id="managerFilings"><tbody><tr><td data-order="2026-06-30"><a href="/13f/000000000126000001-fixture-q2-2026">Q2 2026</a></td><td>1</td><td>20</td><td>FIX</td><td>13F-HR</td><td data-order="2026-08-10">8/10/2026</td><td>000000000126000001</td></tr><tr><td data-order="2026-03-31"><a href="/13f/000000000126000002-fixture-q1-2026">Q1 2026</a></td><td>1</td><td>20</td><td>FIX</td><td>13F-HR</td><td data-order="2026-05-10">5/10/2026</td><td>000000000126000002</td></tr></tbody></table>`, cik)
}
func Test13FReportWindowAndStrictIdentity(t *testing.T) {
	if got := FundHistoryWindow(time.Date(2026, 10, 17, 12, 0, 0, 0, time.UTC), 14); got != "2026-06-30:14" {
		t.Fatal(got)
	}
	if got := FundHistoryWindow(time.Date(2026, 11, 14, 12, 0, 0, 0, time.UTC), 14); got != "2026-09-30:14" {
		t.Fatal(got)
	}
	periods, err := fundReportPeriods("2026-06-30:14")
	if err != nil || len(periods) != 14 || periods[13] != "2023-03-31" {
		t.Fatal(periods, err)
	}
	for _, test := range []string{"https://13f.info/data/autocomplete?q=AAPL&key=bad", "https://13f.info/manager/../../secret", "https://evil.invalid/data/autocomplete?q=AAPL"} {
		u, _ := url.Parse(test)
		if valid13FEndpoint(u) {
			t.Fatal(test)
		}
	}
	if _, err = parse13FReports([]byte(managerPage("0000000001")), "0000000002", time.Now()); err == nil {
		t.Fatal("wrong manager accepted")
	}
	for _, raw := range []string{`{"cusips":[{"name":"AAPU - Wrong","extra":"037833100 - COM","url":"/cusip/037833100"}]}`, `{"cusips":[{"name":"AAPL - Wrong","extra":"123456789 - COM","url":"/cusip/037833100"}]}`} {
		if _, err = exact13FCUSIP([]byte(raw), "AAPL"); err == nil {
			t.Fatal("unsafe ticker bridge accepted")
		}
	}
}
func Test13FHistoryOptionsAndConfirmedAbsence(t *testing.T) {
	now := time.Date(2026, 10, 17, 0, 0, 0, 0, time.UTC)
	reports, err := parse13FReports([]byte(managerPage("0000000001")), "0000000001", now)
	if err != nil {
		t.Fatal(err)
	}
	raw := []byte(`{"data":[[["2026-03-31","000000000126000002-fixture-q1-2026"],20,null,100,null,"2026-05-10",[2026,1]],[["2026-06-30","000000000126000001-fixture-q2-2026"],999,null,99999,"Put","2026-08-10",[2026,2]]]}`)
	rows, err := parse13FHistory(raw, reports, FundManager{CIK: "0000000001", DisplayName: "Fixture"}, "037833100", []string{"2026-06-30", "2026-03-31", "2025-12-31"}, Evidence{FetchedAt: now}, now)
	if err != nil || len(rows) != 2 || rows[0]["shares"] != float64(0) || rows[0]["reportedAbsence"] != true || rows[1]["value"] != float64(20000) {
		t.Fatal(rows, err)
	}
	delete(reports, "2026-06-30")
	rows, err = parse13FHistory(raw, reports, FundManager{}, "037833100", []string{"2026-06-30", "2026-03-31"}, Evidence{FetchedAt: now}, now)
	if err != nil || len(rows) != 1 || rows[0]["reportDate"] != "2026-03-31" {
		t.Fatal("missing manager report became zero", rows, err)
	}
}
func Test13FCollectorUsesStagingWithoutKeysAndRetainsSourceProof(t *testing.T) {
	prior := fundManagers
	fundManagers = []FundManager{{CIK: "0000000001", DisplayName: "Fixture", ProfileURL: "https://13f.info/manager/0000000001-fixture"}}
	defer func() { fundManagers = prior }()
	calls := 0
	c := testClient(t, func(r *http.Request) (int, string) {
		calls++
		if r.Header.Get("Cookie") != "" || r.URL.Query().Get("apikey") != "" {
			t.Fatal("auth leaked")
		}
		switch r.URL.Path {
		case "/manager/0000000001-fixture":
			if r.Header.Get("Accept") != "text/html" {
				t.Fatal("manager HTML negotiated as JSON")
			}
			return 200, managerPage("0000000001")
		case "/data/13f/000000000126000002":
			return 200, `{"data":[["AAPL","Apple","COM","037833100",20,1,100,null,null],["MSFT","Microsoft","COM","594918104",30,1,200,null,null]]}`
		default:
			return 200, `{"data":[["AAPL","Apple","COM","037833100",999,1,99999,null,"Put"]]}`
		}
	})
	c.Key = func(context.Context, string) (map[string]string, error) { return nil, nil }
	saved := map[string]Evidence{}
	c.ReadStage = func(_ context.Context, k string) (*Evidence, error) {
		if value, ok := saved[k]; ok {
			return &value, nil
		}
		return nil, nil
	}
	c.SaveStage = func(_ context.Context, k string, e Evidence) error { saved[k] = e; return nil }
	for _, symbol := range []string{"AAPL", "MSFT", "AAPL"} {
		// Recreate the client to prove disk staging is sufficient after restart.
		c.fundBatch = fundBatchCache{}
		result, err := c.Collect(context.Background(), Job{Provider: "thirteenf", Dataset: "funds", Subject: symbol, Window: "2026-06-30:14"})
		if err != nil || len(result.Payload.Records) != 2 || result.Payload.Complete || len(result.Evidence) != 3 {
			t.Fatal(result, err)
		}
	}
	if calls != 3 {
		t.Fatal("repeated staged requests", calls)
	}
}

func Test13FPublishedJSONLDIdentity(t *testing.T) {
	raw := strings.Replace(managerPage("0000000001"), `<h1 data-cik="0000000001">Fixture</h1>`, `<h1>Fixture</h1><link rel="canonical" href="https://13f.info/manager/0000000001-fixture"><script type="application/ld+json">{"itemListElement":[{"identifier":"0000000001","sameAs":"https://www.sec.gov/edgar/browse/?CIK=0000000001"}]}</script>`, 1)
	if _, err := parse13FReports([]byte(raw), "0000000001", time.Now()); err != nil {
		t.Fatal(err)
	}
	if _, err := parse13FReports([]byte(strings.Replace(raw, "?CIK=0000000001", "?CIK=0000000002", 1)), "0000000001", time.Now()); err == nil {
		t.Fatal("wrong SEC identity accepted")
	}
}

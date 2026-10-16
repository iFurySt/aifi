package market

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

func publicCompanyFixture(symbol string) string {
	data := map[string]any{"quoteSummary": map[string]any{"error": nil, "result": []any{map[string]any{
		"price":        map[string]any{"symbol": symbol, "currency": "USD", "quoteType": "EQUITY", "longName": "Other Company"},
		"assetProfile": map[string]any{"longBusinessSummary": "Company description <untrusted text>", "industry": "Hardware", "sector": "Technology", "country": "United States", "website": "https://example.invalid", "fullTimeEmployees": 123},
		"secFilings":   map[string]any{"filings": []any{map[string]any{"date": "2026-10-14", "type": "10-Q", "title": "Quarterly report", "edgarUrl": "https://finance.yahoo.com/sec-filing/" + symbol + "/0000000123-26-000001_123", "exhibits": []any{map[string]any{"type": "10-Q", "url": "https://cdn.yahoofinance.com/prod/sec-filings/0000000123/000000012326000001/report.htm"}}}}},
	}}}}
	body, _ := json.Marshal(data)
	env, _ := json.Marshal(map[string]any{"status": 200, "body": string(body)})
	return `<!doctype html><html><script>throw new Error("never run");</script><script type="application/json" data-sveltekit-fetched data-url="https://query1.finance.yahoo.com/v10/finance/quoteSummary/` + symbol + `">` + string(env) + `</script></html>`
}
func TestPublicCompanyProfileAndFilingsReuseValidatedPage(t *testing.T) {
	calls := 0
	c := testClient(t, func(r *http.Request) (int, string) {
		calls++
		if r.URL.String() != "https://finance.yahoo.com/quote/OTHER-B/profile/" || r.Header.Get("Cookie") != "" || r.Header.Get("Authorization") != "" {
			t.Fatal("unsafe public-page request", r.URL)
		}
		return 200, publicCompanyFixture("OTHER-B")
	})
	c.Key = func(context.Context, string) (map[string]string, error) { return map[string]string{}, nil }
	cache := map[string]Evidence{}
	c.SaveStage = func(_ context.Context, key string, ev Evidence) error { cache[key] = ev; return nil }
	c.ReadStage = func(_ context.Context, key string) (*Evidence, error) {
		if v, ok := cache[key]; ok {
			return &v, nil
		}
		return nil, nil
	}
	p, err := c.Collect(context.Background(), Job{Provider: "yahoo", Dataset: "profile", Subject: "OTHER.B"})
	if err != nil || p.Payload.Profile == nil || p.Payload.Profile.Industry != "Hardware" || p.Payload.Profile.Employees != 123 || p.Payload.Profile.Shares != nil || p.Payload.Complete {
		t.Fatal(Marshal(p), err)
	}
	f, err := c.Collect(context.Background(), Job{Provider: "yahoo", Dataset: "filings", Subject: "OTHER.B"})
	if err != nil || len(f.Payload.Filings) != 1 || calls != 1 {
		t.Fatal(Marshal(f), err, calls)
	}
	filing := f.Payload.Filings[0]
	if filing.URL != "https://www.sec.gov/Archives/edgar/data/123/000000012326000001/report.htm" || filing.ReportDate != "" || filing.Accepted != "" || f.Payload.Profile.CIK != "0000000123" {
		t.Fatal(filing)
	}
	if strings.Contains(string(f.Evidence[0].Body), "<script") || f.Evidence[0].URL != "https://finance.yahoo.com/quote/OTHER-B/profile/" {
		t.Fatal("page scripts persisted instead of embedded source response")
	}
}
func TestPublicCompanyPageRejectsIdentityAndUnsafeFiling(t *testing.T) {
	for _, body := range []string{publicCompanyFixture("WRONG"), `<html>Verification required</html>`} {
		c := testClient(t, func(*http.Request) (int, string) { return 200, body })
		if _, err := c.Collect(context.Background(), Job{Provider: "yahoo", Dataset: "profile", Subject: "AAPL"}); err == nil {
			t.Fatal("unverified page accepted")
		}
	}
	body := strings.ReplaceAll(publicCompanyFixture("OTHER-B"), "cdn.yahoofinance.com", "attacker.invalid")
	c := testClient(t, func(*http.Request) (int, string) { return 200, body })
	r, err := c.Collect(context.Background(), Job{Provider: "yahoo", Dataset: "filings", Subject: "OTHER.B"})
	if err != nil || len(r.Payload.Filings) != 1 || !strings.HasSuffix(r.Payload.Filings[0].URL, "-index.html") {
		t.Fatal("untrusted exhibit accepted", Marshal(r), err)
	}
}
func TestYahooFactsPreserveVendorPeriodsAndCapexSign(t *testing.T) {
	c := testClient(t, func(r *http.Request) (int, string) {
		if r.URL.Query().Get("type") == "" || r.Header.Get("Authorization") != "" {
			t.Fatal(r.URL)
		}
		return 200, `{"timeseries":{"error":null,"result":[{"meta":{"symbol":["OTHER-B"],"type":["annualTotalRevenue"]},"annualTotalRevenue":[{"asOfDate":"2025-09-30","periodType":"12M","currencyCode":"USD","reportedValue":{"raw":1000.25}}]},{"meta":{"symbol":["OTHER-B"],"type":["quarterlyTotalRevenue"]},"quarterlyTotalRevenue":[{"asOfDate":"2025-09-30","periodType":"3M","currencyCode":"USD","reportedValue":{"raw":300}}]},{"meta":{"symbol":["OTHER-B"],"type":["quarterlyCapitalExpenditure"]},"quarterlyCapitalExpenditure":[{"asOfDate":"2025-09-30","periodType":"3M","currencyCode":"USD","reportedValue":{"raw":-50}}]}]}}`
	})
	r, err := c.Collect(context.Background(), Job{Provider: "yahoo", Dataset: "facts", Subject: "OTHER.B"})
	if err != nil || len(r.Payload.Facts) != 3 || r.Payload.Complete {
		t.Fatal(Marshal(r), err)
	}
	for _, f := range r.Payload.Facts {
		if f.Start != "" || f.Filed != "" || f.Accession != "" || f.Form != "" || f.FiscalYear != 0 || f.FiscalPeriod != "" {
			t.Fatal("invented fiscal/filing data", f)
		}
		if f.Metric == "capex" && f.Value != "50" {
			t.Fatal("wrong capex sign", f)
		}
	}
}

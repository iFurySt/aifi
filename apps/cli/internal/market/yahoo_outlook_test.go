package market

import (
	"context"
	"net/http"
	"testing"
)

func TestYahooAnalystAndGAAPEarningsUseSharedPublicPage(t *testing.T) {
	data := `{"quoteSummary":{"result":[{"price":{"symbol":"OTHER-B","currency":"USD","quoteType":"EQUITY","regularMarketPrice":{"raw":100},"regularMarketPreviousClose":{"raw":98},"regularMarketTime":1791986400,"marketState":"CLOSED"},"financialData":{"targetMeanPrice":{"raw":120},"targetHighPrice":{"raw":150},"targetLowPrice":{"raw":90},"recommendationMean":{"raw":2.2},"recommendationKey":"buy","numberOfAnalystOpinions":{"raw":39}},"recommendationTrend":{"trend":[{"period":"0m","strongBuy":6,"buy":19,"hold":13,"sell":3,"strongSell":3}]},"upgradeDowngradeHistory":{"history":[{"epochGradeDate":1791890000,"firm":"Example firm","fromGrade":"Hold","toGrade":"Buy","action":"up"}]},"earningsGaap":{"financialCurrency":"USD","earningsChart":{"quarterly":[{"fiscalQuarter":"3Q2026","periodEndDate":{"fmt":"2026-06-30"},"actual":{"raw":-0.5},"estimate":{"raw":-0.8},"reportedDate":{"fmt":"2026-07-30"}}],"currentQuarterEstimate":{"raw":0}}},"earningsNonGaap":{"earningsChart":{"quarterly":[{"actual":{"raw":99}}]}},"calendarEvents":{"earnings":{"earningsDate":[{"fmt":"2026-11-02"}],"isEarningsDateEstimate":true}}}]}}`
	page := `<script type="application/json" data-sveltekit-fetched data-url="https://query1.finance.yahoo.com/v10/finance/quoteSummary/OTHER-B">` + Marshal(map[string]any{"status": 200, "body": data}) + `</script>`
	calls := 0
	c := testClient(t, func(r *http.Request) (int, string) {
		calls++
		if r.URL.Path != "/quote/OTHER-B/analysis/" || r.Header.Get("Cookie") != "" {
			t.Fatal(r.URL)
		}
		return 200, page
	})
	var cached *Evidence
	c.ReadStage = func(context.Context, string) (*Evidence, error) { return cached, nil }
	c.SaveStage = func(_ context.Context, _ string, e Evidence) error { cached = &e; return nil }
	analyst, err := c.Collect(context.Background(), Job{Provider: "yahoo", Dataset: "analyst", Subject: "OTHER.B"})
	if err != nil || len(analyst.Payload.Records) != 3 || analyst.Payload.Records[0]["targetConsensus"] != float64(120) || analyst.Payload.Records[1]["count"] != float64(44) {
		t.Fatal(Marshal(analyst), err)
	}
	earnings, err := c.Collect(context.Background(), Job{Provider: "yahoo", Dataset: "earnings", Subject: "OTHER.B"})
	if err != nil || len(earnings.Payload.Records) != 2 || calls != 1 || earnings.Payload.Records[0]["actual"] != -0.5 || earnings.Payload.Records[0]["basis"] != "GAAP" || earnings.Payload.Records[1]["estimated"] != true {
		t.Fatal(Marshal(earnings), err, calls)
	}
}

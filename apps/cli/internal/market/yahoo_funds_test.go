package market

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"testing"
)

func holdersPage(symbol, modules string) string {
	data := fmt.Sprintf(`{"quoteSummary":{"result":[{"price":{"symbol":%q,"currency":"USD","quoteType":"EQUITY"},%s}]}}`, symbol, modules)
	return `<script type="application/json" data-sveltekit-fetched data-url="https://query1.finance.yahoo.com/v10/finance/quoteSummary/` + symbol + `">` + Marshal(map[string]any{"status": 200, "body": data}) + `</script>`
}

const holdingFixture = `"majorHoldersBreakdown":{"institutionsPercentHeld":{"raw":0.6635},"institutionsCount":{"raw":7695}},"institutionOwnership":{"ownershipList":[{"reportDate":{"fmt":"2026-06-30"},"organization":"Fixture manager","position":{"raw":1000},"value":{"raw":350000},"pctHeld":{"raw":0.02},"pctChange":{"raw":-0.0076}}]},"fundOwnership":{"ownershipList":[{"reportDate":{"fmt":"2026-08-31"},"organization":"Fixture fund","position":{"raw":250},"value":{"raw":87500},"pctHeld":{"raw":0.005},"pctChange":{"raw":0}}]}`

func TestYahooFundsPublicSampleUnitsDatesAndStoredHistory(t *testing.T) {
	c := testClient(t, func(r *http.Request) (int, string) {
		if r.URL.Path != "/quote/OTHER-B/holders/" || r.Header.Get("Cookie") != "" || r.URL.Query().Get("apikey") != "" {
			t.Fatal(r.URL)
		}
		return 200, holdersPage("OTHER-B", holdingFixture)
	})
	c.Key = func(context.Context, string) (map[string]string, error) { return nil, nil }
	c.ReadFundsHistory = func(_ context.Context, p, s string) ([]Record, error) {
		if p != "yahoo" || s != "OTHER.B" {
			t.Fatal(p, s)
		}
		return []Record{{"recordKind": "holding", "holderKind": "institution", "holderId": "old manager", "name": "Old manager", "shares": 200, "reportDate": "2026-03-31", "current": true}}, nil
	}
	result, err := c.Collect(context.Background(), Job{Provider: "yahoo", Dataset: "funds", Subject: "OTHER.B"})
	if err != nil {
		t.Fatal(err)
	}
	p := result.Payload
	if p.Complete || len(p.Records) != 3 || *p.Ownership.InstitutionsPercent != 66.35 || *p.Ownership.InstitutionsCount != 7695 {
		t.Fatal(Marshal(p))
	}
	if p.Records[0]["reportDate"] != "2026-08-31" || p.Records[1]["ownershipPercent"] != float64(2) || p.Records[1]["changePercent"] != -0.76 || p.Records[1]["value"] != float64(350000) {
		t.Fatal(Marshal(p))
	}
	if p.Records[2]["current"] != false || p.Records[2]["status"] != nil || p.Records[1]["changeShares"] != nil {
		t.Fatal("sample absence or rounded pct manufactured changes", Marshal(p))
	}
}
func TestYahooFundsFailsClosedAndDistinguishesEmpty(t *testing.T) {
	for _, module := range []string{`"unrelated":{}`, strings.Replace(holdingFixture, "2026-06-30", "2027-06-30", 1), strings.Replace(holdingFixture, `"raw":1000`, `"raw":-1`, 1)} {
		c := testClient(t, func(*http.Request) (int, string) { return 200, holdersPage("AAPL", module) })
		if _, err := c.Collect(context.Background(), Job{Provider: "yahoo", Dataset: "funds", Subject: "AAPL"}); err == nil {
			t.Fatal("invalid sample accepted", module)
		}
	}
	c := testClient(t, func(*http.Request) (int, string) { return 200, holdersPage("WRONG", holdingFixture) })
	if _, err := c.Collect(context.Background(), Job{Provider: "yahoo", Dataset: "funds", Subject: "AAPL"}); err == nil {
		t.Fatal("wrong issuer accepted")
	}
	c = testClient(t, func(*http.Request) (int, string) {
		return 200, holdersPage("AAPL", `"institutionOwnership":{"ownershipList":[]},"fundOwnership":{"ownershipList":[]}`)
	})
	r, err := c.Collect(context.Background(), Job{Provider: "yahoo", Dataset: "funds", Subject: "AAPL"})
	if err != nil || len(r.Payload.Records) != 0 {
		t.Fatal(r, err)
	}
	c.ReadFundsHistory = func(context.Context, string, string) ([]Record, error) { return nil, errors.New("store unavailable") }
	if _, err = c.Collect(context.Background(), Job{Provider: "yahoo", Dataset: "funds", Subject: "AAPL"}); err == nil {
		t.Fatal("failed history read ignored")
	}
}
func TestFundHistoryReplacesSamePointAndBoundsPeriods(t *testing.T) {
	old := []Record{}
	for year := 2020; year <= 2025; year++ {
		for q := 1; q <= 4; q++ {
			old = append(old, Record{"recordKind": "holding", "holderKind": "institution", "holderId": "same", "name": "Same", "shares": 100, "reportDate": fmt.Sprintf("%d-%02d-28", year, q*3), "current": true})
		}
	}
	current := []Record{{"recordKind": "holding", "holderKind": "institution", "holderId": "same", "name": "Same", "shares": 150, "reportDate": "2025-12-28", "current": true}}
	got := mergeFundHistory(current, old)
	if len(got) != 20 || got[0]["shares"] != 150 || got[1]["current"] != false || old[0]["current"] != true {
		t.Fatal("history replacement/bounds mutated", got)
	}
}

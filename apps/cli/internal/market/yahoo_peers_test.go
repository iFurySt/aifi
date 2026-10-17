package market

import (
	"context"
	"net/http"
	"testing"
)

func TestYahooRelatedSymbolsValidateIdentityAndPreserveEmptyCoverage(t *testing.T) {
	for _, tc := range []struct {
		name, body string
		count      int
		fails      bool
	}{
		{"valid", `{"finance":{"error":null,"result":[{"symbol":"AAPL","recommendedSymbols":[{"symbol":"AAPL","score":1},{"symbol":"MSFT","score":0.2},{"symbol":"MSFT","score":0.1},{"symbol":"AMZN","score":0.15}]}]}}`, 2, false},
		{"empty", `{"finance":{"error":null,"result":[{"symbol":"AAPL","recommendedSymbols":[]}]}}`, 0, false},
		{"wrong issuer", `{"finance":{"result":[{"symbol":"MSFT","recommendedSymbols":[]}]}}`, 0, true},
		{"missing list", `{"finance":{"result":[{"symbol":"AAPL"}]}}`, 0, true},
		{"invalid score", `{"finance":{"result":[{"symbol":"AAPL","recommendedSymbols":[{"symbol":"MSFT","score":2}]}]}}`, 0, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			c := testClient(t, func(r *http.Request) (int, string) {
				if r.URL.Path != "/v6/finance/recommendationsbysymbol/AAPL" {
					t.Fatal(r.URL)
				}
				return 200, tc.body
			})
			result, err := c.Collect(context.Background(), Job{Provider: "yahoo", Dataset: "peers", Subject: "AAPL"})
			if (err != nil) != tc.fails || (err == nil && len(result.Payload.Records) != tc.count) {
				t.Fatal(Marshal(result), err)
			}
		})
	}
}

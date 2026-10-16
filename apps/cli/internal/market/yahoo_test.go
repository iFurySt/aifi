package market

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"
)

func yahooFixture(symbol string, times string, closes string) string {
	return fmt.Sprintf(`{"chart":{"error":null,"result":[{"meta":{"symbol":%q,"currency":"USD","exchangeTimezoneName":"America/New_York"},"timestamp":%s,"indicators":{"quote":[{"open":[100,100,100],"high":[110,110,110],"low":[90,90,90],"close":%s,"volume":[1000,1000,1000]}],"adjclose":[{"adjclose":[80,80,80]}]}}]}}`, symbol, times, closes)
}
func TestYahooKeylessClosedSessionsAndBasis(t *testing.T) {
	calls := 0
	c := testClient(t, func(r *http.Request) (int, string) {
		calls++
		if r.Host != "query1.finance.yahoo.com" || !strings.HasSuffix(r.URL.Path, "/OTHER-B") || r.Header.Get("Authorization") != "" || r.URL.Query().Get("apikey") != "" {
			t.Fatal("wrong keyless request", r.URL)
		}
		// Last point is today's intraday bar, second point has a missing close.
		return 200, yahooFixture("OTHER-B", "[1791898200,1791984600,1792071000]", "[105,null,106]")
	})
	c.Now = func() time.Time { return time.Date(2026, 10, 15, 20, 0, 0, 0, time.UTC) }
	c.Key = func(context.Context, string) (map[string]string, error) { return map[string]string{}, nil }
	r, err := c.Collect(context.Background(), Job{Provider: "yahoo", Dataset: "prices", Subject: "OTHER.B"})
	if err != nil || calls != 1 || len(r.Bars) != 1 || r.Bars[0].Close != 105 || r.Basis != "split-adjusted" || r.Bars[0].Symbol != "OTHER.B" || len(r.Evidence) != 1 {
		t.Fatal(Marshal(r), err)
	}
	c.HTTP = testClient(t, func(*http.Request) (int, string) {
		return 200, `{"chart":{"error":{"code":"Not Found"},"result":null}}`
	}).HTTP
	if _, err = c.Collect(context.Background(), Job{Provider: "yahoo", Dataset: "prices", Subject: "MISSING"}); err == nil || err.Error() != "not_found" {
		t.Fatal(err)
	}
}
func TestYahooRejectWrongSymbolAndMalformedArrays(t *testing.T) {
	for _, body := range []string{yahooFixture("WRONG", "[1791898200,1791984600,1792071000]", "[105,106,107]"), yahooFixture("AAPL", "[1791898200]", "[105]")} {
		c := testClient(t, func(*http.Request) (int, string) { return 200, body })
		if _, err := c.Collect(context.Background(), Job{Provider: "yahoo", Dataset: "prices", Subject: "AAPL"}); err == nil {
			t.Fatal("invalid chart accepted")
		}
	}
}

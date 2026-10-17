package market

import (
	"context"
	"net/http"
	"net/url"
	"testing"
	"time"
)

func TestCongressKeylessStagingAndAmbiguousLines(t *testing.T) {
	calls := 0
	trade := Record{"member": "Example Member", "chamber": "House", "trade_type": "buy", "amount": "$1,001 - $15,000", "tx_date": "2026-10-01", "disclosed": "2026-10-02", "asset": "Example Common Stock", "ticker": "TEST", "link": "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/123456.pdf"}
	second := Record{}
	for k, v := range trade {
		second[k] = v
	}
	second["asset"] = "OCR Example Common Stock [ST]"
	c := testClient(t, func(r *http.Request) (int, string) {
		calls++
		if r.URL.Host != congressHost || r.Header.Get("Authorization") != "" || r.URL.Query().Get("apikey") != "" {
			t.Fatal("credential escaped", r.URL)
		}
		return 200, Marshal(Record{"ticker": "TEST", "offset": 0, "limit": 100, "total": 2, "has_more": false, "cache_loading": false, "last_updated": "2026-10-14T00:00:00Z", "trades": []Record{trade, second}})
	})
	c.Key = func(context.Context, string) (map[string]string, error) { return map[string]string{}, nil }
	cache := map[string]Evidence{}
	c.ReadStage = func(_ context.Context, key string) (*Evidence, error) {
		if e, ok := cache[key]; ok {
			return &e, nil
		}
		return nil, nil
	}
	c.SaveStage = func(_ context.Context, key string, e Evidence) error { cache[key] = e; return nil }
	for i := 0; i < 2; i++ {
		r, e := c.Collect(context.Background(), Job{Provider: "congress", Dataset: "politicians", Subject: "TEST"})
		if e != nil || len(r.Payload.Records) != 2 || r.Payload.Records[0]["ambiguousDuplicate"] != true || r.Payload.Records[0]["amountMin"] != int64(1001) {
			t.Fatal(Marshal(r), e)
		}
	}
	if calls != 1 {
		t.Fatal("staged reads fetched again", calls)
	}
}
func TestCongressStrictIdentityDatesAndRoutes(t *testing.T) {
	now := time.Date(2026, 10, 18, 0, 0, 0, 0, time.UTC)
	r := Record{"member": "Example", "chamber": "Senate", "ticker": "TEST", "trade_type": "sell", "amount": "$1,001 - $15,000", "tx_date": "2026-09-01", "disclosed": "2026-09-02", "link": "https://efdsearch.senate.gov/search/view/ptr/12345678-1234-1234-1234-123456789abc/"}
	if _, e := normalizeCongressTrade(map[string]any(r), "TEST", now); e != nil {
		t.Fatal(e)
	}
	for key, v := range map[string]string{"ticker": "OTHER", "tx_date": "2026-12-01", "link": "https://evil.example/record.pdf", "amount": "$20,000 - $1,000"} {
		changed := Record{}
		for k, x := range r {
			changed[k] = x
		}
		changed[key] = v
		if _, e := normalizeCongressTrade(map[string]any(changed), "TEST", now); e == nil {
			t.Fatal("invalid row accepted", key)
		}
	}
	for _, raw := range []string{"https://" + congressHost + "/trades/TEST?limit=100&offset=0", "https://" + congressHost + "/trades/TEST?limit=100&offset=100"} {
		u, _ := url.Parse(raw)
		if !validCongressEndpoint(u) {
			t.Fatal(raw)
		}
	}
	for _, raw := range []string{"https://evil.example/trades/TEST?limit=100&offset=0", "https://" + congressHost + "/trades/TEST?limit=100&offset=2000", "https://" + congressHost + "/trades/TEST?limit=100&offset=0&url=secret"} {
		u, _ := url.Parse(raw)
		if validCongressEndpoint(u) {
			t.Fatal(raw)
		}
	}
}

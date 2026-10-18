package market

import (
	"context"
	"net/http"
	"net/url"
	"strings"
	"testing"
)

func TestNasdaqKeylessIdentityAndMissingFields(t *testing.T) {
	body := `{"data":{"Symbol":{"value":"A"},"CompanyName":{"value":"Agilent"},"CompanyDescription":{"value":"Laboratory instruments"},"Sector":{"value":"Industrials"}}}`
	calls, gates := 0, 0
	c := testClient(t, func(r *http.Request) (int, string) {
		calls++
		if r.URL.Host != "api.nasdaq.com" || r.Header.Get("Authorization") != "" || r.Header.Get("Cookie") != "" || r.URL.RawQuery != "" || !strings.HasPrefix(r.Header.Get("User-Agent"), "AIFi/") {
			t.Fatal("unsafe request")
		}
		return 200, body
	})
	c.Gate = func(_ context.Context, p string) error {
		if p != "nasdaq" {
			t.Fatal(p)
		}
		gates++
		return nil
	}
	r, err := c.Collect(context.Background(), Job{Provider: "nasdaq", Dataset: "profile", Subject: "A"})
	if err != nil || r.Payload.Profile.Description == "" || r.Payload.Profile.Country != "" || r.Payload.Complete || len(r.Evidence) != 1 || calls != gates {
		t.Fatal(r, err, calls, gates)
	}
	body = strings.Replace(body, `"value":"A"`, `"value":"AA"`, 1)
	if _, err = c.Collect(context.Background(), Job{Provider: "nasdaq", Dataset: "profile", Subject: "A"}); err == nil {
		t.Fatal("wrong identity accepted")
	}
	body = `{"data":{"symbol":"a","consensusOverview":{"lowPriceTarget":150,"highPriceTarget":196,"priceTarget":183.14,"buy":11,"hold":3,"sell":0}}}`
	r, err = c.Collect(context.Background(), Job{Provider: "nasdaq", Dataset: "analyst", Subject: "A"})
	if err != nil || len(r.Payload.Records) != 1 || r.Payload.Records[0]["targetConsensus"] != 183.14 || r.Payload.Records[0]["analystCount"] != float64(14) || r.Payload.Records[0]["strongBuy"] != nil {
		t.Fatal(r, err)
	}
	for _, bad := range []string{`{"data":null}`, strings.Replace(body, `"priceTarget":183.14`, `"priceTarget":200`, 1), strings.Replace(body, `"symbol":"a"`, `"symbol":"b"`, 1), `{"status":{"rCode":500},"data":{"symbol":"a"}}`} {
		body = bad
		if _, err = c.Collect(context.Background(), Job{Provider: "nasdaq", Dataset: "analyst", Subject: "A"}); err == nil {
			t.Fatal("invalid consensus accepted", bad)
		}
	}
	for _, raw := range []string{"https://api.nasdaq.com/api/company/A/company-profile?token=x", "https://evil.invalid/api/company/A/company-profile", "https://api.nasdaq.com/api/company/../company-profile", "https://api.nasdaq.com/api/analyst/A/other"} {
		u, _ := url.Parse(raw)
		if validNasdaqEndpoint(u) {
			t.Fatal(raw)
		}
	}
}

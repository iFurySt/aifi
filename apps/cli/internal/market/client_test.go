package market

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"
)

type roundTrip func(*http.Request) (*http.Response, error)

func (f roundTrip) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func testClient(t *testing.T, reply func(*http.Request) (int, string)) *Client {
	t.Helper()
	c := NewClient()
	c.Now = func() time.Time { return time.Date(2026, 10, 15, 0, 0, 0, 0, time.UTC) }
	c.Key = func(context.Context, string) (map[string]string, error) {
		return map[string]string{"apiKey": "PRIVATE_KEY"}, nil
	}
	c.SECContact = func(context.Context) (string, error) { return "AIFi test contact@example.invalid", nil }
	c.HTTP = &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
		status, body := reply(r)
		return &http.Response{StatusCode: status, Body: io.NopCloser(strings.NewReader(body)), Header: http.Header{}}, nil
	})}
	return c
}
func TestDailyBatchAuthAndValidation(t *testing.T) {
	calls := 0
	c := testClient(t, func(r *http.Request) (int, string) {
		calls++
		if r.Header.Get("Authorization") != "Bearer PRIVATE_KEY" || r.URL.Query().Get("adjusted") != "false" || r.URL.Query().Get("apiKey") != "" {
			t.Fatal("unsafe auth/basis")
		}
		return 200, `{"status":"OK","adjusted":false,"results":[{"T":"AAPL","o":100,"h":110,"l":99,"c":105,"v":12,"t":1791936000000}]}`
	})
	// Use an explicit source timestamp, never the fetching machine's date.
	c.HTTP.Transport = roundTrip(func(r *http.Request) (*http.Response, error) {
		calls++
		raw := fmt.Sprintf(`{"status":"OK","adjusted":false,"results":[{"T":"AAPL","o":100,"h":110,"l":99,"c":105,"v":12,"t":%d}]}`, time.Date(2026, 10, 14, 4, 0, 0, 0, time.UTC).UnixMilli())
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(raw)), Header: http.Header{}}, nil
	})
	r, e := c.Collect(context.Background(), Job{Provider: "massive", Dataset: "prices", Subject: "2026-10-14"})
	if e != nil || len(r.Bars) != 1 || r.Bars[0].Date != "2026-10-14" || calls != 1 {
		t.Fatal(r, e)
	}
	if strings.Contains(r.Evidence[0].URL, "PRIVATE_KEY") {
		t.Fatal("secret in evidence")
	}
	if _, e = c.Collect(context.Background(), Job{Dataset: "prices", Subject: "bad"}); e == nil {
		t.Fatal("invalid date fetched")
	}
}
func TestErrorsAndFMPNoSecretEvidence(t *testing.T) {
	c := testClient(t, func(r *http.Request) (int, string) {
		if r.URL.Query().Get("apikey") != "PRIVATE_KEY" {
			t.Fatal("missing key")
		}
		return 200, `[{"symbol":"AAPL","rating":"Buy"}]`
	})
	r, e := c.Collect(context.Background(), Job{Provider: "fmp", Dataset: "analyst", Subject: "AAPL"})
	if e != nil || len(r.Payload.Records) != 2 {
		t.Fatal(e)
	}
	for _, ev := range r.Evidence {
		if strings.Contains(ev.URL, "PRIVATE_KEY") || strings.Contains(ev.URL, "apikey") {
			t.Fatal("key leaked")
		}
	}
	c = testClient(t, func(*http.Request) (int, string) { return 403, `PRIVATE_KEY provider echoed it` })
	_, e = c.Collect(context.Background(), Job{Dataset: "profile", Subject: "AAPL"})
	if e == nil || e.Error() != "access_denied" {
		t.Fatal("unsafe error", e)
	}
	c = testClient(t, func(*http.Request) (int, string) { return 200, `{"Error Message":"Invalid PRIVATE_KEY"}` })
	if _, e = c.Collect(context.Background(), Job{Dataset: "analyst", Subject: "AAPL"}); e == nil || strings.Contains(e.Error(), "PRIVATE") {
		t.Fatal("provider error object accepted", e)
	}
}
func TestFactsRestatementsDecimalAndMissingSegments(t *testing.T) {
	c := testClient(t, func(*http.Request) (int, string) {
		return 200, `{"entityName":"Apple","facts":{"us-gaap":{"NetIncomeLoss":{"units":{"USD":[{"val":100,"start":"2025-10-01","end":"2026-09-30","filed":"2026-10-01","accn":"old","fy":2026,"fp":"FY","form":"10-K"},{"val":101,"start":"2025-10-01","end":"2026-09-30","filed":"2026-10-10","accn":"amended","fy":2026,"fp":"FY","form":"10-K/A"}]}}}}}`
	})
	r, e := c.Collect(context.Background(), Job{Dataset: "facts", Subject: "cik:0000320193"})
	if e != nil || len(r.Payload.Facts) != 1 || r.Payload.Facts[0].Value != "101" || r.Payload.Facts[0].Accession != "amended" || r.Payload.Complete {
		t.Fatal(r, e)
	}
}
func TestUnsafePaginationAndPartialActionsFail(t *testing.T) {
	c := testClient(t, func(*http.Request) (int, string) {
		return 200, `{"status":"OK","results":[],"next_url":"https://evil.invalid/steal"}`
	})
	if _, e := c.Collect(context.Background(), Job{Dataset: "actions", Subject: "AAPL"}); e == nil || e.Error() != "invalid_pagination" {
		t.Fatal(e)
	}
}
func TestSECInsiderXMLUsesStoredSubmissionEvidence(t *testing.T) {
	c := testClient(t, func(r *http.Request) (int, string) {
		if strings.Contains(r.URL.Path, "xslF345") {
			t.Fatal("HTML transform fetched")
		}
		return 200, `<ownershipDocument><issuer><issuerCik>320193</issuerCik></issuer><reportingOwner><reportingOwnerId><rptOwnerName>Example</rptOwnerName></reportingOwnerId><reportingOwnerRelationship><officerTitle>Officer</officerTitle></reportingOwnerRelationship></reportingOwner><nonDerivativeTable><nonDerivativeTransaction><transactionDate><value>2026-10-12</value></transactionDate><transactionCoding><transactionCode>F</transactionCode></transactionCoding><transactionAmounts><transactionShares><value>10</value></transactionShares><transactionPricePerShare><value>100</value></transactionPricePerShare></transactionAmounts></nonDerivativeTransaction></nonDerivativeTable></ownershipDocument>`
	})
	c.ReadPayload = func(context.Context, string, string) (Payload, error) {
		return Payload{Filings: []Filing{{Form: "4", URL: "https://www.sec.gov/Archives/edgar/data/320193/abc/xslF345X05/form4.xml"}}}, nil
	}
	c.ReadEvidence = func(context.Context, string, string) ([]Evidence, error) {
		return []Evidence{{URL: "https://data.sec.gov/submissions/CIK0000320193.json", Body: []byte(`{"original":true}`)}}, nil
	}
	r, e := c.Collect(context.Background(), Job{Provider: "sec", Dataset: "insiders", Subject: "cik:0000320193"})
	if e != nil || len(r.Payload.Records) != 1 || r.Payload.Records[0]["code"] != "F" || len(r.Evidence) != 2 {
		t.Fatal(r, e)
	}
}

func TestFundPagesResumeWithoutPublishingPartialHoldings(t *testing.T) {
	stage := map[string]Evidence{}
	fail := true
	requests := map[string]int{}
	c := testClient(t, func(r *http.Request) (int, string) {
		page := r.URL.Query().Get("page")
		requests[page]++
		switch page {
		case "0":
			return 200, `[{"investorName":"Fund A","sharesNumber":10}]`
		case "1":
			return 200, `[{"investorName":"Fund B","sharesNumber":20}]`
		case "2":
			if fail {
				return 429, `rate limit`
			}
			return 200, `[]`
		}
		t.Fatal("unexpected page", page)
		return 500, ""
	})
	c.ReadStage = func(_ context.Context, k string) (*Evidence, error) {
		v, ok := stage[k]
		if !ok {
			return nil, nil
		}
		return &v, nil
	}
	c.SaveStage = func(_ context.Context, k string, v Evidence) error { stage[k] = v; return nil }
	job := Job{Provider: "fmp", Dataset: "funds", Subject: "AAPL", Window: "2026-06-30"}
	if _, e := c.Collect(context.Background(), job); e == nil {
		t.Fatal("partial page window accepted")
	}
	if len(stage) != 1 {
		t.Fatal("completed page not checkpointed")
	}
	fail = false
	r, e := c.Collect(context.Background(), job)
	if e != nil || len(r.Payload.Records) != 2 || !r.Payload.Complete || requests["1"] != 1 || requests["0"] != 2 {
		t.Fatal("resume did not reuse validated page", e, requests)
	}
}

func TestMarketCapShareReferenceIsCompanyLevelNotSingleClass(t *testing.T) {
	c := testClient(t, func(*http.Request) (int, string) {
		return 200, `{"results":{"ticker":"CLASS.A","name":"Multi-class issuer","share_class_shares_outstanding":100,"weighted_shares_outstanding":1000}}`
	})
	r, e := c.Collect(context.Background(), Job{Dataset: "profile", Subject: "CLASS.A"})
	if e != nil || r.Payload.Profile.Shares == nil || *r.Payload.Profile.Shares != 1000 {
		t.Fatal("company market cap used one share class", e)
	}
}

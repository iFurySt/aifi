package market

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"
)

const ownershipFixture = `<ownershipDocument><documentType>4</documentType><issuer><issuerCik>123</issuerCik></issuer><reportingOwner><reportingOwnerId><rptOwnerName>Example Officer</rptOwnerName><rptOwnerCik>456</rptOwnerCik></reportingOwnerId><reportingOwnerRelationship><officerTitle>CEO</officerTitle></reportingOwnerRelationship></reportingOwner><nonDerivativeTable><nonDerivativeTransaction><securityTitle><value>Common stock</value></securityTitle><transactionDate><value>2026-10-01</value></transactionDate><transactionCoding><transactionCode>S</transactionCode></transactionCoding><transactionAmounts><transactionShares><value>10</value></transactionShares><transactionPricePerShare><value>12.50</value></transactionPricePerShare><transactionAcquiredDisposedCode><value>D</value></transactionAcquiredDisposedCode></transactionAmounts><postTransactionAmounts><sharesOwnedFollowingTransaction><value>90</value></sharesOwnedFollowingTransaction></postTransactionAmounts><ownershipNature><directOrIndirectOwnership><value>D</value></directOrIndirectOwnership></ownershipNature></nonDerivativeTransaction></nonDerivativeTable></ownershipDocument>`

func TestInsiderIssuerIdentityAndFilingPaths(t *testing.T) {
	if _, e := parseOwnership([]byte(ownershipFixture), "0000000123"); e != nil {
		t.Fatal(e)
	}
	if _, e := parseOwnership([]byte(ownershipFixture), "0000000999"); e == nil {
		t.Fatal("wrong issuer accepted")
	}
	f := Filing{Accession: "0000000123-26-000001", URL: "https://www.sec.gov/Archives/edgar/data/123/000000012326000001/xslF345X05/form4.xml"}
	u, e := insiderFilingURL(f, "0000000123")
	if e != nil || strings.Contains(u, "xslF345") {
		t.Fatal(u, e)
	}
	if _, e = insiderFilingURL(f, "0000000999"); e == nil {
		t.Fatal("wrong issuer path accepted")
	}
	f.URL += "?url=private"
	if _, e = insiderFilingURL(f, "0000000123"); e == nil {
		t.Fatal("query accepted")
	}
}
func TestInsiderBoundedHistoryAndPartialRetryStaging(t *testing.T) {
	calls := 0
	c := testClient(t, func(*http.Request) (int, string) { calls++; return 200, ownershipFixture })
	rows := []Filing{}
	for i := 0; i < 130; i++ {
		acc := fmt.Sprintf("0000000123-26-%06d", i)
		rows = append(rows, Filing{Form: "4", Filed: "2026-10-02", Accession: acc, URL: fmt.Sprintf("https://www.sec.gov/Archives/edgar/data/123/%s/form4.xml", strings.ReplaceAll(acc, "-", ""))})
	}
	c.ReadPayload = func(context.Context, string, string) (Payload, error) { return Payload{Filings: rows}, nil }
	c.ReadEvidence = func(context.Context, string, string) ([]Evidence, error) {
		return []Evidence{{URL: "https://data.sec.gov/submissions/CIK0000000123.json", Body: []byte(`{}`), FetchedAt: time.Now()}}, nil
	}
	stages := map[string]Evidence{}
	c.ReadStage = func(_ context.Context, k string) (*Evidence, error) {
		if v, ok := stages[k]; ok {
			return &v, nil
		}
		return nil, nil
	}
	c.SaveStage = func(_ context.Context, k string, v Evidence) error { stages[k] = v; return nil }
	for i := 0; i < 2; i++ {
		r, e := c.Collect(context.Background(), Job{Provider: "sec", Dataset: "insiders", Subject: "cik:0000000123", Window: "forms:120"})
		if e != nil || len(r.Payload.Records) != 120 || r.Payload.Version != 2 || r.Payload.Records[0]["sharesAfter"] != "90" || r.Payload.Records[0]["ownership"] != "D" {
			t.Fatal(e, Marshal(r))
		}
	}
	if calls != 120 {
		t.Fatal("retry did not reuse staged XML", calls)
	}
}
func TestInsiderAmendmentDoesNotDoubleCountOriginal(t *testing.T) {
	c := testClient(t, func(r *http.Request) (int, string) {
		if strings.Contains(r.URL.Path, "000000012326000002") {
			return 200, strings.Replace(ownershipFixture, "<documentType>4</documentType>", "<documentType>4/A</documentType><dateOfOriginalSubmission>2026-10-02</dateOfOriginalSubmission>", 1)
		}
		return 200, ownershipFixture
	})
	c.ReadPayload = func(context.Context, string, string) (Payload, error) {
		return Payload{Filings: []Filing{{Form: "4", Filed: "2026-10-02", Accession: "0000000123-26-000001", URL: "https://www.sec.gov/Archives/edgar/data/123/000000012326000001/form4.xml"}, {Form: "4/A", Filed: "2026-10-03", Accession: "0000000123-26-000002", URL: "https://www.sec.gov/Archives/edgar/data/123/000000012326000002/form4.xml"}}}, nil
	}
	c.ReadEvidence = func(context.Context, string, string) ([]Evidence, error) { return nil, nil }
	r, e := c.Collect(context.Background(), Job{Provider: "sec", Dataset: "insiders", Subject: "cik:0000000123"})
	if e != nil || len(r.Payload.Records) != 2 || r.Payload.Records[0]["amendment"] != true || r.Payload.Records[1]["superseded"] != true {
		t.Fatal(e, Marshal(r))
	}
}

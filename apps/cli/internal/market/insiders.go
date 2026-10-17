package market

import (
	"context"
	"encoding/xml"
	"fmt"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

type ownershipDocument struct {
	XMLName            xml.Name `xml:"ownershipDocument"`
	Type               string   `xml:"documentType"`
	OriginalSubmission string   `xml:"dateOfOriginalSubmission"`
	Plan               string   `xml:"aff10b5One"`
	Issuer             struct {
		CIK string `xml:"issuerCik"`
	} `xml:"issuer"`
	Owners []struct {
		Identity struct {
			Name string `xml:"rptOwnerName"`
			CIK  string `xml:"rptOwnerCik"`
		} `xml:"reportingOwnerId"`
		Relationship struct {
			Director   string `xml:"isDirector"`
			Officer    string `xml:"isOfficer"`
			Title      string `xml:"officerTitle"`
			TenPercent string `xml:"isTenPercentOwner"`
		} `xml:"reportingOwnerRelationship"`
	} `xml:"reportingOwner"`
	NonDerivative []insiderTransaction `xml:"nonDerivativeTable>nonDerivativeTransaction"`
	Derivative    []insiderTransaction `xml:"derivativeTable>derivativeTransaction"`
}
type insiderTransaction struct {
	After            string `xml:"postTransactionAmounts>sharesOwnedFollowingTransaction>value"`
	Ownership        string `xml:"ownershipNature>directOrIndirectOwnership>value"`
	Security         string `xml:"securityTitle>value"`
	Date             string `xml:"transactionDate>value"`
	Code             string `xml:"transactionCoding>transactionCode"`
	Shares           string `xml:"transactionAmounts>transactionShares>value"`
	Price            string `xml:"transactionAmounts>transactionPricePerShare>value"`
	AcquiredDisposed string `xml:"transactionAmounts>transactionAcquiredDisposedCode>value"`
}

var insiderWindow = regexp.MustCompile(`^forms:(40|120|240)$`)

func insiderLimit(window string) (int, error) {
	if window == "" {
		return 120, nil
	}
	match := insiderWindow.FindStringSubmatch(window)
	if match == nil {
		return 0, &Failure{Code: "invalid_insider_window"}
	}
	n, _ := strconv.Atoi(match[1])
	return n, nil
}
func insiderFilingURL(f Filing, cik string) (string, error) {
	u, e := url.Parse(f.URL)
	if e != nil || u.Scheme != "https" || u.Host != "www.sec.gov" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || !accessionPattern.MatchString(f.Accession) {
		return "", &Failure{Code: "invalid_filing_url"}
	}
	n, e := strconv.ParseInt(cik, 10, 64)
	if e != nil {
		return "", &Failure{Code: "unmapped"}
	}
	prefix := fmt.Sprintf("/Archives/edgar/data/%d/%s/", n, strings.ReplaceAll(f.Accession, "-", ""))
	if !strings.HasPrefix(u.Path, prefix) {
		return "", &Failure{Code: "invalid_filing_url"}
	}
	doc := strings.TrimPrefix(u.Path, prefix)
	parts := strings.Split(doc, "/")
	if len(parts) == 2 && regexp.MustCompile(`^xslF345X[0-9]+$`).MatchString(parts[0]) {
		doc = parts[1]
	}
	if !regexp.MustCompile(`^[a-zA-Z0-9_.-]+\.xml$`).MatchString(doc) || strings.Contains(doc, "..") {
		return "", &Failure{Code: "invalid_filing_url"}
	}
	u.Path = prefix + doc
	return u.String(), nil
}
func parseOwnership(raw []byte, cik string) (ownershipDocument, error) {
	var doc ownershipDocument
	if xml.Unmarshal(raw, &doc) != nil || (doc.Type != "4" && doc.Type != "4/A") || len(doc.Owners) == 0 {
		return doc, &Failure{Code: "invalid_ownership_xml"}
	}
	n, e := strconv.ParseInt(doc.Issuer.CIK, 10, 64)
	if e != nil || fmt.Sprintf("%010d", n) != cik {
		return doc, &Failure{Code: "invalid_ownership_identity"}
	}
	return doc, nil
}
func (c *Client) insiders(ctx context.Context, j Job, r *Result) error {
	cik := strings.TrimPrefix(j.Subject, "cik:")
	if !cikPattern.MatchString(cik) {
		return &Failure{Code: "unmapped"}
	}
	limit, e := insiderLimit(j.Window)
	if e != nil {
		return e
	}
	payload, e := c.ReadPayload(ctx, "filings", j.Subject)
	if e != nil {
		return e
	}
	if len(payload.Filings) == 0 {
		return &Failure{Code: "waiting_filings"}
	}
	filings := append([]Filing{}, payload.Filings...)
	sort.SliceStable(filings, func(i, k int) bool {
		if filings[i].Filed != filings[k].Filed {
			return filings[i].Filed > filings[k].Filed
		}
		return filings[i].Accession > filings[k].Accession
	})
	count := 0
	for _, f := range filings {
		if f.Form != "4" && f.Form != "4/A" {
			continue
		}
		if count >= limit {
			break
		}
		if !validDate(f.Filed) || f.Filed > c.Now().UTC().Format("2006-01-02") {
			return &Failure{Code: "invalid_filing_date"}
		}
		endpoint, e := insiderFilingURL(f, cik)
		if e != nil {
			return e
		}
		key := "sec-form4-v2:" + endpoint
		var cached *Evidence
		if c.ReadArchive != nil {
			cached, e = c.ReadArchive(ctx, endpoint)
			if e != nil {
				return e
			}
		}
		if cached == nil && c.ReadStage != nil {
			cached, e = c.ReadStage(ctx, key)
			if e != nil {
				return e
			}
		}
		var raw []byte
		if cached != nil && cached.URL == endpoint {
			raw = cached.Body
			r.Evidence = append(r.Evidence, *cached)
		} else {
			raw, e = c.getXML(ctx, endpoint, &r.Evidence)
			if e != nil {
				return e
			}
		}
		doc, e := parseOwnership(raw, cik)
		if e != nil {
			return e
		}
		if c.SaveStage != nil {
			if e = c.SaveStage(ctx, key, r.Evidence[len(r.Evidence)-1]); e != nil {
				return e
			}
		}
		owners, roles, ownerCiks := []string{}, []string{}, []string{}
		for _, o := range doc.Owners {
			if strings.TrimSpace(o.Identity.Name) == "" {
				return &Failure{Code: "invalid_ownership_xml"}
			}
			owners = append(owners, o.Identity.Name)
			if n, e := strconv.ParseInt(o.Identity.CIK, 10, 64); e == nil && n > 0 {
				ownerCiks = append(ownerCiks, fmt.Sprintf("%010d", n))
			}
			role := o.Relationship.Title
			if role == "" && (o.Relationship.Director == "1" || o.Relationship.Director == "true") {
				role = "Director"
			}
			if role == "" && (o.Relationship.TenPercent == "1" || o.Relationship.TenPercent == "true") {
				role = "10% owner"
			}
			roles = append(roles, role)
		}
		for _, group := range []struct {
			kind  string
			items []insiderTransaction
		}{{"nonDerivative", doc.NonDerivative}, {"derivative", doc.Derivative}} {
			for index, t := range group.items {
				if !validDate(t.Date) || t.Date > f.Filed {
					continue
				}
				rec := Record{"recordKind": "insider-transaction", "id": f.Accession + ":" + group.kind + ":" + strconv.Itoa(index), "issuerCik": cik, "ownerCiks": ownerCiks, "name": strings.Join(owners, " / "), "role": strings.Join(roles, " / "), "date": t.Date, "filed": f.Filed, "code": t.Code, "shares": t.Shares, "price": t.Price, "sharesAfter": t.After, "ownership": t.Ownership, "direction": t.AcquiredDisposed, "security": t.Security, "securityKind": group.kind, "accession": f.Accession, "row": index, "url": f.URL, "amendment": f.Form == "4/A", "plan10b5": doc.Plan == "1" || doc.Plan == "true"}
				if validDate(doc.OriginalSubmission) {
					rec["originalSubmissionDate"] = doc.OriginalSubmission
				}
				r.Payload.Records = append(r.Payload.Records, rec)
			}
		}
		count++
	}
	for _, amended := range r.Payload.Records {
		if amended["amendment"] != true {
			continue
		}
		for _, original := range r.Payload.Records {
			if original["amendment"] == true || original["name"] != amended["name"] {
				continue
			}
			sameFiling := text(amended["originalSubmissionDate"]) != "" && original["filed"] == amended["originalSubmissionDate"]
			sameTransaction := original["date"] == amended["date"] && original["security"] == amended["security"] && original["code"] == amended["code"]
			if sameFiling || sameTransaction {
				original["superseded"] = true
			}
		}
	}
	evidence, e := c.ReadEvidence(ctx, "filings", j.Subject)
	if e != nil {
		return e
	}
	r.Evidence = append(r.Evidence, evidence...)
	r.Payload.Version = 2
	r.Payload.Window = fmt.Sprintf("Latest %d of up to %d Form 4/4-A filings from cached SEC recent submissions. Non-derivative P/S purchases/sales are separate from awards, exercises, withholding and derivatives. Amendments and potentially superseded originals are excluded from chart totals. Older submission archives are not imported.", count, limit)
	r.Payload.Complete = false
	return nil
}

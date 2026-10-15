package market

import (
	"context"
	"encoding/xml"
	"net/url"
	"strings"
)

type ownershipDocument struct {
	Issuer struct {
		CIK string `xml:"issuerCik"`
	} `xml:"issuer"`
	Owners []struct {
		Identity struct {
			Name string `xml:"rptOwnerName"`
		} `xml:"reportingOwnerId"`
		Relationship struct {
			Director string `xml:"isDirector"`
			Officer  string `xml:"isOfficer"`
			Title    string `xml:"officerTitle"`
		} `xml:"reportingOwnerRelationship"`
	} `xml:"reportingOwner"`
	NonDerivative []insiderTransaction `xml:"nonDerivativeTable>nonDerivativeTransaction"`
	Derivative    []insiderTransaction `xml:"derivativeTable>derivativeTransaction"`
}
type insiderTransaction struct {
	Security         string `xml:"securityTitle>value"`
	Date             string `xml:"transactionDate>value"`
	Code             string `xml:"transactionCoding>transactionCode"`
	Shares           string `xml:"transactionAmounts>transactionShares>value"`
	Price            string `xml:"transactionAmounts>transactionPricePerShare>value"`
	AcquiredDisposed string `xml:"transactionAmounts>transactionAcquiredDisposedCode>value"`
}

func (c *Client) insiders(ctx context.Context, j Job, r *Result) error {
	payload, e := c.ReadPayload(ctx, "filings", j.Subject)
	if e != nil {
		return e
	}
	if len(payload.Filings) == 0 {
		return &Failure{Code: "waiting_filings"}
	}
	count := 0
	for _, f := range payload.Filings {
		if f.Form != "4" && f.Form != "4/A" {
			continue
		}
		if count >= 40 {
			break
		}
		u, e := url.Parse(f.URL)
		if e != nil || u.Host != "www.sec.gov" {
			return &Failure{Code: "invalid_filing_url"}
		}
		parts := strings.Split(u.Path, "/")
		clean := []string{}
		for _, v := range parts {
			if strings.HasPrefix(v, "xslF345") {
				continue
			}
			clean = append(clean, v)
		}
		u.Path = strings.Join(clean, "/")
		raw, e := c.getXML(ctx, u.String(), &r.Evidence)
		if e != nil {
			return e
		}
		var doc ownershipDocument
		if xml.Unmarshal(raw, &doc) != nil || doc.Issuer.CIK == "" {
			return &Failure{Code: "invalid_ownership_xml"}
		}
		owners := []string{}
		roles := []string{}
		for _, o := range doc.Owners {
			owners = append(owners, o.Identity.Name)
			role := o.Relationship.Title
			if role == "" && o.Relationship.Director == "1" {
				role = "Director"
			}
			roles = append(roles, role)
		}
		for kind, items := range map[string][]insiderTransaction{"nonDerivative": doc.NonDerivative, "derivative": doc.Derivative} {
			for index, t := range items {
				if !validDate(t.Date) {
					continue
				}
				r.Payload.Records = append(r.Payload.Records, Record{"name": strings.Join(owners, " / "), "role": strings.Join(roles, " / "), "date": t.Date, "filed": f.Filed, "code": t.Code, "shares": t.Shares, "price": t.Price, "direction": t.AcquiredDisposed, "security": t.Security, "securityKind": kind, "accession": f.Accession, "row": index, "url": f.URL, "amendment": f.Form == "4/A"})
			}
		}
		count++
	}

	evidence, e := c.ReadEvidence(ctx, "filings", j.Subject)
	if e != nil {
		return e
	}
	r.Evidence = append(r.Evidence, evidence...)

	r.Payload.Window = "Latest 40 Form 4/4-A filings in cached SEC recent submissions"
	r.Payload.Complete = false
	return nil
}

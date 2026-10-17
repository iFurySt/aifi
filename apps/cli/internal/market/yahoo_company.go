package market

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
)

// These are public page data, not authenticated quoteSummary API responses.
// Execute no page scripts, follow no embedded URLs, and retain only the JSON
// response embedded in the matching public page as immutable source evidence.
var publicScripts = regexp.MustCompile(`(?is)<script\b([^>]*)>(.*?)</script\s*>`)
var yahooFilingID = regexp.MustCompile(`^([0-9]{10}-[0-9]{2}-[0-9]{6})_([0-9]{1,10})$`)

func yahooTicker(symbol string) (string, error) {
	if !yahooSymbol.MatchString(symbol) {
		return "", &Failure{Code: "unsupported_symbol"}
	}
	return strings.ReplaceAll(symbol, ".", "-"), nil
}
func companyJSON(raw []byte, symbol string) (map[string]any, error) {
	var root map[string]any
	if err := decodeJSON(raw, &root); err != nil {
		return nil, err
	}
	summary := object(root["quoteSummary"])
	rows := array(summary["result"])
	if summary["error"] != nil || len(rows) != 1 {
		return nil, &Failure{Code: "invalid_company_page"}
	}
	data := object(rows[0])
	price := object(data["price"])
	if text(price["symbol"]) != symbol || text(price["currency"]) != "USD" || text(price["quoteType"]) != "EQUITY" {
		return nil, &Failure{Code: "invalid_company_identity"}
	}
	return data, nil
}
func (c *Client) yahooPage(ctx context.Context, symbol string, r *Result, pages ...string) (map[string]any, error) {
	page := "profile"
	if len(pages) > 0 {
		page = pages[0]
	}
	if page != "profile" && page != "analysis" {
		return nil, &Failure{Code: "invalid_endpoint"}
	}
	endpoint := "https://finance.yahoo.com/quote/" + url.PathEscape(symbol) + "/" + page + "/"
	key := "yahoo-company-v1:" + symbol
	if page == "analysis" {
		key = "yahoo-analysis-v1:" + symbol
	}
	if c.ReadStage != nil {
		cached, err := c.ReadStage(ctx, key)
		if err != nil {
			return nil, err
		}
		if cached != nil && cached.URL == endpoint && c.Now().Sub(cached.FetchedAt) >= 0 && c.Now().Sub(cached.FetchedAt) < 24*time.Hour {
			data, err := companyJSON(cached.Body, symbol)
			if err == nil {
				r.Evidence = append(r.Evidence, *cached)
				return data, nil
			}
		}
	}
	var transient []Evidence
	raw, err := c.get(ctx, "yahoo", endpoint, &transient)
	if err != nil {
		return nil, err
	}
	var selected []byte
	var data map[string]any
	for _, script := range publicScripts.FindAllSubmatch(raw, -1) {
		attrs := string(script[1])
		if !strings.Contains(attrs, "application/json") || !strings.Contains(attrs, "data-sveltekit-fetched") || !strings.Contains(attrs, "/finance/quoteSummary/") {
			continue
		}
		var envelope struct {
			Status int    `json:"status"`
			Body   string `json:"body"`
		}
		if json.Unmarshal(script[2], &envelope) != nil || envelope.Status != 200 {
			continue
		}
		candidate, e := companyJSON([]byte(envelope.Body), symbol)
		if e != nil {
			continue
		}
		if selected != nil {
			return nil, &Failure{Code: "ambiguous_company_page"}
		}
		selected = []byte(envelope.Body)
		data = candidate
	}
	if selected == nil {
		return nil, &Failure{Code: "invalid_company_page"}
	}
	evidence := Evidence{URL: endpoint, Body: selected, FetchedAt: transient[0].FetchedAt}
	// Keep the public embedded financial response; discard page scripts/ads.
	if c.SaveStage != nil {
		if err = c.SaveStage(ctx, key, evidence); err != nil {
			return nil, err
		}
	}
	r.Evidence = append(r.Evidence, evidence)
	return data, nil
}
func (c *Client) yahooCompany(ctx context.Context, j Job, r *Result) error {
	symbol, err := yahooTicker(j.Subject)
	if err != nil {
		return err
	}
	data, err := c.yahooPage(ctx, symbol, r)
	if err != nil {
		return err
	}
	profile := object(data["assetProfile"])
	price := object(data["price"])
	name := text(price["longName"])
	if name == "" {
		name = text(price["shortName"])
	}
	if name == "" {
		return &Failure{Code: "invalid_profile"}
	}
	p := &Profile{Symbol: j.Subject, Name: name, Description: text(profile["longBusinessSummary"]), Industry: text(profile["industry"]), Sector: text(profile["sector"]), Country: text(profile["country"]), Currency: "USD", Type: "EQUITY"}
	if site := text(profile["website"]); site != "" {
		u, e := url.Parse(site)
		if e == nil && u.Scheme == "https" && u.Host != "" && u.User == nil {
			p.Website = site
		}
	}
	employees := number(profile["fullTimeEmployees"])
	if employees > 0 && employees < 1e8 && math.Trunc(employees) == employees {
		p.Employees = int(employees)
	}
	if len(p.Name) > 512 || len(p.Description) > 20000 || len(p.Industry) > 512 || len(p.Sector) > 256 || len(p.Country) > 128 || len(p.Website) > 2048 {
		return &Failure{Code: "invalid_profile"}
	}
	r.Payload.Profile = p
	r.Payload.Quote = publicPageQuote(data, c.Now())
	r.Payload.Complete = false
	if j.Dataset == "profile" {
		if p.Description == "" && p.Industry == "" {
			return &Failure{Code: "not_found"}
		}
		r.Payload.Window = "Yahoo public company profile; company-wide shares not supplied"
		return nil
	}
	filings, ok := object(data["secFilings"])["filings"].([]any)
	if !ok {
		return &Failure{Code: "not_found"}
	}
	if len(filings) > 1000 {
		return &Failure{Code: "source_window_too_large"}
	}
	seen := map[string]bool{}
	for _, item := range filings {
		f := object(item)
		filed := text(f["date"])
		form := text(f["type"])
		if !validDate(filed) || filed > c.Now().UTC().Format("2006-01-02") || form == "" || len(form) > 20 {
			continue
		}
		ref, e := url.Parse(text(f["edgarUrl"]))
		if e != nil || ref.Scheme != "https" || ref.Host != "finance.yahoo.com" || ref.User != nil || ref.RawQuery != "" || ref.Fragment != "" {
			continue
		}
		prefix := "/sec-filing/" + symbol + "/"
		if !strings.HasPrefix(ref.Path, prefix) {
			continue
		}
		parts := yahooFilingID.FindStringSubmatch(strings.TrimPrefix(ref.Path, prefix))
		if parts == nil {
			continue
		}
		accession := parts[1]
		n, e := strconv.ParseInt(parts[2], 10, 64)
		if e != nil || n <= 0 {
			continue
		}
		cik := fmt.Sprintf("%010d", n)
		if p.CIK != "" && p.CIK != cik {
			return &Failure{Code: "invalid_company_identity"}
		}
		p.CIK = cik
		if seen[accession] {
			continue
		}
		seen[accession] = true
		docURL := fmt.Sprintf("https://www.sec.gov/Archives/edgar/data/%d/%s/%s-index.html", n, strings.ReplaceAll(accession, "-", ""), accession)
		// Prefer the primary document only when its complete issuer/accession path
		// matches. No downloaded exhibit/HTML ever enters the renderer.
		for _, ex := range array(f["exhibits"]) {
			x := object(ex)
			if text(x["type"]) != form {
				continue
			}
			u, e := url.Parse(text(x["url"]))
			if e != nil || u.Scheme != "https" || u.Host != "cdn.yahoofinance.com" || u.User != nil || u.RawQuery != "" || u.Fragment != "" {
				continue
			}
			pathPrefix := "/prod/sec-filings/" + cik + "/" + strings.ReplaceAll(accession, "-", "") + "/"
			if !strings.HasPrefix(u.Path, pathPrefix) {
				continue
			}
			doc := strings.TrimPrefix(u.Path, pathPrefix)
			if doc == "" || strings.ContainsAny(doc, "/\\?#") || strings.Contains(doc, "..") {
				continue
			}
			docURL = fmt.Sprintf("https://www.sec.gov/Archives/edgar/data/%d/%s/%s", n, strings.ReplaceAll(accession, "-", ""), url.PathEscape(doc))
			break
		}
		r.Payload.Filings = append(r.Payload.Filings, Filing{Accession: accession, Form: form, Filed: filed, Title: text(f["title"]), URL: docURL})
	}
	if len(filings) > 0 && len(r.Payload.Filings) == 0 {
		return &Failure{Code: "invalid_filings"}
	}
	sort.Slice(r.Payload.Filings, func(i, j int) bool { return r.Payload.Filings[i].Filed > r.Payload.Filings[j].Filed })
	r.Payload.Window = "Yahoo public recent SEC filing index; original documents linked, not downloaded; report dates unavailable"
	return nil
}

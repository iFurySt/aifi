package market

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
)

type Client struct {
	ReadFundsHistory func(context.Context, string, string) ([]Record, error)
	ReadArchive      func(context.Context, string) (*Evidence, error)
	ReadStage        func(context.Context, string) (*Evidence, error)
	SaveStage        func(context.Context, string, Evidence) error
	HTTP             *http.Client
	Key              func(context.Context, string) (map[string]string, error)
	Gate             func(context.Context, string) error
	SECContact       func(context.Context) (string, error)
	Now              func() time.Time
	ReadEvidence     func(context.Context, string, string) ([]Evidence, error)
	ReadPayload      func(context.Context, string, string) (Payload, error)
}

func NewClient() *Client {
	return &Client{HTTP: &http.Client{Timeout: 45 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return errors.New("redirect denied") }}, Now: time.Now}
}
func (c *Client) get(ctx context.Context, provider, endpoint string, ev *[]Evidence) ([]byte, error) {
	keys, e := c.Key(ctx, provider)
	if e != nil {
		return nil, e
	}
	u, e := url.Parse(endpoint)
	if e != nil {
		return nil, &Failure{Code: "invalid_endpoint"}
	}
	if u.Scheme != "https" || u.User != nil || !map[string]bool{"api.massive.com": true, "www.sec.gov": true, "data.sec.gov": true, "financialmodelingprep.com": true, "query1.finance.yahoo.com": true, "finance.yahoo.com": true, "13f.info": true}[u.Host] {
		return nil, &Failure{Code: "invalid_endpoint"}
	}
	q := u.Query()
	headers := http.Header{"Accept": []string{"application/json"}}
	switch provider {
	case "thirteenf":
		if !valid13FEndpoint(u) {
			return nil, &Failure{Code: "invalid_endpoint"}
		}
		headers.Set("User-Agent", "AIFi/0.1 (+https://github.com/ifuryst/aifi)")
		if strings.HasPrefix(u.Path, "/manager/") {
			headers.Set("Accept", "text/html")
		}
	case "yahoo":
		if u.Host != "query1.finance.yahoo.com" && !(u.Host == "finance.yahoo.com" && strings.HasPrefix(u.Path, "/quote/") && (strings.HasSuffix(u.Path, "/profile/") || strings.HasSuffix(u.Path, "/analysis/") || strings.HasSuffix(u.Path, "/holders/"))) {
			return nil, &Failure{Code: "invalid_endpoint"}
		}
		headers.Set("User-Agent", "AIFi/0.1 local investment research")
	case "massive":
		if keys["apiKey"] == "" {
			return nil, &Failure{Code: "needs_key"}
		}
		headers.Set("Authorization", "Bearer "+keys["apiKey"])
	case "fmp":
		if keys["apiKey"] == "" {
			return nil, &Failure{Code: "needs_key"}
		}
		q.Set("apikey", keys["apiKey"])
	case "sec":
		contact, e := c.SECContact(ctx)
		if e != nil {
			return nil, e
		}
		if !strings.Contains(contact, "@") || strings.ContainsAny(contact, "\r\n\x00") {
			return nil, &Failure{Code: "needs_contact"}
		}
		headers.Set("User-Agent", contact)
	default:
		return nil, &Failure{Code: "invalid_provider"}
	}
	if c.Gate != nil {
		if e = c.Gate(ctx, provider); e != nil {
			return nil, e
		}
	}
	safe := u.String()
	u.RawQuery = q.Encode()
	request, e := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if e != nil {
		return nil, &Failure{Code: "request_failed"}
	}
	request.Header = headers
	response, e := c.HTTP.Do(request)
	if e != nil {
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		return nil, &Failure{Code: "network_error"}
	}
	defer response.Body.Close()
	if response.StatusCode != 200 {
		code := "provider_error"
		switch response.StatusCode {
		case 401:
			code = "invalid_key"
		case 402, 403:
			code = "access_denied"
		case 404:
			code = "not_found"
		case 429:
			code = "rate_limited"
		}
		retry := time.Minute
		h := response.Header.Get("Retry-After")
		if secs, e := strconv.Atoi(h); e == nil && secs > 0 {
			retry = time.Duration(secs) * time.Second
		} else if at, e := http.ParseTime(h); e == nil && at.After(c.Now()) {
			retry = at.Sub(c.Now())
		}
		if retry > 24*time.Hour {
			retry = 24 * time.Hour
		}
		return nil, &Failure{Code: code, RetryAfter: retry}
	}
	raw, e := io.ReadAll(io.LimitReader(response.Body, (32<<20)+1))
	if e != nil {
		return nil, &Failure{Code: "incomplete_response"}
	}
	if len(raw) > 32<<20 || len(raw) == 0 {
		return nil, &Failure{Code: "invalid_response"}
	}
	if (provider == "yahoo" && u.Host == "finance.yahoo.com") || (provider == "thirteenf" && strings.HasPrefix(u.Path, "/manager/")) {
		if len(raw) > 4<<20 {
			return nil, &Failure{Code: "source_window_too_large"}
		}
		*ev = append(*ev, Evidence{URL: safe, Body: raw, FetchedAt: c.Now()})
		return raw, nil
	}
	if strings.HasPrefix(strings.TrimSpace(string(raw)), "<") && strings.HasSuffix(u.Path, ".xml") {
		total := len(raw)
		for _, item := range *ev {
			total += len(item.Body)
		}
		if total > 64<<20 {
			return nil, &Failure{Code: "source_window_too_large"}
		}
		*ev = append(*ev, Evidence{URL: safe, Body: raw, FetchedAt: c.Now()})
		return raw, nil
	}
	for _, secret := range keys {
		if len(secret) >= 8 && bytes.Contains(raw, []byte(secret)) {
			return nil, &Failure{Code: "unsafe_provider_response"}
		}
	}
	var probe any
	if e = decodeJSON(raw, &probe); e != nil {
		return nil, e
	}
	if m, ok := probe.(map[string]any); ok {
		if m["Error Message"] != nil || m["error"] != nil || m["status"] == "ERROR" || m["status"] == "NOT_AUTHORIZED" {
			message := strings.ToLower(text(m["Error Message"]) + " " + text(m["error"]))
			if strings.Contains(message, "limit") || strings.Contains(message, "rate") {
				return nil, &Failure{Code: "rate_limited", RetryAfter: 24 * time.Hour}
			}
			if strings.Contains(message, "invalid") && strings.Contains(message, "key") {
				return nil, &Failure{Code: "invalid_key"}
			}
			return nil, &Failure{Code: "access_denied"}
		}
	}
	total := len(raw)
	for _, item := range *ev {
		total += len(item.Body)
	}
	if total > 64<<20 {
		return nil, &Failure{Code: "source_window_too_large"}
	}
	*ev = append(*ev, Evidence{URL: safe, Body: raw, FetchedAt: c.Now()})
	return raw, nil
}
func decodeJSON(raw []byte, target any) error {
	d := json.NewDecoder(bytes.NewReader(raw))
	d.UseNumber()
	if d.Decode(target) != nil {
		return &Failure{Code: "invalid_response"}
	}
	if d.Decode(new(any)) != io.EOF {
		return &Failure{Code: "invalid_response"}
	}
	return nil
}
func text(v any) string {
	if v == nil {
		return ""
	}
	switch v := v.(type) {
	case string:
		return v
	case json.Number:
		return string(v)
	}
	return ""
}
func number(v any) float64        { n, _ := strconv.ParseFloat(text(v), 64); return n }
func object(v any) map[string]any { m, _ := v.(map[string]any); return m }
func array(v any) []any           { a, _ := v.([]any); return a }
func strAt(a []any, i int) string {
	if i >= len(a) {
		return ""
	}
	return text(a[i])
}
func validDate(s string) bool { _, e := time.Parse("2006-01-02", s); return e == nil }

var cikPattern = regexp.MustCompile(`^\d{10}$`)
var accessionPattern = regexp.MustCompile(`^\d{10}-\d{2}-\d{6}$`)

func (c *Client) Collect(ctx context.Context, j Job) (Result, error) {
	ctx = WithJob(ctx, j)
	result := Result{Payload: Payload{Complete: true}}
	var e error
	switch j.Dataset {
	case "identity":
		e = c.identity(ctx, &result)
	case "prices":
		if j.Provider == "yahoo" {
			e = c.yahooPrices(ctx, j, &result)
		} else {
			e = c.prices(ctx, j, &result)
		}
	case "funds":
		if j.Provider == "thirteenf" {
			e = c.thirteenFFunds(ctx, j, &result)
		} else if j.Provider == "yahoo" {
			e = c.yahooFunds(ctx, j, &result)
		} else {
			e = c.optional(ctx, j, &result)
		}
	case "peers":
		e = c.yahooPeers(ctx, j, &result)
	case "analyst", "earnings":
		if j.Provider == "yahoo" {
			e = c.yahooOutlook(ctx, j, &result)
		} else {
			e = c.optional(ctx, j, &result)
		}
	case "profile":
		if j.Provider == "yahoo" {
			e = c.yahooCompany(ctx, j, &result)
		} else {
			e = c.profile(ctx, j, &result)
		}
	case "filings":
		if j.Provider == "yahoo" {
			e = c.yahooCompany(ctx, j, &result)
		} else {
			e = c.filings(ctx, j, &result)
		}
	case "facts":
		if j.Provider == "yahoo" {
			e = c.yahooFacts(ctx, j, &result)
		} else {
			e = c.facts(ctx, j, &result)
		}
	case "actions":
		e = c.actions(ctx, j, &result)
	case "insiders":
		if j.Provider == "sec" {
			e = c.insiders(ctx, j, &result)
		} else {
			e = c.optional(ctx, j, &result)
		}
	default:
		e = c.optional(ctx, j, &result)
	}
	return result, e
}
func (c *Client) identity(ctx context.Context, r *Result) error {
	raw, e := c.get(ctx, "sec", "https://www.sec.gov/files/company_tickers_exchange.json", &r.Evidence)
	if e != nil {
		return e
	}
	var m map[string]any
	if e = decodeJSON(raw, &m); e != nil {
		return e
	}
	fields := array(m["fields"])
	ti, ci := -1, -1
	for i, v := range fields {
		if text(v) == "ticker" {
			ti = i
		}
		if text(v) == "cik" {
			ci = i
		}
	}
	if ti < 0 || ci < 0 {
		return &Failure{Code: "invalid_identity"}
	}
	r.Aliases = map[string]string{}
	for _, v := range array(m["data"]) {
		row := array(v)
		if ti >= len(row) || ci >= len(row) {
			return &Failure{Code: "invalid_identity"}
		}
		symbol := strings.ToUpper(text(row[ti]))
		n, e := strconv.ParseInt(text(row[ci]), 10, 64)
		if e != nil || n <= 0 {
			return &Failure{Code: "invalid_identity"}
		}
		cik := fmt.Sprintf("%010d", n)
		r.Aliases[symbol] = cik
		// SEC uses a dash for share classes; retain exact mappings first.
		if strings.Contains(symbol, "-") {
			alias := strings.ReplaceAll(symbol, "-", ".")
			if _, ok := r.Aliases[alias]; !ok {
				r.Aliases[alias] = cik
			}
		}
	}
	if len(r.Aliases) < 100 {
		return &Failure{Code: "invalid_identity"}
	}
	return nil
}
func (c *Client) prices(ctx context.Context, j Job, r *Result) error {
	if !validDate(j.Subject) {
		return &Failure{Code: "invalid_date"}
	}
	endpoint := "https://api.massive.com/v2/aggs/grouped/locale/us/market/stocks/" + j.Subject + "?adjusted=false&include_otc=false"
	raw, e := c.get(ctx, "massive", endpoint, &r.Evidence)
	if e != nil {
		return e
	}
	var m map[string]any
	if e = decodeJSON(raw, &m); e != nil {
		return e
	}
	if m["status"] != "OK" && m["status"] != "DELAYED" {
		return &Failure{Code: "invalid_response"}
	}
	if m["adjusted"] != false {
		return &Failure{Code: "unexpected_adjustment"}
	}
	values, ok := m["results"].([]any)
	if !ok {
		if number(m["resultsCount"]) == 0 {
			r.Payload.Window = j.Subject
			return nil
		}
		return &Failure{Code: "invalid_response"}
	}
	for _, v := range values {
		b := object(v)
		date := time.UnixMilli(int64(number(b["t"]))).UTC().Format("2006-01-02")
		if date != j.Subject {
			return &Failure{Code: "invalid_bar_date"}
		}
		r.Bars = append(r.Bars, Bar{Symbol: text(b["T"]), Date: date, Open: number(b["o"]), High: number(b["h"]), Low: number(b["l"]), Close: number(b["c"]), Volume: number(b["v"])})
	}
	r.Payload.Window = j.Subject
	return nil
}
func (c *Client) profile(ctx context.Context, j Job, r *Result) error {
	raw, e := c.get(ctx, "massive", "https://api.massive.com/v3/reference/tickers/"+url.PathEscape(j.Subject), &r.Evidence)
	if e != nil {
		return e
	}
	var m map[string]any
	if e = decodeJSON(raw, &m); e != nil {
		return e
	}
	v := object(m["results"])
	if text(v["ticker"]) != j.Subject || text(v["name"]) == "" {
		return &Failure{Code: "invalid_profile"}
	}
	p := &Profile{Symbol: j.Subject, Name: text(v["name"]), CIK: text(v["cik"]), Description: text(v["description"]), Industry: text(v["sic_description"]), Website: text(v["homepage_url"]), Currency: strings.ToUpper(text(v["currency_name"])), Type: text(v["type"])}
	if n := number(v["weighted_shares_outstanding"]); n > 0 {
		p.Shares = &n
		p.SharesDate = c.Now().UTC().Format("2006-01-02")
	}
	r.Payload.Profile = p
	return nil
}
func (c *Client) filings(ctx context.Context, j Job, r *Result) error {
	cik := strings.TrimPrefix(j.Subject, "cik:")
	if !cikPattern.MatchString(cik) {
		return &Failure{Code: "unmapped"}
	}
	raw, e := c.get(ctx, "sec", "https://data.sec.gov/submissions/CIK"+cik+".json", &r.Evidence)
	if e != nil {
		return e
	}
	var m map[string]any
	if e = decodeJSON(raw, &m); e != nil {
		return e
	}
	recent := object(object(m["filings"])["recent"])
	accessions, ok := recent["accessionNumber"].([]any)
	if !ok || text(m["name"]) == "" {
		return &Failure{Code: "invalid_filings"}
	}
	fields := []string{"form", "reportDate", "filingDate", "acceptanceDateTime", "primaryDocument"}
	a := map[string][]any{}
	for _, f := range fields {
		a[f] = array(recent[f])
		if len(a[f]) != len(accessions) {
			return &Failure{Code: "invalid_filings"}
		}
	}
	n, _ := strconv.ParseInt(cik, 10, 64)
	for i, v := range accessions {
		acc := text(v)
		doc := strAt(a["primaryDocument"], i)
		if !accessionPattern.MatchString(acc) || strings.ContainsAny(doc, "\\?#") || strings.Contains(doc, "..") || doc == "" {
			continue
		}
		r.Payload.Filings = append(r.Payload.Filings, Filing{Accession: acc, Form: strAt(a["form"], i), ReportDate: strAt(a["reportDate"], i), Filed: strAt(a["filingDate"], i), Accepted: strAt(a["acceptanceDateTime"], i), URL: fmt.Sprintf("https://www.sec.gov/Archives/edgar/data/%d/%s/%s", n, strings.ReplaceAll(acc, "-", ""), strings.ReplaceAll(url.PathEscape(doc), "%2F", "/"))})
	}
	r.Payload.Profile = &Profile{Name: text(m["name"]), CIK: cik, Industry: text(m["sicDescription"]), Website: text(m["website"])}
	r.Payload.Window = "SEC recent filings (at least 1 year or 1,000 filings); older archives not imported"
	r.Payload.Complete = false
	return nil
}

func (c *Client) facts(ctx context.Context, j Job, r *Result) error {
	cik := strings.TrimPrefix(j.Subject, "cik:")
	if !cikPattern.MatchString(cik) {
		return &Failure{Code: "unmapped"}
	}
	raw, e := c.get(ctx, "sec", "https://data.sec.gov/api/xbrl/companyfacts/CIK"+cik+".json", &r.Evidence)
	if e != nil {
		return e
	}
	var m map[string]any
	if e = decodeJSON(raw, &m); e != nil {
		return e
	}
	facts := object(m["facts"])
	if len(facts) == 0 || text(m["entityName"]) == "" {
		return &Failure{Code: "invalid_facts"}
	}
	// Preserve decimal strings and filing identities; calendar/quarter inference is
	// a separate deterministic read layer, never fabricated by a provider adapter.
	cutoff := c.Now().AddDate(-7, 0, 0).Format("2006-01-02")
	for metric, tags := range FactTags {
		for _, ns := range []string{"us-gaap", "dei"} {
			for _, tag := range tags {
				v := object(object(facts[ns])[tag])
				for unit, items := range object(v["units"]) {
					for _, item := range array(items) {
						f := object(item)
						end := text(f["end"])
						filed := text(f["filed"])
						val := text(f["val"])
						if !validDate(end) || !validDate(filed) || end < cutoff || val == "" {
							continue
						}
						if n, e := strconv.ParseFloat(val, 64); e != nil || math.IsNaN(n) || math.IsInf(n, 0) {
							return &Failure{Code: "invalid_fact_value"}
						}
						r.Payload.Facts = append(r.Payload.Facts, Fact{Metric: metric, Tag: ns + ":" + tag, Unit: unit, Value: val, Start: text(f["start"]), End: end, Filed: filed, Accession: text(f["accn"]), Form: text(f["form"]), FiscalYear: int(number(f["fy"])), FiscalPeriod: text(f["fp"])})
					}
				}
			}
		}
	}
	latest := map[string]Fact{}
	for _, f := range r.Payload.Facts {
		k := f.Metric + ":" + f.Tag + ":" + f.Unit + ":" + f.Start + ":" + f.End
		old, ok := latest[k]
		if !ok || f.Filed > old.Filed || (f.Filed == old.Filed && f.Accession > old.Accession) {
			latest[k] = f
		}
	}
	r.Payload.Facts = []Fact{}
	for _, f := range latest {
		r.Payload.Facts = append(r.Payload.Facts, f)
	}
	sort.Slice(r.Payload.Facts, func(i, j int) bool {
		a, b := r.Payload.Facts[i], r.Payload.Facts[j]
		return a.Metric+a.End+a.Start+a.Tag+a.Unit < b.Metric+b.End+b.Start+b.Tag+b.Unit
	})
	if len(r.Payload.Facts) > 12000 || len(Marshal(r.Payload.Facts)) > 2<<20 {
		return &Failure{Code: "too_many_facts"}
	}
	r.Payload.Version = FinancialFactsVersion
	r.Payload.Window = "Standard entity-wide financial statements, comprehensive income and capital-return concepts; last 7 years; no custom or segment facts"
	r.Payload.Complete = false
	return nil
}
func (c *Client) massivePages(ctx context.Context, endpoint string, r *Result) ([]Record, error) {
	out := []Record{}
	seen := map[string]bool{}
	for page := 0; page < 100; page++ {
		if seen[endpoint] {
			return nil, &Failure{Code: "pagination_loop"}
		}
		seen[endpoint] = true
		raw, e := c.get(ctx, "massive", endpoint, &r.Evidence)
		if e != nil {
			return nil, e
		}
		var m map[string]any
		if e = decodeJSON(raw, &m); e != nil {
			return nil, e
		}
		if m["status"] != "OK" {
			return nil, &Failure{Code: "invalid_response"}
		}
		items, ok := m["results"].([]any)
		if !ok {
			return nil, &Failure{Code: "invalid_response"}
		}
		for _, v := range items {
			if object(v) == nil {
				return nil, &Failure{Code: "invalid_response"}
			}
			out = append(out, Record(object(v)))
		}
		next := text(m["next_url"])
		if next == "" {
			return out, nil
		}
		u, e := url.Parse(next)
		if e != nil || u.Host != "api.massive.com" || u.Scheme != "https" {
			return nil, &Failure{Code: "invalid_pagination"}
		}
		q := u.Query()
		q.Del("apiKey")
		u.RawQuery = q.Encode()
		endpoint = u.String()
	}
	return nil, &Failure{Code: "pagination_limit"}
}
func (c *Client) actions(ctx context.Context, j Job, r *Result) error {
	q := "?limit=5000"
	if j.Subject != "us" {
		q += "&ticker=" + url.QueryEscape(j.Subject)
	}
	for _, kind := range []string{"splits", "dividends"} {
		items, e := c.massivePages(ctx, "https://api.massive.com/stocks/v1/"+kind+q+"&"+map[string]string{"splits": "execution_date", "dividends": "ex_dividend_date"}[kind]+".gte="+c.Now().AddDate(-2, 0, 0).Format("2006-01-02"), r)
		if e != nil {
			return e
		}
		for _, v := range items {
			if j.Subject == "us" && text(v["ticker"]) == "" {
				return &Failure{Code: "invalid_action_symbol"}
			}
			v["kind"] = kind
			if kind == "splits" && (!validDate(text(v["execution_date"])) || number(v["split_from"]) <= 0 || number(v["split_to"]) <= 0) {
				r.Payload.Complete = false
			}
			r.Payload.Records = append(r.Payload.Records, v)
		}
	}
	r.Payload.Window = "Provider-entitled split/dividend history"
	return nil
}
func (c *Client) fmpRows(ctx context.Context, path string, q url.Values, r *Result) ([]Record, error) {
	raw, e := c.get(ctx, "fmp", "https://financialmodelingprep.com/stable/"+path+"?"+q.Encode(), &r.Evidence)
	if e != nil {
		return nil, e
	}
	var values []Record
	if e = decodeJSON(raw, &values); e != nil || values == nil {
		return nil, &Failure{Code: "invalid_response"}
	}
	return values, nil
}
func (c *Client) optional(ctx context.Context, j Job, r *Result) error {
	q := url.Values{"symbol": {j.Subject}}
	var paths []string
	switch j.Dataset {
	case "funds":
		// Latest fully elapsed quarter, with explicit reporting window. Paginate every
		// holder; never present one provider page as the whole ownership snapshot.
		at, e := time.Parse("2006-01-02", j.Window)
		if e != nil {
			return &Failure{Code: "invalid_quarter"}
		}
		q.Set("year", strconv.Itoa(at.Year()))
		q.Set("quarter", strconv.Itoa((int(at.Month())-1)/3+1))
		q.Set("limit", "1000")
		generation := ""
		seen := map[string]bool{}
		for page := 0; page < 100; page++ {
			q.Set("page", strconv.Itoa(page))
			endpoint := "https://financialmodelingprep.com/stable/institutional-ownership/extract-analytics/holder?" + q.Encode()
			cacheKey := generation + ":" + endpoint
			var items []Record
			var ev *Evidence
			if page > 0 && c.ReadStage != nil {
				ev, e = c.ReadStage(ctx, cacheKey)
				if e != nil {
					return e
				}
			}
			if ev != nil {
				if e = decodeJSON(ev.Body, &items); e != nil {
					return e
				}
				r.Evidence = append(r.Evidence, *ev)
			} else {
				items, e = c.fmpRows(ctx, "institutional-ownership/extract-analytics/holder", q, r)
				if e != nil {
					return e
				}
				saved := r.Evidence[len(r.Evidence)-1]
				if page == 0 {
					hash := sha256.Sum256(saved.Body)
					generation = hex.EncodeToString(hash[:])
				} else if c.SaveStage != nil {
					if e = c.SaveStage(ctx, cacheKey, saved); e != nil {
						return e
					}
				}
			}
			if len(items) == 0 {
				r.Payload.Window = j.Window
				return nil
			}
			hash := sha256.Sum256([]byte(Marshal(items)))
			fingerprint := hex.EncodeToString(hash[:])
			if seen[fingerprint] {
				return &Failure{Code: "pagination_loop"}
			}
			seen[fingerprint] = true
			r.Payload.Records = append(r.Payload.Records, items...)
		}
		return &Failure{Code: "pagination_limit"}
	case "politicians":
		paths = []string{"senate-trades", "house-trades"}
	case "analyst":
		paths = []string{"grades", "price-target-consensus"}
	case "insiders":
		paths = []string{"insider-trading/search"}
	case "news":
		paths = []string{"news/stock"}
		q.Set("symbols", j.Subject)
		q.Del("symbol")
		q.Set("limit", "100")
	default:
		return &Failure{Code: "unsupported_dataset"}
	}
	for _, path := range paths {
		query := q
		if j.Dataset == "insiders" {
			query = url.Values{"symbol": {j.Subject}, "limit": {"1000"}, "page": {"0"}}
		}
		items, e := c.fmpRows(ctx, path, query, r)
		if e != nil {
			return e
		}
		for _, v := range items {
			v["recordKind"] = path
			r.Payload.Records = append(r.Payload.Records, v)
		}
	}
	r.Payload.Complete = false
	r.Payload.Window = "Latest provider response window"
	return nil
}

func (c *Client) getXML(ctx context.Context, endpoint string, ev *[]Evidence) ([]byte, error) {
	return c.get(ctx, "sec", endpoint, ev)
}

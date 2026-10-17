package market

import (
	"bytes"
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"math"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"golang.org/x/net/html"
)

//go:embed fund-managers.json
var managerRoster []byte

type FundManager struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	CIK         string `json:"cik"`
	ProfileURL  string `json:"profileUrl"`
}

var fundManagers = func() []FundManager {
	var managers []FundManager
	if json.Unmarshal(managerRoster, &managers) != nil {
		panic("invalid embedded fund roster")
	}
	return managers
}()
var cusipPattern = regexp.MustCompile(`^[A-Z0-9]{9}$`)
var filingSlug = regexp.MustCompile(`^[0-9]{18}-[a-z0-9-]+$`)
var managerPath = regexp.MustCompile(`^/manager/[0-9]{10}-[a-z0-9-]+$`)
var historyPath = regexp.MustCompile(`^/data/manager/[0-9]{10}/cusip/[A-Z0-9]{9}$`)

func valid13FEndpoint(u *url.URL) bool {
	if u.Host != "13f.info" || u.Fragment != "" {
		return false
	}
	if managerPath.MatchString(u.Path) || historyPath.MatchString(u.Path) {
		return u.RawQuery == ""
	}
	return u.Path == "/data/autocomplete" && len(u.Query()) == 1 && len(u.Query()["q"]) == 1 && yahooSymbol.MatchString(u.Query().Get("q"))
}

// The common quarter is at least 45 days old; early filings do not advance every
// manager into an incomplete next-quarter comparison.
func FundHistoryWindow(now time.Time, quarters int) string {
	cutoff := now.UTC().AddDate(0, 0, -45)
	end := time.Date(cutoff.Year(), time.Month(((int(cutoff.Month())-1)/3+1)*3+1), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 0, -1)
	if end.After(cutoff) {
		end = time.Date(end.Year(), end.Month()-2, 1, 0, 0, 0, 0, time.UTC).AddDate(0, 0, -1)
	}
	return fmt.Sprintf("%s:%d", end.Format("2006-01-02"), quarters)
}
func fundReportPeriods(window string) ([]string, error) {
	parts := strings.Split(window, ":")
	if len(parts) != 2 || !validDate(parts[0]) {
		return nil, &Failure{Code: "invalid_quarter"}
	}
	n, e := strconv.Atoi(parts[1])
	if e != nil || n < 4 || n > 20 {
		return nil, &Failure{Code: "invalid_quarter"}
	}
	end, _ := time.Parse("2006-01-02", parts[0])
	if int(end.Month())%3 != 0 || end.Day() != time.Date(end.Year(), end.Month()+1, 0, 0, 0, 0, 0, time.UTC).Day() {
		return nil, &Failure{Code: "invalid_quarter"}
	}
	periods := []string{}
	for i := 0; i < n; i++ {
		periods = append(periods, end.Format("2006-01-02"))
		end = time.Date(end.Year(), end.Month()-2, 1, 0, 0, 0, 0, time.UTC).AddDate(0, 0, -1)
	}
	return periods, nil
}
func (c *Client) thirteenFSource(ctx context.Context, endpoint string, ttl time.Duration, r *Result) ([]byte, error) {
	key := "thirteenf-v1:" + endpoint
	if c.ReadStage != nil {
		cached, e := c.ReadStage(ctx, key)
		if e != nil {
			return nil, e
		}
		if cached != nil && cached.URL == endpoint && c.Now().Sub(cached.FetchedAt) >= 0 && c.Now().Sub(cached.FetchedAt) < ttl {
			r.Evidence = append(r.Evidence, *cached)
			return cached.Body, nil
		}
	}
	raw, e := c.get(ctx, "thirteenf", endpoint, &r.Evidence)
	if e != nil {
		return nil, e
	}
	if c.SaveStage != nil {
		if e = c.SaveStage(ctx, key, r.Evidence[len(r.Evidence)-1]); e != nil {
			return nil, e
		}
	}
	return raw, nil
}
func (c *Client) thirteenFFunds(ctx context.Context, j Job, r *Result) error {
	periods, e := fundReportPeriods(j.Window)
	if e != nil {
		return e
	}
	if j.Window != FundHistoryWindow(c.Now(), len(periods)) {
		return &Failure{Code: "obsolete_fund_window"}
	}
	if !yahooSymbol.MatchString(j.Subject) {
		return &Failure{Code: "unsupported_symbol"}
	}
	endpoint := "https://13f.info/data/autocomplete?" + url.Values{"q": {j.Subject}}.Encode()
	raw, e := c.thirteenFSource(ctx, endpoint, 30*24*time.Hour, r)
	if e != nil {
		return e
	}
	cusip, e := exact13FCUSIP(raw, j.Subject)
	if e != nil {
		return e
	}
	records := []Record{}
	for _, manager := range fundManagers {
		profile, e := c.thirteenFSource(ctx, manager.ProfileURL, 7*24*time.Hour, r)
		if e != nil {
			return e
		}
		reports, e := parse13FReports(profile, manager.CIK, c.Now())
		if e != nil {
			return e
		}
		source := "https://13f.info/data/manager/" + manager.CIK + "/cusip/" + cusip
		history, e := c.thirteenFSource(ctx, source, 7*24*time.Hour, r)
		if e != nil {
			return e
		}
		points, e := parse13FHistory(history, reports, manager, cusip, periods, r.Evidence[len(r.Evidence)-1], c.Now())
		if e != nil {
			return e
		}
		records = append(records, points...)
	}
	r.Payload.Version = 1
	r.Payload.Records = records
	r.Payload.ReportPeriods = periods
	r.Payload.Complete = false
	r.Payload.Window = fmt.Sprintf("Tracked 13F managers · %s to %s · CUSIP %s. Common shares only; filing-based vendor history, not complete institutional ownership or trading flows. Reports/absence are checked against each manager's filing list. No split adjustment.", periods[len(periods)-1], periods[0], cusip)
	return nil
}
func exact13FCUSIP(raw []byte, symbol string) (string, error) {
	var root map[string]any
	if e := decodeJSON(raw, &root); e != nil {
		return "", e
	}
	matches := map[string]bool{}
	for _, item := range array(root["cusips"]) {
		r := object(item)
		name := text(r["name"])
		extra := text(r["extra"])
		if !strings.HasPrefix(name, symbol+" - ") {
			continue
		}
		ref := text(r["url"])
		id := strings.TrimPrefix(ref, "/cusip/")
		if !cusipPattern.MatchString(id) || ref != "/cusip/"+id || !strings.HasPrefix(extra, id+" - ") {
			return "", &Failure{Code: "invalid_cusip_mapping"}
		}
		class := strings.ToUpper(strings.TrimPrefix(extra, id+" - "))
		if strings.Contains(class, "NOTE") || strings.Contains(class, "BOND") || strings.Contains(class, "WARRANT") || strings.Contains(class, "PFD") {
			return "", &Failure{Code: "unsupported_security"}
		}
		matches[id] = true
	}
	if len(matches) != 1 {
		return "", &Failure{Code: "unmapped_cusip"}
	}
	for id := range matches {
		return id, nil
	}
	panic("unreachable")
}

type fundReport struct {
	ID, Filed string
	Complete  bool
}

func attr(n *html.Node, key string) string {
	for _, a := range n.Attr {
		if a.Key == key {
			return a.Val
		}
	}
	return ""
}
func nodeText(n *html.Node) string {
	if n.Type == html.TextNode {
		return n.Data
	}
	var b strings.Builder
	for child := n.FirstChild; child != nil; child = child.NextSibling {
		b.WriteString(nodeText(child))
		b.WriteByte(' ')
	}
	return strings.Join(strings.Fields(b.String()), " ")
}
func nodes(n *html.Node, predicate func(*html.Node) bool) []*html.Node {
	out := []*html.Node{}
	var walk func(*html.Node)
	walk = func(node *html.Node) {
		if predicate(node) {
			out = append(out, node)
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			walk(child)
		}
	}
	walk(n)
	return out
}
func parse13FReports(raw []byte, cik string, now time.Time) (map[string]fundReport, error) {
	doc, e := html.Parse(bytes.NewReader(raw))
	if e != nil {
		return nil, &Failure{Code: "invalid_manager_page"}
	}
	identity := nodes(doc, func(n *html.Node) bool { return n.Data == "h1" && attr(n, "data-cik") == cik })
	tables := nodes(doc, func(n *html.Node) bool { return n.Data == "table" && attr(n, "id") == "managerFilings" })
	if len(identity) == 0 {
		canonical := nodes(doc, func(n *html.Node) bool {
			return n.Data == "link" && attr(n, "rel") == "canonical" && strings.HasPrefix(attr(n, "href"), "https://13f.info/manager/"+cik+"-")
		})
		for _, script := range nodes(doc, func(n *html.Node) bool { return n.Data == "script" && attr(n, "type") == "application/ld+json" }) {
			var root map[string]any
			if json.Unmarshal([]byte(nodeText(script)), &root) != nil {
				continue
			}
			for _, raw := range array(root["itemListElement"]) {
				item := object(raw)
				if len(canonical) == 1 && text(item["identifier"]) == cik && text(item["sameAs"]) == "https://www.sec.gov/edgar/browse/?CIK="+cik {
					identity = append(identity, script)
				}
			}
		}
	}

	if len(identity) != 1 || len(tables) != 1 {
		return nil, &Failure{Code: "invalid_manager_identity"}
	}
	reports := map[string]fundReport{}
	for _, tr := range nodes(tables[0], func(n *html.Node) bool { return n.Data == "tr" }) {
		cells := []*html.Node{}
		for td := tr.FirstChild; td != nil; td = td.NextSibling {
			if td.Data == "td" {
				cells = append(cells, td)
			}
		}
		if len(cells) < 7 {
			continue
		}
		date, filed := attr(cells[0], "data-order"), attr(cells[5], "data-order")
		form := nodeText(cells[4])
		if !validDate(date) || !validDate(filed) || filed > now.UTC().Format("2006-01-02") || (form != "13F-HR" && form != "13F-HR/A") {
			continue
		}
		links := nodes(cells[0], func(n *html.Node) bool { return n.Data == "a" })
		if len(links) != 1 {
			return nil, &Failure{Code: "invalid_manager_page"}
		}
		id := strings.TrimPrefix(attr(links[0], "href"), "/13f/")
		if !filingSlug.MatchString(id) || !strings.HasPrefix(attr(links[0], "href"), "/13f/") {
			return nil, &Failure{Code: "invalid_manager_page"}
		}
		report := fundReport{ID: id, Filed: filed, Complete: form == "13F-HR" || strings.HasSuffix(id, "-restatement")}
		old, ok := reports[date]
		if !ok || filed > old.Filed || (filed == old.Filed && id > old.ID) {
			reports[date] = report
		}
	}
	if len(reports) == 0 {
		return nil, &Failure{Code: "invalid_manager_page"}
	}
	return reports, nil
}
func parse13FHistory(raw []byte, reports map[string]fundReport, manager FundManager, cusip string, periods []string, evidence Evidence, now time.Time) ([]Record, error) {
	var root map[string]any
	if e := decodeJSON(raw, &root); e != nil {
		return nil, e
	}
	rows, ok := root["data"].([]any)
	if !ok || len(rows) > 1000 {
		return nil, &Failure{Code: "invalid_fund_history"}
	}
	byDate := map[string]Record{}
	blocked := map[string]bool{}
	for _, item := range rows {
		row := array(item)
		if len(row) != 7 || len(array(row[0])) != 2 || len(array(row[6])) != 2 {
			return nil, &Failure{Code: "invalid_fund_history"}
		}
		if row[4] != nil && text(row[4]) != "" {
			continue
		} // Put/call exposure is not common shares.
		date, id, filed := text(array(row[0])[0]), text(array(row[0])[1]), text(row[5])
		at, err := time.Parse("2006-01-02", date)
		if err != nil || !validDate(filed) || filed > now.UTC().Format("2006-01-02") || !filingSlug.MatchString(id) || int(number(array(row[6])[0])) != at.Year() || int(number(array(row[6])[1])) != (int(at.Month())-1)/3+1 {
			return nil, &Failure{Code: "invalid_fund_history"}
		}
		report, known := reports[date]
		if !known || !report.Complete || report.ID != id {
			blocked[date] = true
			continue
		}
		shares, valid := sourceNumber(row[3])
		if !valid || shares < 0 || shares > 1e15 || math.Trunc(shares) != shares {
			blocked[date] = true
			continue
		}
		if _, duplicate := byDate[date]; duplicate {
			return nil, &Failure{Code: "ambiguous_fund_history"}
		}
		r := Record{"shares": shares, "filingId": id, "filed": filed}
		if value, valid := sourceNumber(row[1]); valid && value >= 0 && value < 1e15 {
			r["value"] = value * 1000
		}
		byDate[date] = r
	}
	relevant := false
	for _, date := range periods {
		if shares, ok := byDate[date]["shares"].(float64); ok && shares > 0 {
			relevant = true
		}
	}
	if !relevant {
		return nil, nil
	}
	out := []Record{}
	for i, date := range periods {
		report, known := reports[date]
		if !known || !report.Complete || blocked[date] {
			continue
		}
		values, present := byDate[date]
		if !present {
			values = Record{"shares": float64(0), "filed": report.Filed, "filingId": report.ID, "reportedAbsence": true}
		}
		r := Record{"recordKind": "holding", "holderKind": "institution", "holderId": "cik:" + manager.CIK, "managerCik": manager.CIK, "name": manager.DisplayName, "reportDate": date, "current": i == 0, "observedAt": evidence.FetchedAt.UTC().Format(time.RFC3339), "sourceURL": "https://13f.info/manager/" + manager.CIK + "/cusip/" + cusip, "cusip": cusip, "basis": "reported-common-shares"}
		for k, v := range values {
			r[k] = v
		}
		out = append(out, r)
	}
	return out, nil
}

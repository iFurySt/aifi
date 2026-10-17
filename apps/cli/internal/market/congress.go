package market

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
)

const congressHost = "congressinfor-production.up.railway.app"

var congressPath = regexp.MustCompile(`^/trades/[A-Z][A-Z0-9.-]{0,13}$`)
var disclosedRange = regexp.MustCompile(`^\$?([0-9][0-9,]*)\s*[-–]\s*\$?([0-9][0-9,]*)$`)

func validCongressEndpoint(u *url.URL) bool {
	if u.Host != congressHost || !congressPath.MatchString(u.Path) || u.Fragment != "" || len(u.Query()) != 2 || u.Query().Get("limit") != "100" || len(u.Query()["offset"]) != 1 {
		return false
	}
	n, e := strconv.Atoi(u.Query().Get("offset"))
	return e == nil && n >= 0 && n < 2000 && n%100 == 0
}
func officialDisclosureURL(raw string) bool {
	u, e := url.Parse(raw)
	if e != nil || u.Scheme != "https" || u.User != nil || u.RawQuery != "" || u.Fragment != "" {
		return false
	}
	if u.Host == "disclosures-clerk.house.gov" {
		return regexp.MustCompile(`^/public_disc/ptr-pdfs/20[0-9]{2}/[0-9]+\.pdf$`).MatchString(u.Path)
	}
	return u.Host == "efdsearch.senate.gov" && regexp.MustCompile(`^/search/view/ptr/[a-fA-F0-9-]{36}/?$`).MatchString(u.Path)
}
func normalizeCongressTrade(raw any, symbol string, now time.Time) (Record, error) {
	t := object(raw)
	name := strings.TrimSpace(text(t["member"]))
	chamber := strings.ToLower(text(t["chamber"]))
	side := text(t["trade_type"])
	date, filed := text(t["tx_date"]), text(t["disclosed"])
	link := text(t["link"])
	if text(t["ticker"]) != symbol || name == "" || len(name) > 256 || (chamber != "house" && chamber != "senate") || (side != "buy" && side != "sell") || !validDate(date) || !validDate(filed) || date > now.UTC().Format("2006-01-02") || filed > now.UTC().Format("2006-01-02") || filed < date || !officialDisclosureURL(link) {
		return nil, &Failure{Code: "invalid_congress_trade"}
	}
	amount := strings.TrimSpace(text(t["amount"]))
	if len(amount) > 100 || len(text(t["asset"])) > 2000 {
		return nil, &Failure{Code: "invalid_congress_trade"}
	}
	r := Record{"recordKind": "congress-trade", "name": name, "chamber": chamber, "symbol": symbol, "type": side, "transactionDate": date, "disclosureDate": filed, "amount": amount, "asset": text(t["asset"]), "url": link}
	if match := disclosedRange.FindStringSubmatch(amount); match != nil {
		low, _ := strconv.ParseInt(strings.ReplaceAll(match[1], ",", ""), 10, 64)
		high, _ := strconv.ParseInt(strings.ReplaceAll(match[2], ",", ""), 10, 64)
		if low < 0 || high < low || high > 1e12 {
			return nil, &Failure{Code: "invalid_congress_amount"}
		}
		r["amountMin"], r["amountMax"] = low, high
	}
	for _, key := range []string{"owner", "party", "state"} {
		if v := text(t[key]); v != "" && len(v) <= 100 {
			r[key] = v
		}
	}
	hash := sha256.Sum256([]byte(Marshal(r)))
	r["id"] = hex.EncodeToString(hash[:])
	return r, nil
}
func (c *Client) congressTrades(ctx context.Context, j Job, r *Result) error {
	if !congressPath.MatchString("/trades/" + j.Subject) {
		return &Failure{Code: "unsupported_symbol"}
	}
	records := []Record{}
	ids := map[string]bool{}
	pages := map[string]bool{}
	updated := ""
	expected := -1
	for offset := 0; offset < 2000; offset += 100 {
		endpoint := "https://" + congressHost + "/trades/" + j.Subject + "?" + url.Values{"limit": {"100"}, "offset": {strconv.Itoa(offset)}}.Encode()
		key := "congress-v1:" + endpoint
		var raw []byte
		var e error
		if c.ReadStage != nil {
			cached, err := c.ReadStage(ctx, key)
			if err != nil {
				return err
			}
			if cached != nil && cached.URL == endpoint && c.Now().Sub(cached.FetchedAt) >= 0 && c.Now().Sub(cached.FetchedAt) < 6*time.Hour {
				raw = cached.Body
				r.Evidence = append(r.Evidence, *cached)
			}
		}
		if raw == nil {
			raw, e = c.get(ctx, "congress", endpoint, &r.Evidence)
			if e != nil {
				return e
			}
		}
		var root map[string]any
		if e = decodeJSON(raw, &root); e != nil {
			return e
		}
		rows, ok := root["trades"].([]any)
		total := int(number(root["total"]))
		stamp := text(root["last_updated"])
		at, stampErr := time.Parse(time.RFC3339, stamp)
		if !ok || len(rows) > 100 || text(root["ticker"]) != j.Subject || int(number(root["offset"])) != offset || int(number(root["limit"])) != 100 || total < 0 || total > 100000 || stampErr != nil || at.After(c.Now().Add(time.Minute)) || root["cache_loading"] == true {
			return &Failure{Code: "invalid_congress_response"}
		}
		if expected < 0 {
			expected = total
			updated = stamp
		} else if expected != total || updated != stamp {
			return &Failure{Code: "source_changed_during_sync"}
		}
		signature := Marshal(rows)
		if pages[signature] && len(rows) > 0 {
			return &Failure{Code: "pagination_loop"}
		}
		pages[signature] = true
		for _, item := range rows {
			record, err := normalizeCongressTrade(item, j.Subject, c.Now())
			if err != nil {
				return err
			}
			id := text(record["id"])
			if !ids[id] {
				records = append(records, record)
				ids[id] = true
			}
		}
		if c.SaveStage != nil {
			if e = c.SaveStage(ctx, key, r.Evidence[len(r.Evidence)-1]); e != nil {
				return e
			}
		}
		more, valid := root["has_more"].(bool)
		if !valid || (more && len(rows) == 0) || (!more && offset+len(rows) != total) {
			return &Failure{Code: "invalid_congress_pagination"}
		}
		if !more {
			break
		}
	}
	// Without filing row IDs, same disclosure/date/range with different OCR text
	// may be a duplicate or separate line. Preserve it, but exclude the ambiguity
	// from ranked/chart counts rather than silently merging or double-counting.
	groups := map[string][]Record{}
	for _, v := range records {
		k := fmt.Sprint(v["name"], "|", v["chamber"], "|", v["url"], "|", v["type"], "|", v["transactionDate"], "|", v["disclosureDate"], "|", v["amount"])
		groups[k] = append(groups[k], v)
	}
	for _, group := range groups {
		if len(group) > 1 {
			for _, v := range group {
				v["ambiguousDuplicate"] = true
			}
		}
	}
	sort.SliceStable(records, func(i, k int) bool {
		a, b := text(records[i]["transactionDate"]), text(records[k]["transactionDate"])
		if a != b {
			return a > b
		}
		return text(records[i]["id"]) < text(records[k]["id"])
	})
	r.Payload.Version = 1
	r.Payload.Records = records
	r.Payload.Complete = false
	r.Payload.Window = fmt.Sprintf("CongressInvests public House/Senate disclosures; vendor updated %s; %d provider rows, bounded to 2,000. Amounts are disclosed ranges, not executed values. Possible duplicate lines retained and excluded from chart/ranking counts. Executive disclosures not covered.", updated, expected)
	return nil
}

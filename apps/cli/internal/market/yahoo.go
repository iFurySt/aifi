package market

import (
	"context"
	"net/url"
	"regexp"
	"strings"
	"time"
)

var yahooSymbol = regexp.MustCompile(`^[A-Z0-9][A-Z0-9.-]{0,19}$`)

// Yahoo chart OHLC is split-adjusted, unlike Massive's raw aggregates. We do
// not use adjclose (which also adjusts for dividends), or the live quote.
func (c *Client) yahooPrices(ctx context.Context, j Job, r *Result) error {
	if !yahooSymbol.MatchString(j.Subject) {
		return &Failure{Code: "unsupported_symbol"}
	}
	symbol := strings.ReplaceAll(j.Subject, ".", "-")
	endpoint := "https://query1.finance.yahoo.com/v8/finance/chart/" + url.PathEscape(symbol) + "?range=2y&interval=1d"
	raw, err := c.get(ctx, "yahoo", endpoint, &r.Evidence)
	if err != nil {
		return err
	}
	var root map[string]any
	if err = decodeJSON(raw, &root); err != nil {
		return err
	}
	chart := object(root["chart"])
	if chart["error"] != nil {
		return &Failure{Code: "not_found"}
	}
	results := array(chart["result"])
	if len(results) != 1 {
		return &Failure{Code: "invalid_response"}
	}
	data := object(results[0])
	meta := object(data["meta"])
	if text(meta["symbol"]) != symbol || text(meta["currency"]) != "USD" || text(meta["exchangeTimezoneName"]) != "America/New_York" {
		return &Failure{Code: "invalid_response"}
	}
	quotes := array(object(data["indicators"])["quote"])
	if len(quotes) != 1 {
		return &Failure{Code: "invalid_response"}
	}
	q := object(quotes[0])
	timestamps := array(data["timestamp"])
	fields := []string{"open", "high", "low", "close", "volume"}
	for _, f := range fields {
		if len(array(q[f])) != len(timestamps) {
			return &Failure{Code: "invalid_response"}
		}
	}
	loc, err := time.LoadLocation("America/New_York")
	if err != nil {
		return err
	}
	today := c.Now().In(loc).Format("2006-01-02")
	seen := map[string]bool{}
	for i, ts := range timestamps {
		date := time.Unix(int64(number(ts)), 0).In(loc).Format("2006-01-02")
		if date >= today {
			continue
		} // EOD-only: never persist the open session as a close.
		if date < "1970-01-02" || seen[date] {
			return &Failure{Code: "invalid_response"}
		}
		seen[date] = true
		missing := false
		for _, f := range fields {
			if array(q[f])[i] == nil {
				missing = true
			}
		}
		if missing {
			continue
		}
		r.Bars = append(r.Bars, Bar{Symbol: j.Subject, Date: date, Open: number(array(q["open"])[i]), High: number(array(q["high"])[i]), Low: number(array(q["low"])[i]), Close: number(array(q["close"])[i]), Volume: number(array(q["volume"])[i])})
	}
	if len(r.Bars) == 0 {
		return &Failure{Code: "not_found"}
	}
	r.Basis = "split-adjusted"
	return nil
}

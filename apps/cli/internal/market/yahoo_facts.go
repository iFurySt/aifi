package market

import (
	"context"
	"encoding/json"
	"math"
	"net/url"
	"sort"
	"strconv"
	"strings"
)

var yahooFactFields = map[string]string{
	"revenue": "TotalRevenue", "grossProfit": "GrossProfit", "operatingIncome": "OperatingIncome", "netIncome": "NetIncome", "eps": "DilutedEPS",
	"cash": "CashAndCashEquivalents", "assets": "TotalAssets", "liabilities": "TotalLiabilitiesNetMinorityInterest", "equity": "StockholdersEquity",
	"operatingCashFlow": "OperatingCashFlow", "capex": "CapitalExpenditure", "shares": "OrdinarySharesNumber",
}

func (c *Client) yahooFacts(ctx context.Context, j Job, r *Result) error {
	symbol, err := yahooTicker(j.Subject)
	if err != nil {
		return err
	}
	fields := map[string]string{}
	types := []string{}
	for metric, field := range yahooFactFields {
		for _, period := range []string{"annual", "quarterly"} {
			key := period + field
			fields[key] = metric
			types = append(types, key)
		}
	}
	sort.Strings(types)
	q := url.Values{"type": {strings.Join(types, ",")}, "period1": {strconv.FormatInt(c.Now().AddDate(-5, 0, 0).Unix(), 10)}, "period2": {strconv.FormatInt(c.Now().Unix(), 10)}}
	raw, err := c.get(ctx, "yahoo", "https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/"+url.PathEscape(symbol)+"?"+q.Encode(), &r.Evidence)
	if err != nil {
		return err
	}
	var root map[string]any
	if err = decodeJSON(raw, &root); err != nil {
		return err
	}
	source := object(root["timeseries"])
	if source["error"] != nil {
		return &Failure{Code: "not_found"}
	}
	series, ok := source["result"].([]any)
	if !ok {
		return &Failure{Code: "invalid_facts"}
	}
	seen := map[string]bool{}
	for _, item := range series {
		row := object(item)
		meta := object(row["meta"])
		symbols := array(meta["symbol"])
		ts := array(meta["type"])
		if len(symbols) != 1 || text(symbols[0]) != symbol || len(ts) != 1 {
			return &Failure{Code: "invalid_company_identity"}
		}
		key := text(ts[0])
		metric := fields[key]
		if metric == "" {
			return &Failure{Code: "invalid_facts"}
		}
		period := "annual"
		duration := "12M"
		if strings.HasPrefix(key, "quarterly") {
			period = "quarterly"
			duration = "3M"
		}
		for _, value := range array(row[key]) {
			v := object(value)
			date := text(v["asOfDate"])
			if !validDate(date) || date > c.Now().UTC().Format("2006-01-02") || text(v["periodType"]) != duration || text(v["currencyCode"]) != "USD" {
				continue
			}
			n, ok := object(v["reportedValue"])["raw"].(json.Number)
			if !ok {
				return &Failure{Code: "invalid_fact_value"}
			}
			number, e := strconv.ParseFloat(string(n), 64)
			if e != nil || math.IsNaN(number) || math.IsInf(number, 0) {
				return &Failure{Code: "invalid_fact_value"}
			}
			rawValue := string(n)
			if metric == "capex" {
				rawValue = strconv.FormatFloat(-number, 'f', -1, 64)
			} // negative source cash outflow → positive expense, preserving refunds
			unit := "USD"
			if metric == "eps" {
				unit = "USD/shares"
			}
			if metric == "shares" {
				unit = "shares"
			}
			dedup := key + date
			if seen[dedup] {
				return &Failure{Code: "invalid_facts"}
			}
			seen[dedup] = true
			// Yahoo supplies vendor period ends, not SEC filing/accession or actual
			// fiscal start dates. Preserve those unknowns instead of inventing them.
			r.Payload.Facts = append(r.Payload.Facts, Fact{Period: period, Metric: metric, Tag: "yahoo:" + key, Unit: unit, Value: rawValue, End: date})
		}
	}
	if len(r.Payload.Facts) > 1000 {
		return &Failure{Code: "too_many_facts"}
	}
	if len(r.Payload.Facts) == 0 {
		return &Failure{Code: "not_found"}
	}
	sort.Slice(r.Payload.Facts, func(i, j int) bool {
		a, b := r.Payload.Facts[i], r.Payload.Facts[j]
		return a.Metric+a.Period+a.End < b.Metric+b.Period+b.End
	})
	r.Payload.Complete = false
	r.Payload.Window = "Yahoo vendor-standardized annual/quarterly periods; up to 4 annual and 5 quarterly observations; no SEC filing dates, accessions or fiscal start dates"
	return nil
}

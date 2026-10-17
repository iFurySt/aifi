package market

import (
	"context"
	"encoding/json"
	"math"
	"strconv"
	"time"
)

func sourceNumber(v any) (float64, bool) {
	if m, ok := v.(map[string]any); ok {
		v = m["raw"]
	}
	n, ok := v.(json.Number)
	if !ok {
		return 0, false
	}
	f, err := strconv.ParseFloat(string(n), 64)
	return f, err == nil && !math.IsNaN(f) && !math.IsInf(f, 0)
}
func publicPageQuote(data map[string]any, now time.Time) *MarketQuote {
	p := object(data["price"])
	price, ok := sourceNumber(p["regularMarketPrice"])
	stamp, valid := sourceNumber(p["regularMarketTime"])
	if !ok || price <= 0 || !valid || stamp <= 0 || time.Unix(int64(stamp), 0).After(now.Add(time.Minute)) {
		return nil
	}
	q := &MarketQuote{State: text(p["marketState"]), Price: price, AsOf: time.Unix(int64(stamp), 0).UTC().Format(time.RFC3339)}
	if v, ok := sourceNumber(p["marketCap"]); ok && v > 0 {
		q.MarketCap = &v
	}
	if v, ok := sourceNumber(p["regularMarketPreviousClose"]); ok && v > 0 {
		q.PreviousClose = &v
	}
	if v, ok := sourceNumber(p["exchangeDataDelayedBy"]); ok && v >= 0 && v <= 1440 {
		q.DelayMinutes = &v
	}
	if v, ok := sourceNumber(p["postMarketPrice"]); ok && v > 0 {
		if at, ok := sourceNumber(p["postMarketTime"]); ok && at > stamp && !time.Unix(int64(at), 0).After(now.Add(time.Minute)) {
			q.PostPrice = &v
			q.PostAsOf = time.Unix(int64(at), 0).UTC().Format(time.RFC3339)
		}
	}
	return q
}
func (c *Client) yahooOutlook(ctx context.Context, j Job, r *Result) error {
	symbol, err := yahooTicker(j.Subject)
	if err != nil {
		return err
	}
	data, err := c.yahooPage(ctx, symbol, r, "analysis")
	if err != nil {
		return err
	}
	r.Payload.Version = 1
	r.Payload.Quote = publicPageQuote(data, c.Now())
	r.Payload.Complete = false
	if j.Dataset == "analyst" {
		f := object(data["financialData"])
		consensus := Record{"recordKind": "price-target-consensus"}
		for source, target := range map[string]string{"targetMeanPrice": "targetConsensus", "targetMedianPrice": "targetMedian", "targetHighPrice": "targetHigh", "targetLowPrice": "targetLow", "numberOfAnalystOpinions": "analystCount", "recommendationMean": "recommendationMean"} {
			if v, ok := sourceNumber(f[source]); ok && v > 0 {
				consensus[target] = v
			}
		}
		if s := text(f["recommendationKey"]); s != "" {
			consensus["recommendation"] = s
		}
		if len(consensus) > 1 {
			r.Payload.Records = append(r.Payload.Records, consensus)
		}
		for _, item := range array(object(data["recommendationTrend"])["trend"]) {
			t := object(item)
			if text(t["period"]) != "0m" {
				continue
			}
			row := Record{"recordKind": "recommendations", "period": "0m"}
			total := 0.0
			for _, key := range []string{"strongBuy", "buy", "hold", "sell", "strongSell"} {
				if v, ok := sourceNumber(t[key]); ok && v >= 0 && math.Trunc(v) == v {
					row[key] = v
					total += v
				}
			}
			if total > 0 {
				row["count"] = total
				r.Payload.Records = append(r.Payload.Records, row)
			}
		}
		grades := array(object(data["upgradeDowngradeHistory"])["history"])
		for _, item := range grades {
			g := object(item)
			at, ok := sourceNumber(g["epochGradeDate"])
			if !ok || at <= 0 || time.Unix(int64(at), 0).After(c.Now()) || text(g["firm"]) == "" {
				continue
			}
			r.Payload.Records = append(r.Payload.Records, Record{"recordKind": "grades", "date": time.Unix(int64(at), 0).UTC().Format("2006-01-02"), "gradingCompany": text(g["firm"]), "previousGrade": text(g["fromGrade"]), "newGrade": text(g["toGrade"]), "action": text(g["action"])})
			if len(r.Payload.Records) >= 180 {
				break
			}
		}
		r.Payload.Window = "Yahoo analyst consensus/current recommendation distribution/recent grades; counts can represent different vendor coverage"
	} else {
		gaap := object(data["earningsGaap"])
		chart := map[string]any{}
		if text(gaap["financialCurrency"]) == "USD" {
			chart = object(gaap["earningsChart"])
		}
		for _, item := range array(chart["quarterly"]) {
			row := object(item)
			date := text(object(row["periodEndDate"])["fmt"])
			actual, ok := sourceNumber(row["actual"])
			if !ok || !validDate(date) || date > c.Now().UTC().Format("2006-01-02") {
				continue
			}
			rec := Record{"recordKind": "earnings", "basis": "GAAP", "currency": "USD", "periodEnd": date, "fiscalQuarter": text(row["fiscalQuarter"]), "actual": actual}
			if v, ok := sourceNumber(row["estimate"]); ok {
				rec["estimate"] = v
			}
			if d := text(object(row["reportedDate"])["fmt"]); validDate(d) {
				rec["reportedDate"] = d
			}
			r.Payload.Records = append(r.Payload.Records, rec)
		}
		calendar := object(object(data["calendarEvents"])["earnings"])
		dates := []string{}
		for _, value := range array(calendar["earningsDate"]) {
			d := text(object(value)["fmt"])
			if validDate(d) && d >= c.Now().UTC().Format("2006-01-02") {
				dates = append(dates, d)
			}
		}
		if len(dates) > 0 {
			rec := Record{"recordKind": "earnings-calendar", "dates": dates, "estimated": calendar["isEarningsDateEstimate"] == true, "basis": "GAAP"}
			if v, ok := sourceNumber(chart["currentQuarterEstimate"]); ok {
				rec["estimate"] = v
			}
			if s := text(chart["currentFiscalQuarter"]); s != "" {
				rec["fiscalQuarter"] = s
			}
			r.Payload.Records = append(r.Payload.Records, rec)
		}
		r.Payload.Window = "Yahoo GAAP actual/consensus EPS and estimated/reported earnings calendar; vendor periods, limited recent quarters"
	}
	if len(r.Payload.Records) == 0 {
		return &Failure{Code: "not_found"}
	}
	// Do not pretend unknown non-GAAP history is comparable to GAAP EPS.
	return nil
}

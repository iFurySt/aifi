package market

import (
	"context"
	"sort"
	"strings"
	"time"
)

// Yahoo publishes a top-holder sample, not a complete 13F census. Preserve the
// exact dates and fractions; never reconstruct shares from a rounded percentage.
func (c *Client) yahooFunds(ctx context.Context, j Job, r *Result) error {
	symbol, err := yahooTicker(j.Subject)
	if err != nil {
		return err
	}
	data, err := c.yahooPage(ctx, symbol, r, "holders")
	if err != nil {
		return err
	}
	r.Payload.Version = 1
	r.Payload.Complete = false
	r.Payload.Window = "Yahoo top institutional and mutual-fund holders; partial sample, mixed report dates. Vendor holding values are not guaranteed quarter-end 13F valuations. History contains only locally observed periods."
	summary := &OwnershipSummary{}
	breakdown := object(data["majorHoldersBreakdown"])
	for key, dest := range map[string]**float64{"institutionsPercentHeld": &summary.InstitutionsPercent, "institutionsFloatPercentHeld": &summary.FloatPercent, "insidersPercentHeld": &summary.InsidersPercent} {
		if n, ok := sourceNumber(breakdown[key]); ok && n >= 0 && n <= 10 {
			n *= 100
			*dest = &n
		}
	}
	if n, ok := sourceNumber(breakdown["institutionsCount"]); ok && n >= 0 && n <= 1e7 {
		summary.InstitutionsCount = &n
	}
	r.Payload.Ownership = summary
	records := []Record{}
	modules := 0
	for module, kind := range map[string]string{"institutionOwnership": "institution", "fundOwnership": "fund"} {
		raw, ok := object(data[module])["ownershipList"].([]any)
		if !ok {
			continue
		}
		modules++
		if len(raw) > 100 {
			return &Failure{Code: "source_window_too_large"}
		}
		seen := map[string]bool{}
		for _, item := range raw {
			row := object(item)
			name := strings.TrimSpace(text(row["organization"]))
			date := text(object(row["reportDate"])["fmt"])
			shares, valid := sourceNumber(row["position"])
			if name == "" || len(name) > 512 || strings.ContainsAny(name, "\r\n\x00") || !validDate(date) || date > c.Now().UTC().Format("2006-01-02") || !valid || shares < 0 || shares > 1e15 {
				return &Failure{Code: "invalid_holding"}
			}
			id := strings.ToLower(strings.Join(strings.Fields(name), " "))
			if seen[id] {
				return &Failure{Code: "ambiguous_holding"}
			}
			seen[id] = true
			rec := Record{"recordKind": "holding", "holderKind": kind, "holderId": id, "name": name, "reportDate": date, "shares": shares, "current": true, "observedAt": r.Evidence[0].FetchedAt.UTC().Format(time.RFC3339), "sourceURL": r.Evidence[0].URL}
			if n, ok := sourceNumber(row["value"]); ok && n >= 0 && n <= 1e18 {
				rec["value"] = n
			}
			if n, ok := sourceNumber(row["pctHeld"]); ok && n >= 0 && n <= 10 {
				rec["ownershipPercent"] = n * 100
			}
			if n, ok := sourceNumber(row["pctChange"]); ok && n >= -1 && n <= 1e6 {
				rec["changePercent"] = n * 100
			}
			records = append(records, rec)
		}
	}
	if modules == 0 {
		return &Failure{Code: "invalid_holders_page"}
	}
	previous := []Record{}
	if c.ReadFundsHistory != nil {
		previous, err = c.ReadFundsHistory(ctx, "yahoo", j.Subject)
		if err != nil {
			return err
		}
	}
	r.Payload.Records = mergeFundHistory(records, previous)
	return nil
}

func mergeFundHistory(current, previous []Record) []Record {
	rows := map[string]Record{}
	// Copy old maps: callers may share their immutable snapshot elsewhere.
	for _, r := range previous {
		if r["recordKind"] != "holding" || !validDate(text(r["reportDate"])) || text(r["holderId"]) == "" {
			continue
		}
		v := Record{}
		for k, item := range r {
			v[k] = item
		}
		v["current"] = false
		rows[text(r["holderKind"])+":"+text(r["holderId"])+":"+text(r["reportDate"])] = v
	}
	for _, r := range current {
		rows[text(r["holderKind"])+":"+text(r["holderId"])+":"+text(r["reportDate"])] = r
	}
	out := []Record{}
	for _, r := range rows {
		out = append(out, r)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i]["reportDate"] != out[j]["reportDate"] {
			return text(out[i]["reportDate"]) > text(out[j]["reportDate"])
		}
		return text(out[i]["holderKind"])+text(out[i]["holderId"]) < text(out[j]["holderKind"])+text(out[j]["holderId"])
	})
	dates := map[string]bool{}
	kept := []Record{}
	for _, r := range out {
		date := text(r["reportDate"])
		if !dates[date] && len(dates) >= 20 {
			continue
		}
		dates[date] = true
		kept = append(kept, r)
		if len(kept) == 2000 {
			break
		}
	}
	return kept
}

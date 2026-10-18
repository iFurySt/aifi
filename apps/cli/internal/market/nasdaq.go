package market

import (
	"context"
	"math"
	"net/url"
	"regexp"
	"strings"
)

var nasdaqPath = regexp.MustCompile(`^/api/(company/[A-Z0-9][A-Z0-9.-]{0,14}/company-profile|analyst/[A-Z0-9][A-Z0-9.-]{0,14}/targetprice)$`)

func validNasdaqEndpoint(u *url.URL) bool {
	return u.Scheme == "https" && u.Host == "api.nasdaq.com" && u.User == nil && u.RawQuery == "" && u.Fragment == "" && nasdaqPath.MatchString(u.Path)
}
func (c *Client) nasdaqEnrichment(ctx context.Context, j Job, r *Result) error {
	if !yahooSymbol.MatchString(j.Subject) {
		return &Failure{Code: "unsupported_symbol"}
	}
	path := "company/" + j.Subject + "/company-profile"
	if j.Dataset == "analyst" {
		path = "analyst/" + j.Subject + "/targetprice"
	} else if j.Dataset != "profile" {
		return &Failure{Code: "unsupported_dataset"}
	}
	raw, err := c.get(ctx, "nasdaq", "https://api.nasdaq.com/api/"+path, &r.Evidence)
	if err != nil {
		return err
	}
	var root map[string]any
	if err = decodeJSON(raw, &root); err != nil {
		return err
	}
	if code, ok := sourceNumber(object(root["status"])["rCode"]); ok && code != 200 {
		return &Failure{Code: "provider_error"}
	}
	data := object(root["data"])
	if len(data) == 0 {
		return &Failure{Code: "not_found"}
	}
	if j.Dataset == "profile" {
		field := func(key string) string { return text(object(data[key])["value"]) }
		if field("Symbol") != j.Subject || field("CompanyName") == "" {
			return &Failure{Code: "invalid_company_identity"}
		}
		p := &Profile{Symbol: j.Subject, Name: field("CompanyName"), Description: field("CompanyDescription"), Industry: field("Industry"), Sector: field("Sector"), Type: "EQUITY"}
		if len(p.Name) > 512 || len(p.Description) > 20000 || len(p.Industry) > 512 || len(p.Sector) > 256 {
			return &Failure{Code: "invalid_profile"}
		}
		if p.Description == "" && p.Industry == "" {
			return &Failure{Code: "not_found"}
		}
		r.Payload.Profile = p
		r.Payload.Window = "Nasdaq public US-listed company description and classification; fields absent from the source remain missing"
	} else {
		if !strings.EqualFold(text(data["symbol"]), j.Subject) {
			return &Failure{Code: "invalid_company_identity"}
		}
		f := object(data["consensusOverview"])
		consensus := Record{"recordKind": "price-target-consensus"}
		for src, dst := range map[string]string{"lowPriceTarget": "targetLow", "highPriceTarget": "targetHigh", "priceTarget": "targetConsensus"} {
			if v, ok := sourceNumber(f[src]); ok && v > 0 {
				consensus[dst] = v
			}
		}
		low, hasLow := consensus["targetLow"].(float64)
		high, hasHigh := consensus["targetHigh"].(float64)
		mean, hasMean := consensus["targetConsensus"].(float64)
		if hasLow && hasHigh && low > high || hasMean && (hasLow && mean < low || hasHigh && mean > high) {
			return &Failure{Code: "invalid_analyst_data"}
		}
		count := 0.0
		countsKnown := true
		for _, key := range []string{"buy", "hold", "sell"} {
			v, ok := sourceNumber(f[key])
			if !ok || v < 0 || math.Trunc(v) != v {
				countsKnown = false
				break
			}
			count += v
		}
		if countsKnown && count > 0 {
			consensus["analystCount"] = count
		}
		if !hasLow && !hasHigh && !hasMean {
			return &Failure{Code: "not_found"}
		}
		r.Payload.Records = []Record{consensus}
		r.Payload.Window = "Nasdaq public analyst target consensus (US listing currency); no individual analyst identities, grade events or five-level recommendation distribution supplied"
	}
	r.Payload.Version = 1
	r.Payload.Complete = false
	return nil
}

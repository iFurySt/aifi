package market

import (
	"context"
	"math"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"
)

var fundDataPath = regexp.MustCompile(`^/data/13f/[0-9]{18}$`)

func IsFundSourceURL(value string) bool {
	u, err := url.Parse(value)
	return err == nil && u.Scheme == "https" && u.User == nil && valid13FEndpoint(u)
}

type bulkFundPosition struct {
	cusip         string
	shares, value float64
	hasValue      bool
}
type bulkFundIndex struct {
	symbols map[string][]bulkFundPosition
	cusips  map[string][]bulkFundPosition
	count   int
}
type bulkFundReport struct {
	index bulkFundIndex
	proof Evidence
	at    time.Time
}
type bulkFundManager struct {
	reports map[string]fundReport
	proof   Evidence
	at      time.Time
}
type fundBatchCache struct {
	mu        sync.Mutex
	managers  map[string]bulkFundManager
	reports   map[string]bulkFundReport
	positions int
}

func parseBulkFundReport(raw []byte) (bulkFundIndex, error) {
	var root map[string]any
	if err := decodeJSON(raw, &root); err != nil {
		return bulkFundIndex{}, err
	}
	rows, ok := root["data"].([]any)
	if !ok || len(rows) > 100000 {
		return bulkFundIndex{}, &Failure{Code: "invalid_fund_report"}
	}
	index := bulkFundIndex{symbols: map[string][]bulkFundPosition{}, cusips: map[string][]bulkFundPosition{}}
	for _, item := range rows {
		row := array(item)
		if len(row) != 9 {
			return bulkFundIndex{}, &Failure{Code: "invalid_fund_report"}
		}
		// Options and principal balances are not common-share positions.
		if row[8] != nil && text(row[8]) != "" || row[7] != nil {
			continue
		}
		symbol, class, cusip := text(row[0]), strings.ToUpper(text(row[2])), text(row[3])
		if symbol != "" && !yahooSymbol.MatchString(symbol) || !cusipPattern.MatchString(cusip) {
			return bulkFundIndex{}, &Failure{Code: "invalid_fund_report"}
		}
		if strings.Contains(class, "NOTE") || strings.Contains(class, "BOND") || strings.Contains(class, "WARRANT") || strings.Contains(class, "PFD") {
			continue
		}
		shares, ok := sourceNumber(row[6])
		if !ok || shares < 0 || shares > 1e15 || math.Trunc(shares) != shares {
			return bulkFundIndex{}, &Failure{Code: "invalid_fund_report"}
		}
		p := bulkFundPosition{cusip: cusip, shares: shares}
		if value, valid := sourceNumber(row[4]); valid && value >= 0 && value < 1e15 {
			p.value = value * 1000
			p.hasValue = true
		}
		// Dot/dash are source ticker spellings; ambiguous matches stay rejected.
		key := strings.ReplaceAll(symbol, ".", "-")
		index.cusips[cusip] = append(index.cusips[cusip], p)
		index.count++
		if symbol != "" {
			index.symbols[key] = append(index.symbols[key], p)
		}
	}
	return index, nil
}

func (c *Client) fundProof(ctx context.Context, ev Evidence) (Evidence, error) {
	if c.ArchiveFundEvidence != nil {
		return c.ArchiveFundEvidence(ctx, ev)
	}
	return ev, nil
}
func freshFundCache(now, at time.Time) bool { return !now.Before(at) && now.Sub(at) < 7*24*time.Hour }

// Failed/changed public responses must not poison the shared seven-day cache.
func (c *Client) validatedFundSource(ctx context.Context, endpoint string, validate func([]byte) error) (Evidence, error) {
	key := "thirteenf-v1:" + endpoint
	if c.ReadStage != nil {
		cached, err := c.ReadStage(ctx, key)
		if err != nil {
			return Evidence{}, err
		}
		if cached != nil && cached.URL == endpoint && freshFundCache(c.Now(), cached.FetchedAt) && validate(cached.Body) == nil {
			return *cached, nil
		}
	}
	var evidence []Evidence
	raw, err := c.get(ctx, "thirteenf", endpoint, &evidence)
	if err != nil {
		return Evidence{}, err
	}
	if err = validate(raw); err != nil {
		return Evidence{}, err
	}
	ev := evidence[len(evidence)-1]
	if c.SaveStage != nil {
		if err = c.SaveStage(ctx, key, ev); err != nil {
			return Evidence{}, err
		}
	}
	return ev, nil
}

func (c *Client) batchFundManager(ctx context.Context, m FundManager) (bulkFundManager, error) {
	if cached, ok := c.fundBatch.managers[m.CIK]; ok && freshFundCache(c.Now(), cached.at) {
		return cached, nil
	}
	var reports map[string]fundReport
	ev, err := c.validatedFundSource(ctx, m.ProfileURL, func(raw []byte) error {
		var parseErr error
		reports, parseErr = parse13FReports(raw, m.CIK, c.Now())
		return parseErr
	})
	if err != nil {
		return bulkFundManager{}, err
	}
	proof, err := c.fundProof(ctx, ev)
	if err != nil {
		return bulkFundManager{}, err
	}
	entry := bulkFundManager{reports: reports, proof: proof, at: ev.FetchedAt}
	c.fundBatch.managers[m.CIK] = entry
	return entry, nil
}
func (c *Client) batchFundReport(ctx context.Context, report fundReport) (bulkFundReport, error) {
	if cached, ok := c.fundBatch.reports[report.ID]; ok && freshFundCache(c.Now(), cached.at) {
		return cached, nil
	}
	endpoint := "https://13f.info/data/13f/" + strings.SplitN(report.ID, "-", 2)[0]
	var index bulkFundIndex
	ev, err := c.validatedFundSource(ctx, endpoint, func(raw []byte) error {
		var parseErr error
		index, parseErr = parseBulkFundReport(raw)
		return parseErr
	})
	if err != nil {
		return bulkFundReport{}, err
	}
	proof, err := c.fundProof(ctx, ev)
	if err != nil {
		return bulkFundReport{}, err
	}
	entry := bulkFundReport{index: index, proof: proof, at: ev.FetchedAt}
	// At most 16 managers × 20 quarters plus current generation overlap. Bound
	// in-memory parsed indexes independently of the durable staging cache.
	if old, ok := c.fundBatch.reports[report.ID]; ok {
		c.fundBatch.positions -= old.index.count
	}
	if len(c.fundBatch.reports) >= 640 || c.fundBatch.positions+index.count > 500000 {
		c.fundBatch.reports = map[string]bulkFundReport{}
		c.fundBatch.positions = 0
	}
	c.fundBatch.reports[report.ID] = entry
	c.fundBatch.positions += index.count
	return entry, nil
}

type bulkFundWindow struct {
	manager FundManager
	meta    bulkFundManager
	byDate  map[string]bulkFundReport
}

// Anchor all managers to one CUSIP from the newest reported ticker match.
// Otherwise a manager's old position in a reused ticker can be stitched into
// another manager's current security. Conflicting newest matches remain gaps.
func fundWindowCUSIP(windows []bulkFundWindow, periods []string, key string) (string, error) {
	for _, date := range periods {
		candidates := map[string]bool{}
		for _, window := range windows {
			rows := window.byDate[date].index.symbols[key]
			if len(rows) > 1 {
				return "", &Failure{Code: "ambiguous_fund_history"}
			}
			if len(rows) == 1 && rows[0].shares > 0 {
				candidates[rows[0].cusip] = true
			}
		}
		if len(candidates) > 1 {
			return "", &Failure{Code: "ambiguous_fund_history"}
		}
		for cusip := range candidates {
			return cusip, nil
		}
	}
	return "", nil
}

func (c *Client) thirteenFBatchFunds(ctx context.Context, j Job, r *Result) error {
	periods, err := fundReportPeriods(j.Window)
	if err != nil {
		return err
	}
	if j.Window != FundHistoryWindow(c.Now(), len(periods)) {
		return &Failure{Code: "obsolete_fund_window"}
	}
	if !yahooSymbol.MatchString(j.Subject) {
		return &Failure{Code: "unsupported_symbol"}
	}
	c.fundBatch.mu.Lock()
	defer c.fundBatch.mu.Unlock()
	if c.fundBatch.managers == nil {
		c.fundBatch.managers = map[string]bulkFundManager{}
	}
	if c.fundBatch.reports == nil {
		c.fundBatch.reports = map[string]bulkFundReport{}
	}
	key := strings.ReplaceAll(j.Subject, ".", "-")
	proofs := map[string]bool{}
	addProof := func(ev Evidence) {
		if !proofs[ev.URL] {
			proofs[ev.URL] = true
			r.Evidence = append(r.Evidence, ev)
		}
	}
	windows := []bulkFundWindow{}
	for _, manager := range fundManagers {
		meta, err := c.batchFundManager(ctx, manager)
		if err != nil {
			return err
		}
		addProof(meta.proof)
		byDate := map[string]bulkFundReport{}
		for _, date := range periods {
			report, known := meta.reports[date]
			if !known || !report.Complete {
				continue
			}
			data, err := c.batchFundReport(ctx, report)
			if err != nil {
				return err
			}
			byDate[date] = data
			addProof(data.proof)
		}
		windows = append(windows, bulkFundWindow{manager: manager, meta: meta, byDate: byDate})
	}
	selectedCusip, err := fundWindowCUSIP(windows, periods, key)
	if err != nil {
		return err
	}
	for _, window := range windows {
		manager, meta, byDate := window.manager, window.meta, window.byDate
		held := false
		for _, data := range byDate {
			for _, p := range data.index.cusips[selectedCusip] {
				if p.shares > 0 {
					held = true
				}
			}
		}
		if !held {
			continue
		}
		for i, date := range periods {
			data, known := byDate[date]
			if !known {
				continue
			}
			report := meta.reports[date]
			tickerPositions := data.index.symbols[key]
			positions := data.index.cusips[selectedCusip]
			if len(positions) > 1 || len(tickerPositions) > 1 {
				return &Failure{Code: "ambiguous_fund_history"}
			}
			// A ticker reused for a different CUSIP is a gap, never a stitched
			// history or a fabricated zero for the previous instrument.
			if len(tickerPositions) == 1 && tickerPositions[0].cusip != selectedCusip {
				continue
			}
			row := Record{"recordKind": "holding", "holderKind": "institution", "holderId": "cik:" + manager.CIK, "managerCik": manager.CIK, "name": manager.DisplayName, "reportDate": date, "current": i == 0, "observedAt": data.at.UTC().Format(time.RFC3339), "sourceURL": data.proof.URL, "cusip": selectedCusip, "basis": "reported-common-shares", "filingId": report.ID, "filed": report.Filed}
			if len(positions) == 0 {
				row["shares"] = float64(0)
				row["reportedAbsence"] = true
			} else {
				p := positions[0]
				row["shares"] = p.shares
				if p.hasValue {
					row["value"] = p.value
				}
			}
			r.Payload.Records = append(r.Payload.Records, row)
		}
	}
	r.Payload.Version = 2
	r.Payload.ReportPeriods = periods
	r.Payload.Complete = false
	r.Payload.Window = "Tracked 13F managers, complete shared reports; common shares only, exact source ticker/CUSIP mapping. Confirmed absence requires a complete report. Missing reports and changed CUSIPs remain gaps; no split adjustment or full institutional census."
	return nil
}

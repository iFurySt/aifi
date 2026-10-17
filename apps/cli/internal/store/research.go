package store

import (
	"bytes"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/ifuryst/aifi/apps/cli/internal/market"
)

var ResearchDatasets = []string{"prices", "profile", "filings", "facts", "actions", "insiders", "funds", "politicians", "analyst", "earnings", "peers", "news"}

type DatasetConfig struct {
	Enabled       bool `json:"enabled"`
	IntervalHours int  `json:"intervalHours"`
}
type ProviderLimit struct {
	PerMinute int `json:"perMinute"`
	PerDay    int `json:"perDay"`
}
type ResearchConfig struct {
	Revision             int                      `json:"revision"`
	PriceSource          string                   `json:"priceSource"`
	ProfileSource        string                   `json:"profileSource"`
	FactsSource          string                   `json:"factsSource"`
	FundsHistoryQuarters int                      `json:"fundsHistoryQuarters"`
	FundsSource          string                   `json:"fundsSource"`
	AnalystSource        string                   `json:"analystSource"`
	FilingsSource        string                   `json:"filingsSource"`
	Automatic            bool                     `json:"automatic"`
	HistoryDays          int                      `json:"historyDays"`
	Datasets             map[string]DatasetConfig `json:"datasets"`
	Limits               map[string]ProviderLimit `json:"limits"`
}

func (s *Store) ResearchConfig(ctx context.Context) (ResearchConfig, error) {
	var c ResearchConfig
	var raw string
	e := s.db.QueryRowContext(ctx, "SELECT revision,config_json FROM research_config WHERE singleton=1").Scan(&c.Revision, &raw)
	if e != nil {
		return c, e
	}
	revision := c.Revision
	e = json.Unmarshal([]byte(raw), &c)
	c.Revision = revision
	if c.Limits == nil {
		c.Limits = map[string]ProviderLimit{"massive": {5, 10000}, "sec": {240, 100000}, "fmp": {4, 200}}
	}
	if c.FundsHistoryQuarters == 0 {
		c.FundsHistoryQuarters = 14
	}
	if c.Limits["thirteenf"].PerMinute == 0 {
		c.Limits["thirteenf"] = ProviderLimit{12, 2000}
	}
	if c.Limits["yahoo"].PerMinute == 0 {
		c.Limits["yahoo"] = ProviderLimit{20, 10000}
	}
	if _, ok := c.Datasets["peers"]; !ok {
		c.Datasets["peers"] = DatasetConfig{true, 168}
	}
	if _, ok := c.Datasets["earnings"]; !ok {
		c.Datasets["earnings"] = DatasetConfig{true, 24}
	}
	if c.FundsSource == "" {
		c.FundsSource = "yahoo"
		if c.Datasets["funds"].Enabled {
			c.FundsSource = "fmp"
		}
	}
	if c.AnalystSource == "" {
		c.AnalystSource = "yahoo"
		if c.Datasets["analyst"].Enabled {
			c.AnalystSource = "fmp"
		}
	}
	if c.PriceSource == "" {
		c.PriceSource = "yahoo"
	}
	if c.ProfileSource == "" {
		c.ProfileSource = "yahoo"
	}
	if c.FactsSource == "" {
		c.FactsSource = "yahoo"
	}
	if c.FilingsSource == "" {
		c.FilingsSource = "yahoo"
	}
	return c, e
}
func (c ResearchConfig) ProviderFor(dataset string) string {
	switch dataset {
	case "prices":
		return c.PriceSource
	case "funds":
		return c.FundsSource
	case "analyst":
		return c.AnalystSource
	case "earnings", "peers":
		return "yahoo"
	case "profile":
		return c.ProfileSource
	case "facts":
		return c.FactsSource
	case "filings":
		return c.FilingsSource
	case "identity", "insiders":
		return "sec"
	case "actions":
		return "massive"
	default:
		return "fmp"
	}
}
func (s *Store) SaveResearchConfig(ctx context.Context, c ResearchConfig) (ResearchConfig, error) {
	if c.FundsHistoryQuarters == 0 {
		c.FundsHistoryQuarters = 14
	}
	if c.Limits != nil && c.Limits["thirteenf"].PerMinute == 0 {
		c.Limits["thirteenf"] = ProviderLimit{12, 2000}
	}
	if c.FundsHistoryQuarters < 4 || c.FundsHistoryQuarters > 20 {
		return c, errors.New("invalid funds history")
	}
	if c.Revision < 0 || c.HistoryDays < 30 || c.HistoryDays > 730 || len(c.Datasets) != len(ResearchDatasets) || len(c.Limits) != 5 || (c.PriceSource != "yahoo" && c.PriceSource != "massive") {
		return c, errors.New("invalid research settings")
	}
	if c.FundsSource == "" {
		c.FundsSource = "yahoo"
	}
	if c.FundsSource != "yahoo" && c.FundsSource != "fmp" && c.FundsSource != "thirteenf" {
		return c, errors.New("invalid funds source")
	}
	if c.AnalystSource != "yahoo" && c.AnalystSource != "fmp" {
		return c, errors.New("invalid analyst source")
	}
	if (c.ProfileSource != "yahoo" && c.ProfileSource != "massive") || (c.FactsSource != "yahoo" && c.FactsSource != "sec") || (c.FilingsSource != "yahoo" && c.FilingsSource != "sec") {
		return c, errors.New("invalid research source")
	}
	for _, d := range ResearchDatasets {
		v, ok := c.Datasets[d]
		if !ok || v.IntervalHours < 1 || v.IntervalHours > 2160 {
			return c, errors.New("invalid dataset interval")
		}
	}
	for _, p := range []string{"massive", "sec", "fmp", "yahoo", "thirteenf"} {
		v, ok := c.Limits[p]
		if !ok || v.PerMinute < 1 || v.PerMinute > 300 || v.PerDay < 1 || v.PerDay > 1000000 {
			return c, errors.New("invalid provider budget")
		}
	}
	tx, e := s.db.BeginTx(ctx, nil)
	if e != nil {
		return c, e
	}
	defer tx.Rollback()
	r, e := tx.ExecContext(ctx, "UPDATE research_config SET config_json=?,revision=revision+1 WHERE singleton=1 AND revision=?", market.Marshal(c), c.Revision)
	if e != nil {
		return c, e
	}
	n, e := r.RowsAffected()
	if e != nil {
		return c, e
	}
	if n != 1 {
		return c, errors.New("research settings changed; reload and retry")
	}
	for d, v := range c.Datasets {
		if _, e = tx.ExecContext(ctx, "UPDATE research_jobs SET next_run=strftime('%Y-%m-%dT%H:%M:%f000000Z',last_success,? || ' hours') WHERE dataset=? AND state='idle' AND manual=0 AND last_success IS NOT NULL", v.IntervalHours, d); e != nil {
			return c, e
		}
	}
	if e = tx.Commit(); e != nil {
		return c, e
	}

	return s.ResearchConfig(ctx)
}
func (s *Store) ResearchSymbols(ctx context.Context) ([]string, error) {
	rows, e := s.db.QueryContext(ctx, `SELECT DISTINCT UPPER(l.source_symbol) FROM directory_head h JOIN directory_memberships m ON m.snapshot_id=h.snapshot_id JOIN listings l ON l.id=m.listing_id WHERE m.etf=0 AND m.test=0 ORDER BY UPPER(l.source_symbol)`)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var v string
		if e = rows.Scan(&v); e != nil {
			return nil, e
		}
		out = append(out, v)
	}
	return out, rows.Err()
}
func (s *Store) CIK(ctx context.Context, symbol string) (string, error) {
	var cik string
	e := s.db.QueryRowContext(ctx, "SELECT cik FROM research_aliases WHERE symbol=?", symbol).Scan(&cik)
	if errors.Is(e, sql.ErrNoRows) {
		return "", nil
	}
	return cik, e
}
func (s *Store) AddResearchJobs(ctx context.Context, jobs []market.Job, now time.Time) error {
	tx, e := s.db.BeginTx(ctx, nil)
	if e != nil {
		return e
	}
	defer tx.Rollback()
	stmt, e := tx.PrepareContext(ctx, "INSERT OR IGNORE INTO research_jobs(provider,dataset,subject,window,next_run,manual) VALUES(?,?,?,?,?,?)")
	if e != nil {
		return e
	}
	defer stmt.Close()
	for _, j := range jobs {
		if _, e = stmt.ExecContext(ctx, j.Provider, j.Dataset, j.Subject, j.Window, stamp(now), j.Manual); e != nil {
			return e
		}
	}
	return tx.Commit()
}

// Claims are durable and fenced. Abandoned jobs become eligible after their lease.
func (s *Store) ClaimResearchJob(ctx context.Context, provider string, enabled []string, manualOnly bool, now time.Time) (*market.Job, error) {
	if len(enabled) == 0 {
		return nil, nil
	}
	tx, e := s.db.BeginTx(ctx, nil)
	if e != nil {
		return nil, e
	}
	defer tx.Rollback()
	if _, e = tx.ExecContext(ctx, "UPDATE research_jobs SET state='queued',lease=NULL,lease_until=NULL WHERE state='running' AND lease_until<=?", stamp(now)); e != nil {
		return nil, e
	}
	marks := []string{}
	args := []any{provider, stamp(now)}
	for _, v := range enabled {
		marks = append(marks, "?")
		args = append(args, v)
	}
	manualFilter := ""
	if manualOnly {
		manualFilter = " AND manual=1"
	}
	args = append(args, now.AddDate(0, 0, -14).Format("2006-01-02"))
	var j market.Job
	// Explicit repairs lead automatic work. Current index members (including shared
	// SEC issuers) lead the alphabetical universe without duplicating constituent lists.
	e = tx.QueryRowContext(ctx, `SELECT id,provider,dataset,subject,window,attempts,manual FROM research_jobs WHERE provider=? AND next_run<=? AND state IN ('queued','idle','failed') AND dataset IN (`+strings.Join(marks, ",")+`)`+manualFilter+` ORDER BY manual DESC,CASE WHEN dataset='identity' THEN 0 WHEN provider='massive' AND dataset='prices' AND subject>=? THEN 1 WHEN dataset='actions' AND subject='us' THEN 2 WHEN subject IN ('AAPL','MSFT','NVDA','cik:0000320193','cik:0000789019','cik:0001045810') THEN 2 WHEN subject IN (SELECT m.symbol FROM index_heads h JOIN index_memberships m ON m.snapshot_id=h.snapshot_id UNION SELECT 'cik:'||a.cik FROM index_heads h JOIN index_memberships m ON m.snapshot_id=h.snapshot_id JOIN research_aliases a ON a.symbol=m.symbol) THEN 3 WHEN dataset='prices' THEN 4 ELSE 5 END,CASE WHEN provider='massive' AND dataset='prices' THEN subject END DESC,next_run,id LIMIT 1`, args...).Scan(&j.ID, &j.Provider, &j.Dataset, &j.Subject, &j.Window, &j.Attempts, &j.Manual)
	if errors.Is(e, sql.ErrNoRows) {
		return nil, nil
	}
	if e != nil {
		return nil, e
	}
	j.Lease = id()
	_, e = tx.ExecContext(ctx, "UPDATE research_jobs SET state='running',lease=?,lease_until=? WHERE id=?", j.Lease, stamp(now.Add(15*time.Minute)), j.ID)
	if e != nil {
		return nil, e
	}
	return &j, tx.Commit()
}
func (s *Store) FinishResearchJob(ctx context.Context, j market.Job, result market.Result, now time.Time, next time.Time) error {
	if len(result.Evidence) == 0 {
		return errors.New("source evidence is required")
	}
	tx, e := s.db.BeginTx(ctx, nil)
	if e != nil {
		return e
	}
	defer tx.Rollback()
	var active int
	if e = tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM research_jobs WHERE id=? AND lease=? AND state='running' AND lease_until>?", j.ID, j.Lease, stamp(now)).Scan(&active); e != nil {
		return e
	}
	if active != 1 {
		return errors.New("research job lease expired")
	}
	hashes := []string{}
	for _, ev := range result.Evidence {
		if len(ev.Body) == 0 || len(ev.Body) > 32<<20 || strings.Contains(ev.URL, "apiKey=") || strings.Contains(ev.URL, "apikey=") {
			return errors.New("invalid source evidence")
		}
		hash := sha256.Sum256(append([]byte(ev.URL+"\n"), ev.Body...))
		h := hex.EncodeToString(hash[:])
		hashes = append(hashes, h)
		var z bytes.Buffer
		w := gzip.NewWriter(&z)
		if _, e = w.Write(ev.Body); e != nil {
			return e
		}
		if e = w.Close(); e != nil {
			return e
		}
		if _, e = tx.ExecContext(ctx, "INSERT OR IGNORE INTO research_evidence VALUES(?,?,?,?,?)", h, j.Provider, ev.URL, stamp(ev.FetchedAt), z.Bytes()); e != nil {
			return e
		}
	}
	raw, e := json.Marshal(result.Payload)
	if e != nil {
		return e
	}
	fingerprint := sha256.Sum256([]byte(j.Provider + ":" + j.Dataset + ":" + j.Subject + ":" + strings.Join(hashes, ":") + ":" + string(raw)))
	snapshot := hex.EncodeToString(fingerprint[:])
	if _, e = tx.ExecContext(ctx, "INSERT OR IGNORE INTO research_snapshots VALUES(?,?,?,?,?,?)", snapshot, j.Provider, j.Dataset, j.Subject, stamp(now), func() string {
		if j.Dataset == "actions" && j.Subject == "us" {
			payload := result.Payload
			payload.Records = nil
			return market.Marshal(payload)
		}
		return string(raw)
	}()); e != nil {
		return e
	}
	if j.Dataset == "actions" && j.Subject == "us" {
		for _, record := range result.Payload.Records {
			symbol, ok := record["ticker"].(string)
			if !ok || symbol == "" {
				return errors.New("invalid action ticker")
			}
			body := market.Marshal(record)
			hash := sha256.Sum256([]byte(body))
			if _, e = tx.ExecContext(ctx, "INSERT OR IGNORE INTO research_actions VALUES(?,?,?,?)", snapshot, symbol, hex.EncodeToString(hash[:]), body); e != nil {
				return e
			}
		}
	}
	for _, h := range hashes {
		if _, e = tx.ExecContext(ctx, "INSERT OR IGNORE INTO research_snapshot_sources VALUES(?,?)", snapshot, h); e != nil {
			return e
		}
	}
	if _, e = tx.ExecContext(ctx, "INSERT INTO research_heads VALUES(?,?,?) ON CONFLICT(dataset,subject) DO UPDATE SET snapshot_id=excluded.snapshot_id", j.Dataset, j.Subject, snapshot); e != nil {
		return e
	}
	if len(result.Aliases) > 0 {
		if j.Dataset != "identity" {
			return errors.New("unexpected identity mapping")
		}
		if _, e = tx.ExecContext(ctx, "DELETE FROM research_aliases"); e != nil {
			return e
		}
		for symbol, cik := range result.Aliases {
			if _, e = tx.ExecContext(ctx, "INSERT INTO research_aliases VALUES(?,?)", symbol, cik); e != nil {
				return e
			}
		}
	}
	basis := result.Basis
	if basis == "" {
		basis = "raw"
	}
	if basis != "raw" && basis != "split-adjusted" {
		return errors.New("invalid price basis")
	}
	if j.Provider == "yahoo" && len(result.Bars) > 0 {
		// Replace the whole symbol window atomically: new splits restate historical OHLC.
		if _, e = tx.ExecContext(ctx, "DELETE FROM daily_bars WHERE provider=? AND symbol=?", j.Provider, j.Subject); e != nil {
			return e
		}
	}
	for _, b := range result.Bars {
		if b.Symbol == "" || !validBar(b) {
			return errors.New("invalid OHLCV")
		}
		if _, e = tx.ExecContext(ctx, `INSERT INTO daily_bars VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(provider,symbol,date,basis) DO UPDATE SET open=excluded.open,high=excluded.high,low=excluded.low,close=excluded.close,volume=excluded.volume,snapshot_id=excluded.snapshot_id`, j.Provider, b.Symbol, b.Date, basis, b.Open, b.High, b.Low, b.Close, b.Volume, snapshot); e != nil {
			return e
		}
	}
	_, e = tx.ExecContext(ctx, "UPDATE research_jobs SET state='idle',manual=0,attempts=0,next_run=?,last_success=?,error='',lease=NULL,lease_until=NULL WHERE id=? AND lease=?", stamp(next), stamp(now), j.ID, j.Lease)
	if e != nil {
		return e
	}
	return tx.Commit()
}
func validBar(b market.Bar) bool {
	for _, v := range []float64{b.Open, b.High, b.Low, b.Close, b.Volume} {
		if math.IsNaN(v) || math.IsInf(v, 0) {
			return false
		}
	}
	_, e := time.Parse("2006-01-02", b.Date)
	return e == nil && b.Open > 0 && b.Close > 0 && b.High >= math.Max(b.Open, b.Close) && b.Low <= math.Min(b.Open, b.Close) && b.Low > 0 && b.Volume >= 0 && !math.IsNaN(b.Volume) && !math.IsInf(b.Volume, 0)
}
func (s *Store) FailResearchJob(ctx context.Context, j market.Job, code string, next time.Time, blocked bool) error {
	state := "failed"
	if blocked {
		state = "blocked"
	}
	_, e := s.db.ExecContext(ctx, "UPDATE research_jobs SET state=?,attempts=attempts+1,error=?,next_run=?,lease=NULL,lease_until=NULL WHERE id=? AND lease=?", state, code, stamp(next), j.ID, j.Lease)
	return e
}
func (s *Store) ResetResearchProvider(ctx context.Context, provider string) error {
	tx, e := s.db.BeginTx(ctx, nil)
	if e != nil {
		return e
	}
	defer tx.Rollback()
	if _, e = tx.ExecContext(ctx, "UPDATE provider_budgets SET blocked='',cooldown_until='' WHERE provider=?", provider); e != nil {
		return e
	}
	if _, e = tx.ExecContext(ctx, "UPDATE research_jobs SET state='queued',next_run=?,error='' WHERE provider=? AND state='blocked'", stamp(time.Now()), provider); e != nil {
		return e
	}
	return tx.Commit()
}
func (s *Store) RequestResearchSync(ctx context.Context) error {
	_, e := s.db.ExecContext(ctx, "UPDATE research_jobs SET next_run=?,manual=1 WHERE state IN ('idle','queued','failed')", stamp(time.Now()))
	return e
}

// Reserve a global slot before each HTTP request. Returning a wait does not consume
// a slot, so parallel workers and new processes share the same rate/day budget.
func (s *Store) ReserveProvider(ctx context.Context, provider string, limit ProviderLimit, now time.Time) (time.Duration, string, error) {
	tx, e := s.db.BeginTx(ctx, nil)
	if e != nil {
		return 0, "", e
	}
	defer tx.Rollback()
	if _, e = tx.ExecContext(ctx, "INSERT OR IGNORE INTO provider_budgets(provider,next_request,day,calls) VALUES(?,?,?,0)", provider, stamp(now), now.UTC().Format("2006-01-02")); e != nil {
		return 0, "", e
	}
	var next, day, cooldown, blocked string
	var calls int
	if e = tx.QueryRowContext(ctx, "SELECT next_request,day,calls,cooldown_until,blocked FROM provider_budgets WHERE provider=?", provider).Scan(&next, &day, &calls, &cooldown, &blocked); e != nil {
		return 0, "", e
	}
	if blocked != "" {
		return 0, blocked, nil
	}
	due, _ := time.Parse(time.RFC3339Nano, next)
	cd, _ := time.Parse(time.RFC3339Nano, cooldown)
	if cd.After(due) {
		due = cd
	}
	today := now.UTC().Format("2006-01-02")
	if day != today {
		calls = 0
	}
	if calls >= limit.PerDay {
		tomorrow := time.Date(now.UTC().Year(), now.UTC().Month(), now.UTC().Day()+1, 0, 0, 0, 0, time.UTC)
		if tomorrow.After(due) {
			due = tomorrow
		}
	}
	if due.After(now) {
		return due.Sub(now), "", nil
	}
	_, e = tx.ExecContext(ctx, "UPDATE provider_budgets SET next_request=?,day=?,calls=? WHERE provider=?", stamp(now.Add(time.Minute/time.Duration(limit.PerMinute))), today, calls+1, provider)
	if e != nil {
		return 0, "", e
	}
	return 0, "", tx.Commit()
}
func (s *Store) CooldownProvider(ctx context.Context, provider, blocked string, until time.Time) error {
	_, e := s.db.ExecContext(ctx, `INSERT INTO provider_budgets VALUES(?,?,?,0,?,?) ON CONFLICT(provider) DO UPDATE SET cooldown_until=MAX(cooldown_until,excluded.cooldown_until),blocked=excluded.blocked`, provider, stamp(time.Now()), time.Now().UTC().Format("2006-01-02"), stamp(until), blocked)
	return e
}

type DatasetView struct {
	Provider    string         `json:"provider"`
	FetchedAt   string         `json:"fetchedAt"`
	RecordCount int            `json:"recordCount"`
	Sources     []string       `json:"sources"`
	Data        market.Payload `json:"data"`
}
type StockResearch struct {
	Symbol   string                 `json:"symbol"`
	Bars     []market.Bar           `json:"bars"`
	Basis    string                 `json:"basis"`
	Datasets map[string]DatasetView `json:"datasets"`
	Coverage map[string]string      `json:"coverage"`
}

func (s *Store) ResearchRead(ctx context.Context, symbol string) (StockResearch, error) {
	out := StockResearch{Symbol: symbol, Bars: []market.Bar{}, Basis: "raw", Datasets: map[string]DatasetView{}, Coverage: map[string]string{}}
	cik, e := s.CIK(ctx, symbol)
	if e != nil {
		return out, e
	}
	cfg, e := s.ResearchConfig(ctx)
	if e != nil {
		return out, e
	}
	// One read transaction gives all panels a consistent committed view.
	tx, e := s.db.BeginTx(ctx, &sql.TxOptions{ReadOnly: true})
	if e != nil {
		return out, e
	}
	defer tx.Rollback()
	rows, e := tx.QueryContext(ctx, `SELECT h.dataset,s.id,s.provider,s.fetched_at,s.payload_json FROM research_heads h JOIN research_snapshots s ON s.id=h.snapshot_id WHERE h.subject=? OR (h.subject=? AND h.dataset IN ('facts','filings','insiders')) OR (h.dataset='actions' AND h.subject='us')`, symbol, "cik:"+cik)
	if e != nil {
		return out, e
	}
	ids := map[string]string{}
	for rows.Next() {
		var d, id, raw string
		var v DatasetView
		if e = rows.Scan(&d, &id, &v.Provider, &v.FetchedAt, &raw); e != nil {
			rows.Close()
			return out, e
		}
		if e = json.Unmarshal([]byte(raw), &v.Data); e != nil {
			rows.Close()
			return out, e
		}
		v.RecordCount = len(v.Data.Records)
		limit := 200
		if d == "funds" {
			limit = 2000
		}
		if len(v.Data.Records) > limit {
			v.Data.Records = v.Data.Records[:limit]
		}
		if len(v.Data.Filings) > 250 {
			v.Data.Filings = v.Data.Filings[:250]
		}
		if old, ok := out.Datasets[d]; ok {
			selected := cfg.ProviderFor(d)
			if (old.Provider == selected && v.Provider != selected) || (old.Provider == v.Provider && old.FetchedAt > v.FetchedAt) || (old.Provider != selected && v.Provider != selected && old.FetchedAt > v.FetchedAt) {
				continue
			}
		}
		out.Datasets[d] = v
		ids[d] = id
	}
	e = rows.Err()
	rows.Close()
	if e != nil {
		return out, e
	}
	if actionID, ok := ids["actions"]; ok {
		var actionSubject string
		if e = tx.QueryRowContext(ctx, "SELECT subject FROM research_snapshots WHERE id=?", actionID).Scan(&actionSubject); e != nil {
			return out, e
		}
		if actionSubject == "us" {
			v := out.Datasets["actions"]
			v.Data.Records = []market.Record{}
			rs, e := tx.QueryContext(ctx, "SELECT payload_json FROM research_actions WHERE snapshot_id=? AND symbol=?", actionID, symbol)
			if e != nil {
				return out, e
			}
			for rs.Next() {
				var body string
				if e = rs.Scan(&body); e != nil {
					rs.Close()
					return out, e
				}
				var r market.Record
				if e = json.Unmarshal([]byte(body), &r); e != nil {
					rs.Close()
					return out, e
				}
				v.Data.Records = append(v.Data.Records, r)
			}
			e = rs.Err()
			rs.Close()
			if e != nil {
				return out, e
			}
			v.RecordCount = len(v.Data.Records)
			out.Datasets["actions"] = v
		}
	}
	var priceID string
	var priceView DatasetView
	var pricePayload string
	err := tx.QueryRowContext(ctx, `SELECT s.id,s.provider,s.fetched_at,s.payload_json,b.basis FROM daily_bars b JOIN research_snapshots s ON s.id=b.snapshot_id WHERE b.symbol=? ORDER BY (b.provider=?) DESC,b.date DESC LIMIT 1`, symbol, cfg.PriceSource).Scan(&priceID, &priceView.Provider, &priceView.FetchedAt, &pricePayload, &out.Basis)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return out, err
	}
	if err == nil {
		if err = json.Unmarshal([]byte(pricePayload), &priceView.Data); err != nil {
			return out, err
		}
		out.Datasets["prices"] = priceView
		ids["prices"] = priceID
	}
	for d, id := range ids {
		v := out.Datasets[d]
		v.Sources = []string{}
		rs, e := tx.QueryContext(ctx, "SELECT e.source_url FROM research_snapshot_sources ss JOIN research_evidence e ON e.hash=ss.evidence_hash WHERE ss.snapshot_id=?", id)
		if e != nil {
			return out, e
		}
		for rs.Next() {
			var url string
			if e = rs.Scan(&url); e != nil {
				rs.Close()
				return out, e
			}
			v.Sources = append(v.Sources, url)
		}
		e = rs.Err()
		rs.Close()
		if e != nil {
			return out, e
		}
		out.Datasets[d] = v
	}
	rows, e = tx.QueryContext(ctx, "SELECT date,open,high,low,close,volume FROM daily_bars WHERE symbol=? AND provider=? AND basis=? ORDER BY date DESC LIMIT 550", symbol, priceView.Provider, out.Basis)
	if e != nil {
		return out, e
	}
	for rows.Next() {
		var b market.Bar
		if e = rows.Scan(&b.Date, &b.Open, &b.High, &b.Low, &b.Close, &b.Volume); e != nil {
			rows.Close()
			return out, e
		}
		out.Bars = append(out.Bars, b)
	}
	e = rows.Err()
	rows.Close()
	if e != nil {
		return out, e
	}
	sort.Slice(out.Bars, func(i, j int) bool { return out.Bars[i].Date < out.Bars[j].Date })
	if view, ok := out.Datasets["prices"]; ok {
		view.RecordCount = len(out.Bars)
		out.Datasets["prices"] = view
	}
	for _, d := range ResearchDatasets {
		if _, ok := out.Datasets[d]; ok {
			out.Coverage[d] = "stored"
			continue
		}
		subject := symbol
		if cfg.ProviderFor(d) == "sec" && (d == "facts" || d == "filings" || d == "insiders") {
			subject = "cik:" + cik
		}
		var state, code string
		e := tx.QueryRowContext(ctx, "SELECT state,error FROM research_jobs WHERE dataset=? AND subject=? AND provider=? ORDER BY id DESC LIMIT 1", d, subject, cfg.ProviderFor(d)).Scan(&state, &code)
		if e != nil && !errors.Is(e, sql.ErrNoRows) {
			return out, e
		}
		if code != "" {
			out.Coverage[d] = code
		} else if state != "" {
			out.Coverage[d] = state
		} else {
			out.Coverage[d] = "pending"
		}
	}
	for _, d := range ResearchDatasets {
		if out.Coverage[d] == "stored" {
			continue
		}
		p := cfg.ProviderFor(d)
		var blocked string
		err := tx.QueryRowContext(ctx, "SELECT blocked FROM provider_budgets WHERE provider=?", p).Scan(&blocked)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return out, err
		}
		if blocked != "" {
			out.Coverage[d] = blocked
			continue
		}
		if p == "yahoo" {
			continue
		}
		if p != "sec" {
			var n int
			if err = tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM credential_blobs WHERE provider=? AND field='apiKey'", p).Scan(&n); err != nil {
				return out, err
			}
			if n == 0 {
				out.Coverage[d] = "needs_key"
			}
		} else {
			var settings string
			if err = tx.QueryRowContext(ctx, "SELECT settings_json FROM service_settings WHERE singleton=1").Scan(&settings); err != nil {
				return out, err
			}
			var cfg Settings
			json.Unmarshal([]byte(settings), &cfg)
			if !strings.Contains(cfg.SECUserAgent, "@") {
				out.Coverage[d] = "needs_contact"
			} else if cik == "" {
				out.Coverage[d] = "unmapped"
			}
		}
	}
	if len(out.Bars) > 0 {
		out.Coverage["prices"] = "stored"
	}
	return out, tx.Commit()
}

type ResearchProgress struct {
	Dataset   string `json:"dataset"`
	Total     int    `json:"total"`
	Stored    int    `json:"stored"`
	Failed    int    `json:"failed"`
	Blocked   int    `json:"blocked"`
	Running   int    `json:"running"`
	LastError string `json:"lastError,omitempty"`
}
type BudgetStatus struct {
	Provider string `json:"provider"`
	Calls    int    `json:"calls"`
	Day      string `json:"day"`
	Cooldown string `json:"cooldown"`
	Blocked  string `json:"blocked"`
}
type ResearchStatus struct {
	Config    ResearchConfig     `json:"config"`
	Universe  int                `json:"universe"`
	Priced    int                `json:"priced"`
	Progress  []ResearchProgress `json:"progress"`
	Providers []BudgetStatus     `json:"providers"`
}

func (s *Store) ResearchStatus(ctx context.Context) (ResearchStatus, error) {
	out := ResearchStatus{Progress: []ResearchProgress{}, Providers: []BudgetStatus{}}
	var e error
	out.Config, e = s.ResearchConfig(ctx)
	if e != nil {
		return out, e
	}
	symbols, e := s.ResearchSymbols(ctx)
	if e != nil {
		return out, e
	}
	out.Universe = len(symbols)
	e = s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM (SELECT DISTINCT symbol FROM daily_bars) b JOIN (SELECT DISTINCT UPPER(l.source_symbol) AS symbol FROM directory_head h JOIN directory_memberships m ON m.snapshot_id=h.snapshot_id JOIN listings l ON l.id=m.listing_id WHERE m.test=0 AND m.etf=0) u ON u.symbol=b.symbol`).Scan(&out.Priced)
	if e != nil {
		return out, e
	}
	rows, e := s.db.QueryContext(ctx, `SELECT dataset,COUNT(*),SUM(last_success IS NOT NULL),SUM(state='failed'),SUM(state='blocked'),SUM(state='running'),COALESCE(MAX(NULLIF(error,'')),'') FROM research_jobs WHERE state!='retired' AND (dataset!='prices' OR provider=?) AND (dataset!='profile' OR provider=?) AND (dataset!='facts' OR provider=?) AND (dataset!='filings' OR provider=?) AND (dataset!='analyst' OR provider=?) AND (dataset!='funds' OR provider=?) GROUP BY dataset`, out.Config.PriceSource, out.Config.ProfileSource, out.Config.FactsSource, out.Config.FilingsSource, out.Config.AnalystSource, out.Config.FundsSource)
	if e != nil {
		return out, e
	}
	for rows.Next() {
		var p ResearchProgress
		if e = rows.Scan(&p.Dataset, &p.Total, &p.Stored, &p.Failed, &p.Blocked, &p.Running, &p.LastError); e != nil {
			rows.Close()
			return out, e
		}
		out.Progress = append(out.Progress, p)
	}
	e = rows.Err()
	rows.Close()
	if e != nil {
		return out, e
	}
	rows, e = s.db.QueryContext(ctx, "SELECT provider,calls,day,cooldown_until,blocked FROM provider_budgets")
	if e != nil {
		return out, e
	}
	for rows.Next() {
		var b BudgetStatus
		if e = rows.Scan(&b.Provider, &b.Calls, &b.Day, &b.Cooldown, &b.Blocked); e != nil {
			return out, e
		}
		out.Providers = append(out.Providers, b)
	}
	err := rows.Err()
	rows.Close()
	if err != nil {
		return out, err
	}
	credentials, err := s.Credentials(ctx)
	if err != nil {
		return out, err
	}
	configured := map[string]bool{}
	for _, v := range credentials {
		for _, field := range v.Fields {
			if field == "apiKey" {
				configured[v.Provider] = true
			}
		}
	}
	settings, err := s.Settings(ctx)
	if err != nil {
		return out, err
	}
	for _, p := range []string{"massive", "sec", "fmp", "yahoo", "thirteenf"} {
		index := -1
		for i, v := range out.Providers {
			if v.Provider == p {
				index = i
				break
			}
		}
		if index < 0 {
			out.Providers = append(out.Providers, BudgetStatus{Provider: p})
			index = len(out.Providers) - 1
		}
		if p == "sec" {
			if !strings.Contains(settings.SECUserAgent, "@") {
				out.Providers[index].Blocked = "needs_contact"
			}
		} else if p != "yahoo" && p != "thirteenf" && !configured[p] {
			out.Providers[index].Blocked = "needs_key"
		}
	}
	return out, nil
}
func (s *Store) EncryptedCredentials(ctx context.Context, provider string) (map[string]string, error) {
	out := map[string]string{}
	rows, e := s.db.QueryContext(ctx, "SELECT field,ciphertext FROM credential_blobs WHERE provider=?", provider)
	if e != nil {
		return out, e
	}
	defer rows.Close()
	for rows.Next() {
		var k, v string
		if e = rows.Scan(&k, &v); e != nil {
			return out, e
		}
		out[k] = v
	}
	return out, rows.Err()
}
func (s *Store) ResearchFingerprint(ctx context.Context) (string, error) {
	var directory string
	e := s.db.QueryRowContext(ctx, "SELECT COALESCE((SELECT snapshot_id FROM directory_head WHERE singleton=1),'')").Scan(&directory)
	if e != nil {
		return "", e
	}
	var mapping string
	e = s.db.QueryRowContext(ctx, "SELECT COALESCE((SELECT snapshot_id FROM research_heads WHERE dataset='identity' AND subject='us'),'')").Scan(&mapping)
	return fmt.Sprintf("%s:%s", directory, mapping), e
}

func (s *Store) ResearchPayload(ctx context.Context, dataset, subject string) (market.Payload, error) {
	var payload market.Payload
	var raw string
	e := s.db.QueryRowContext(ctx, "SELECT s.payload_json FROM research_heads h JOIN research_snapshots s ON s.id=h.snapshot_id WHERE h.dataset=? AND h.subject=?", dataset, subject).Scan(&raw)
	if errors.Is(e, sql.ErrNoRows) {
		return payload, nil
	}
	if e != nil {
		return payload, e
	}
	return payload, json.Unmarshal([]byte(raw), &payload)
}

func (s *Store) ResearchEvidence(ctx context.Context, dataset, subject string) ([]market.Evidence, error) {
	rows, e := s.db.QueryContext(ctx, `SELECT e.source_url,e.fetched_at,e.content_gzip FROM research_heads h JOIN research_snapshot_sources ss ON ss.snapshot_id=h.snapshot_id JOIN research_evidence e ON e.hash=ss.evidence_hash WHERE h.dataset=? AND h.subject=?`, dataset, subject)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	out := []market.Evidence{}
	for rows.Next() {
		var ev market.Evidence
		var fetched string
		var compressed []byte
		if e = rows.Scan(&ev.URL, &fetched, &compressed); e != nil {
			return nil, e
		}
		ev.FetchedAt, _ = time.Parse(time.RFC3339Nano, fetched)
		reader, e := gzip.NewReader(bytes.NewReader(compressed))
		if e != nil {
			return nil, e
		}
		ev.Body, e = io.ReadAll(io.LimitReader(reader, (32<<20)+1))
		reader.Close()
		if e != nil || len(ev.Body) > 32<<20 {
			return nil, errors.New("invalid stored evidence")
		}
		out = append(out, ev)
	}
	return out, rows.Err()
}
func (s *Store) BlockResearchDataset(ctx context.Context, provider, dataset, code string) error {
	_, e := s.db.ExecContext(ctx, "UPDATE research_jobs SET state='blocked',error=? WHERE provider=? AND dataset=? AND state NOT IN ('running','retired')", code, provider, dataset)
	return e
}

func (s *Store) ProviderBlocked(ctx context.Context, p string) (string, error) {
	var code string
	e := s.db.QueryRowContext(ctx, "SELECT blocked FROM provider_budgets WHERE provider=?", p).Scan(&code)
	if errors.Is(e, sql.ErrNoRows) {
		return "", nil
	}
	return code, e
}

// Private resumable provider pages are not visible through research.read until a
// complete validated snapshot is committed. Entries expire before a new refresh.
func (s *Store) ResearchStage(ctx context.Context, key string) (*market.Evidence, error) {
	var ev market.Evidence
	var fetched string
	e := s.db.QueryRowContext(ctx, "SELECT source_url,fetched_at,body FROM research_staging WHERE cache_key=? AND fetched_at>?", key, stamp(time.Now().Add(-24*time.Hour))).Scan(&ev.URL, &fetched, &ev.Body)
	if errors.Is(e, sql.ErrNoRows) {
		return nil, nil
	}
	if e != nil {
		return nil, e
	}
	ev.FetchedAt, _ = time.Parse(time.RFC3339Nano, fetched)
	return &ev, nil
}
func (s *Store) SaveResearchStage(ctx context.Context, key string, ev market.Evidence) error {
	if len(ev.Body) > 32<<20 {
		return errors.New("staging page too large")
	}
	_, e := s.db.ExecContext(ctx, "INSERT INTO research_staging VALUES(?,?,?,?) ON CONFLICT(cache_key) DO UPDATE SET source_url=excluded.source_url,fetched_at=excluded.fetched_at,body=excluded.body", key, ev.URL, stamp(ev.FetchedAt), ev.Body)
	if e != nil {
		return e
	}
	_, e = s.db.ExecContext(ctx, "DELETE FROM research_staging WHERE fetched_at<?", stamp(time.Now().Add(-48*time.Hour)))
	return e
}

func (s *Store) ProviderWait(ctx context.Context, p string, limit ProviderLimit, now time.Time) (time.Duration, error) {
	var day, cooldown string
	var calls int
	e := s.db.QueryRowContext(ctx, "SELECT day,calls,cooldown_until FROM provider_budgets WHERE provider=?", p).Scan(&day, &calls, &cooldown)
	if errors.Is(e, sql.ErrNoRows) {
		return 0, nil
	}
	if e != nil {
		return 0, e
	}
	until, _ := time.Parse(time.RFC3339Nano, cooldown)
	if day == now.UTC().Format("2006-01-02") && calls >= limit.PerDay {
		tomorrow := time.Date(now.UTC().Year(), now.UTC().Month(), now.UTC().Day()+1, 0, 0, 0, 0, time.UTC)
		if tomorrow.After(until) {
			until = tomorrow
		}
	}
	if until.After(now) {
		return until.Sub(now), nil
	}
	return 0, nil
}

// Keys may be configured months after installation. Never spend quota repairing
// dates outside the selected/provider-supported backfill window.
func (s *Store) BoundPriceJobs(ctx context.Context, from string, now time.Time) error {
	tx, e := s.db.BeginTx(ctx, nil)
	if e != nil {
		return e
	}
	defer tx.Rollback()
	if _, e = tx.ExecContext(ctx, "UPDATE research_jobs SET state='retired',manual=0 WHERE provider='massive' AND dataset='prices' AND subject<? AND state!='running'", from); e != nil {
		return e
	}
	if _, e = tx.ExecContext(ctx, "UPDATE research_jobs SET state='queued',next_run=? WHERE provider='massive' AND dataset='prices' AND subject>=? AND state='retired'", stamp(now), from); e != nil {
		return e
	}
	return tx.Commit()
}

// SEC accession document URLs are immutable. Reuse their original verified bytes;
// mutable submissions/facts URLs never enter this cache path.
func (s *Store) ResearchArchive(ctx context.Context, url string) (*market.Evidence, error) {
	if !strings.HasPrefix(url, "https://www.sec.gov/Archives/edgar/data/") {
		return nil, errors.New("invalid archive source")
	}
	var ev market.Evidence
	var fetched string
	var compressed []byte
	e := s.db.QueryRowContext(ctx, "SELECT source_url,fetched_at,content_gzip FROM research_evidence WHERE source_url=? ORDER BY fetched_at DESC LIMIT 1", url).Scan(&ev.URL, &fetched, &compressed)
	if errors.Is(e, sql.ErrNoRows) {
		return nil, nil
	}
	if e != nil {
		return nil, e
	}
	r, e := gzip.NewReader(bytes.NewReader(compressed))
	if e != nil {
		return nil, e
	}
	defer r.Close()
	ev.Body, e = io.ReadAll(io.LimitReader(r, (32<<20)+1))
	if e != nil || len(ev.Body) > 32<<20 {
		return nil, errors.New("invalid archive evidence")
	}
	ev.FetchedAt, _ = time.Parse(time.RFC3339Nano, fetched)
	return &ev, nil
}

func (s *Store) UseSharedActions(ctx context.Context) error {
	_, e := s.db.ExecContext(ctx, "UPDATE research_jobs SET state='retired',manual=0 WHERE dataset='actions' AND subject!='us' AND state!='running'")
	return e
}

// Manual scope is captured from explicitly requested listing jobs. A later new
// listing/date must not inherit an unrelated unfinished manual run while paused.
func (s *Store) ManualIssuers(ctx context.Context) (map[string]bool, error) {
	out := map[string]bool{}
	rows, e := s.db.QueryContext(ctx, `SELECT DISTINCT a.cik FROM research_aliases a WHERE a.symbol IN (SELECT subject FROM research_jobs WHERE manual=1)`)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	for rows.Next() {
		var cik string
		if e = rows.Scan(&cik); e != nil {
			return nil, e
		}
		out[cik] = true
	}
	return out, rows.Err()
}

// Upgrade old price snapshots once and wake intraday-collected snapshots after
// their observed regular session finishes. Failed jobs retain their backoff.
func (s *Store) WakeCompletedYahooPrices(ctx context.Context, now time.Time) error {
	_, err := s.db.ExecContext(ctx, `UPDATE research_jobs SET next_run=? WHERE provider='yahoo' AND dataset='prices' AND state='idle' AND next_run>? AND EXISTS(SELECT 1 FROM research_heads h JOIN research_snapshots snap ON snap.id=h.snapshot_id WHERE h.dataset='prices' AND h.subject=research_jobs.subject AND snap.provider='yahoo' AND (COALESCE(json_extract(snap.payload_json,'$.window'),'')!='Yahoo completed sessions v2' OR (json_extract(snap.payload_json,'$.quote.sessionEnd')>0 AND unixepoch(research_jobs.last_success)<json_extract(snap.payload_json,'$.quote.sessionEnd')+600 AND ?>=json_extract(snap.payload_json,'$.quote.sessionEnd')+600)))`, stamp(now), stamp(now), now.Unix())
	return err
}

// Re-normalize old public-page snapshots once for reported valuation metadata.
// Collection still obeys source selection, pause flags, budgets and failed backoff.
func (s *Store) WakeYahooQuoteMetadata(ctx context.Context, now time.Time) error {
	_, err := s.db.ExecContext(ctx, `UPDATE research_jobs SET next_run=? WHERE provider='yahoo' AND dataset IN ('profile','analyst','earnings') AND state='idle' AND next_run>? AND EXISTS(SELECT 1 FROM research_heads h JOIN research_snapshots snap ON snap.id=h.snapshot_id WHERE h.subject=research_jobs.subject AND h.dataset=research_jobs.dataset AND snap.provider='yahoo' AND COALESCE(json_extract(snap.payload_json,'$.version'),0)<1)`, stamp(now), stamp(now))
	return err
}

// Enrich pre-expansion fact snapshots via ordinary background jobs. Retain their
// good heads while collecting, and preserve failures, leases and rate backoff.
func (s *Store) WakeFinancialFacts(ctx context.Context, now time.Time) error {
	_, err := s.db.ExecContext(ctx, `UPDATE research_jobs SET next_run=? WHERE provider IN ('sec','yahoo') AND dataset='facts' AND state='idle' AND next_run>? AND EXISTS(SELECT 1 FROM research_heads h JOIN research_snapshots snap ON snap.id=h.snapshot_id WHERE h.subject=research_jobs.subject AND h.dataset='facts' AND snap.provider=research_jobs.provider AND COALESCE(json_extract(snap.payload_json,'$.version'),0)<?)`, stamp(now), stamp(now), market.FinancialFactsVersion)
	return err
}

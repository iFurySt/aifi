// Package market defines collected research data independently of transport/storage.
package market

import (
	"context"
	"encoding/json"
	"time"
)

type Bar struct {
	Date   string  `json:"date"`
	Open   float64 `json:"open"`
	High   float64 `json:"high"`
	Low    float64 `json:"low"`
	Close  float64 `json:"close"`
	Volume float64 `json:"volume"`
	Symbol string  `json:"symbol,omitempty"`
}
type Profile struct {
	Symbol      string   `json:"symbol"`
	Name        string   `json:"name"`
	CIK         string   `json:"cik,omitempty"`
	Description string   `json:"description,omitempty"`
	Industry    string   `json:"industry,omitempty"`
	Sector      string   `json:"sector,omitempty"`
	Country     string   `json:"country,omitempty"`
	Employees   int      `json:"employees,omitempty"`
	Website     string   `json:"website,omitempty"`
	Currency    string   `json:"currency,omitempty"`
	Type        string   `json:"type,omitempty"`
	Shares      *float64 `json:"shares,omitempty"`
	SharesDate  string   `json:"sharesDate,omitempty"`
}
type Filing struct {
	Title      string `json:"title,omitempty"`
	Accession  string `json:"accession"`
	Form       string `json:"form"`
	ReportDate string `json:"reportDate"`
	Filed      string `json:"filed"`
	Accepted   string `json:"accepted"`
	URL        string `json:"url"`
}
type Fact struct {
	Period       string `json:"period,omitempty"`
	Metric       string `json:"metric"`
	Tag          string `json:"tag"`
	Unit         string `json:"unit"`
	Value        string `json:"value"`
	Start        string `json:"start,omitempty"`
	End          string `json:"end"`
	Filed        string `json:"filed"`
	Accession    string `json:"accession"`
	Form         string `json:"form"`
	FiscalYear   int    `json:"fiscalYear"`
	FiscalPeriod string `json:"fiscalPeriod"`
}
type Record map[string]any
type MarketQuote struct {
	MarketCap     *float64 `json:"marketCap,omitempty"`
	State         string   `json:"state,omitempty"`
	Price         float64  `json:"price"`
	PreviousClose *float64 `json:"previousClose,omitempty"`
	AsOf          string   `json:"asOf"`
	SessionStart  int64    `json:"sessionStart,omitempty"`
	SessionEnd    int64    `json:"sessionEnd,omitempty"`
	DelayMinutes  *float64 `json:"delayMinutes,omitempty"`
	PostPrice     *float64 `json:"postPrice,omitempty"`
	PostAsOf      string   `json:"postAsOf,omitempty"`
}
type OwnershipSummary struct {
	InstitutionsPercent *float64 `json:"institutionsPercent,omitempty"`
	FloatPercent        *float64 `json:"floatPercent,omitempty"`
	InsidersPercent     *float64 `json:"insidersPercent,omitempty"`
	InstitutionsCount   *float64 `json:"institutionsCount,omitempty"`
}
type Payload struct {
	Ownership *OwnershipSummary `json:"ownership,omitempty"`
	Version   int               `json:"version,omitempty"`
	Quote     *MarketQuote      `json:"quote,omitempty"`
	Profile   *Profile          `json:"profile,omitempty"`
	Facts     []Fact            `json:"facts,omitempty"`
	Filings   []Filing          `json:"filings,omitempty"`
	Records   []Record          `json:"records,omitempty"`
	Window    string            `json:"window,omitempty"`
	Complete  bool              `json:"complete"`
}
type Evidence struct {
	URL       string
	Body      []byte
	FetchedAt time.Time
}
type Result struct {
	Basis    string
	Payload  Payload
	Bars     []Bar
	Aliases  map[string]string
	Evidence []Evidence
}
type Job struct {
	Manual   bool   `json:"-"`
	ID       int64  `json:"id"`
	Provider string `json:"provider"`
	Dataset  string `json:"dataset"`
	Subject  string `json:"subject"`
	Window   string `json:"window"`
	Attempts int    `json:"attempts"`
	Lease    string `json:"-"`
}
type Failure struct {
	Code       string
	RetryAfter time.Duration
}

func (e *Failure) Error() string { return e.Code }
func Marshal(v any) string       { b, _ := json.Marshal(v); return string(b) }

type jobContextKey struct{}

func WithJob(ctx context.Context, j Job) context.Context {
	return context.WithValue(ctx, jobContextKey{}, j)
}
func ContextJob(ctx context.Context) (Job, bool) {
	j, ok := ctx.Value(jobContextKey{}).(Job)
	return j, ok
}

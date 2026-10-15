// Package market defines collected research data independently of transport/storage.
package market

import (
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
	Website     string   `json:"website,omitempty"`
	Currency    string   `json:"currency,omitempty"`
	Type        string   `json:"type,omitempty"`
	Shares      *float64 `json:"shares,omitempty"`
	SharesDate  string   `json:"sharesDate,omitempty"`
}
type Filing struct {
	Accession  string `json:"accession"`
	Form       string `json:"form"`
	ReportDate string `json:"reportDate"`
	Filed      string `json:"filed"`
	Accepted   string `json:"accepted"`
	URL        string `json:"url"`
}
type Fact struct {
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
type Payload struct {
	Profile  *Profile `json:"profile,omitempty"`
	Facts    []Fact   `json:"facts,omitempty"`
	Filings  []Filing `json:"filings,omitempty"`
	Records  []Record `json:"records,omitempty"`
	Window   string   `json:"window,omitempty"`
	Complete bool     `json:"complete"`
}
type Evidence struct {
	URL       string
	Body      []byte
	FetchedAt time.Time
}
type Result struct {
	Payload  Payload
	Bars     []Bar
	Aliases  map[string]string
	Evidence []Evidence
}
type Job struct {
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

// Package directory reads the documented Nasdaq Trader symbol-directory files.
package directory

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"
)

const MaxBytes = 8 << 20
const NasdaqURL = "https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt"
const OtherURL = "https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt"

type Listing struct {
	Symbol   string            `json:"symbol"`
	Name     string            `json:"name"`
	Exchange string            `json:"exchange"`
	Source   string            `json:"source"`
	ETF      bool              `json:"etf"`
	Test     bool              `json:"test"`
	Type     string            `json:"securityType"`
	Fields   map[string]string `json:"fields"`
}
type File struct {
	Name       string    `json:"name"`
	URL        string    `json:"url"`
	SHA256     string    `json:"sha256"`
	Created    string    `json:"fileCreationTime"`
	Generation string    `json:"generationKey"`
	FetchedAt  time.Time `json:"fetchedAt"`
	Content    []byte    `json:"-"`
	Listings   []Listing `json:"-"`
}

// Source symbols are opaque provider identifiers, not AIFi UI ticker syntax.
func validSymbol(s string) bool {
	if len(s) == 0 || len(s) > 14 || strings.TrimSpace(s) != s {
		return false
	}
	for _, r := range s {
		if r < 32 || r > 126 || r == '|' {
			return false
		}
	}
	return true
}
func Parse(name string, content []byte) (File, error) {
	f := File{Name: name, Content: content}
	if len(content) > MaxBytes || !utf8.Valid(content) {
		return f, fmt.Errorf("%s: invalid or oversized content", name)
	}
	var required []string
	symbol, exchange := "Symbol", "NASDAQ"
	switch name {
	case "nasdaqlisted":
		required = []string{"Symbol", "Security Name", "Market Category", "Test Issue", "Financial Status", "Round Lot Size", "ETF", "NextShares"}
	case "otherlisted":
		required = []string{"ACT Symbol", "Security Name", "Exchange", "CQS Symbol", "ETF", "Round Lot Size", "Test Issue", "NASDAQ Symbol"}
		symbol = "ACT Symbol"
	default:
		return f, fmt.Errorf("unsupported directory: %s", name)
	}
	lines := strings.Split(strings.TrimSuffix(strings.ReplaceAll(string(content), "\r\n", "\n"), "\n"), "\n")
	if len(lines) < 3 {
		return f, fmt.Errorf("%s: empty/truncated directory", name)
	}
	headers := strings.Split(strings.TrimPrefix(lines[0], "\ufeff"), "|")
	if strings.Join(headers, "|") != strings.Join(required, "|") {
		return f, fmt.Errorf("%s: unexpected header", name)
	}
	footer := strings.Split(lines[len(lines)-1], "|")
	// otherlisted retains the legacy seven-field trailer after the eighth
	// NASDAQ Symbol column was added. Accept that documented/live shape only.
	validTrailerWidth := len(footer) == len(headers) || (name == "otherlisted" && len(footer) == 7)
	if !validTrailerWidth || !strings.HasPrefix(footer[0], "File Creation Time: ") {
		return f, fmt.Errorf("%s: missing creation trailer", name)
	}
	for _, v := range footer[1:] {
		if v != "" {
			return f, fmt.Errorf("%s: malformed trailer", name)
		}
	}
	f.Created = strings.TrimPrefix(footer[0], "File Creation Time: ")
	// Nasdaq does not specify a UTC offset here. Keep the raw value, and use a
	// timezone-free sortable key only to reject an older version of the same feed.
	created, err := time.Parse("0102200615:04", f.Created)
	if err != nil {
		return f, fmt.Errorf("%s: invalid creation time", name)
	}
	f.Generation = created.Format("200601021504")
	seen := map[string]bool{}
	for i, line := range lines[1 : len(lines)-1] {
		values := strings.Split(line, "|")
		if len(values) != len(headers) {
			return f, fmt.Errorf("%s: invalid row %d", name, i+2)
		}
		fields := map[string]string{}
		for j, h := range headers {
			fields[h] = values[j]
		}
		s := fields[symbol]
		n := fields["Security Name"]
		if !validSymbol(s) || len(n) == 0 || utf8.RuneCountInString(n) > 255 || strings.ContainsAny(n, "\r\n\x00") || seen[s] {
			return f, fmt.Errorf("%s: invalid/duplicate security row %d", name, i+2)
		}
		seen[s] = true
		for _, field := range []string{"ETF", "Test Issue"} {
			if fields[field] != "Y" && fields[field] != "N" {
				return f, fmt.Errorf("%s: invalid %s at row %d", name, field, i+2)
			}
		}
		if name == "otherlisted" {
			exchange = fields["Exchange"]
			if len(exchange) != 1 || exchange[0] < 'A' || exchange[0] > 'Z' {
				return f, fmt.Errorf("%s: unknown exchange %q", name, exchange)
			}
			for _, alias := range []string{"CQS Symbol", "NASDAQ Symbol"} {
				if fields[alias] != "" && !validSymbol(fields[alias]) {
					return f, fmt.Errorf("%s: invalid %s", name, alias)
				}
			}
		}
		kind := "unknown"
		if fields["ETF"] == "Y" {
			kind = "etf"
		}
		f.Listings = append(f.Listings, Listing{Symbol: s, Name: n, Exchange: exchange, Source: name, ETF: fields["ETF"] == "Y", Test: fields["Test Issue"] == "Y", Type: kind, Fields: fields})
	}
	if len(f.Listings) == 0 {
		return f, fmt.Errorf("%s: no securities", name)
	}
	hash := sha256.Sum256(content)
	f.SHA256 = hex.EncodeToString(hash[:])
	return f, nil
}

type Fetcher interface {
	Fetch(context.Context) ([]File, error)
}
type Client struct {
	HTTP *http.Client
	URLs [2]string
}

func NewClient() *Client {
	return &Client{URLs: [2]string{NasdaqURL, OtherURL}, HTTP: &http.Client{Timeout: 30 * time.Second, CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) > 3 || req.URL.Scheme != "https" || (req.URL.Host != "www.nasdaqtrader.com" && req.URL.Host != "nasdaqtrader.com") {
			return fmt.Errorf("directory redirect denied")
		}
		return nil
	}}}
}
func (c *Client) Fetch(ctx context.Context) ([]File, error) {
	var files []File
	for i, name := range []string{"nasdaqlisted", "otherlisted"} {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.URLs[i], nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("User-Agent", "AIFi/0.1 (public symbol-directory collector)")
		req.Header.Set("Accept", "text/plain")
		response, err := c.HTTP.Do(req)
		if err != nil {
			return nil, fmt.Errorf("%s request failed: %w", name, err)
		}
		if response.StatusCode != http.StatusOK {
			response.Body.Close()
			return nil, fmt.Errorf("%s: HTTP %d", name, response.StatusCode)
		}
		body, err := io.ReadAll(io.LimitReader(response.Body, MaxBytes+1))
		response.Body.Close()
		if err != nil {
			return nil, fmt.Errorf("%s read failed: %w", name, err)
		}
		file, err := Parse(name, body)
		if err != nil {
			return nil, err
		}
		file.URL = c.URLs[i]
		file.FetchedAt = time.Now().UTC()
		files = append(files, file)
	}
	return files, nil
}

package research

import (
	"context"
	"fmt"
	"github.com/ifuryst/aifi/apps/cli/internal/market"
	"github.com/ifuryst/aifi/apps/cli/internal/store"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"
)

func TestNewsWorkerNotStarvedByPricesAndOfflineReadsNeverCollect(t *testing.T) {
	ctx := context.Background()
	path := t.TempDir()
	db, err := store.Open(ctx, path)
	if err != nil {
		t.Fatal(err)
	}
	cfg, _ := db.ResearchConfig(ctx)
	for dataset, v := range cfg.Datasets {
		v.Enabled = dataset == "prices" || dataset == "news"
		cfg.Datasets[dataset] = v
	}
	cfg.NewsSource = "yahoo"
	cfg.Limits["yahoo"] = store.ProviderLimit{PerMinute: 300, PerDay: 10000}
	if _, err = db.SaveResearchConfig(ctx, cfg); err != nil {
		t.Fatal(err)
	}
	now := time.Date(2026, 10, 19, 15, 0, 0, 0, time.UTC)
	jobs := []market.Job{{Provider: "yahoo", Dataset: "news", Subject: "AAPL"}}
	for i := 0; i < 100; i++ {
		jobs = append(jobs, market.Job{Provider: "yahoo", Dataset: "prices", Subject: fmt.Sprintf("Q%04d", i)})
	}
	if err = db.AddResearchJobs(ctx, jobs, now); err != nil {
		t.Fatal(err)
	}
	e := New(db, path, false)
	e.Now = func() time.Time { now = now.Add(time.Second); return now }
	e.Client.Now = e.Now
	newsCalls := 0
	failNews := false
	e.Client.HTTP = &http.Client{Transport: fixtureHTTP(func(req *http.Request) (*http.Response, error) {
		if req.Header.Get("Authorization") != "" || req.Header.Get("Cookie") != "" {
			t.Fatal("keyless collection used auth")
		}
		code := 404
		body := "not found"
		if req.Host == "feeds.finance.yahoo.com" {
			newsCalls++
			code = 200
			body = `<rss><channel><title>Yahoo! Finance: AAPL News</title><link>http://finance.yahoo.com/q/h?s=AAPL</link><item><title>Stored headline</title><pubDate>Mon, 19 Oct 2026 14:00:00 GMT</pubDate><link>https://finance.yahoo.com/news/stored.html</link></item></channel></rss>`
			if failNews {
				code = 500
			}
		}
		return &http.Response{StatusCode: code, Body: io.NopCloser(strings.NewReader(body)), Header: http.Header{}}, nil
	})}
	for i := 0; i < 9 && newsCalls == 0; i++ {
		if _, err = e.Step(ctx, "yahoo"); err != nil {
			t.Fatal(err)
		}
	}
	if newsCalls != 1 {
		t.Fatal("price backlog starved news", newsCalls)
	}
	db.Close()
	db, err = store.Open(ctx, path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	transport := e.Client.HTTP
	e = New(db, path, false)
	e.Now = func() time.Time { now = now.Add(time.Second); return now }
	e.Client.Now = e.Now
	e.Client.HTTP = transport
	for i := 0; i < 3; i++ {
		view, err := db.ResearchRead(ctx, "AAPL")
		if err != nil || view.Datasets["news"].Data.Records[0]["title"] != "Stored headline" {
			t.Fatal(view, err)
		}
	}
	if newsCalls != 1 {
		t.Fatal("reads recollected", newsCalls)
	}
	now = now.Add(25 * time.Hour)
	failNews = true
	for i := 0; i < 9 && newsCalls == 1; i++ {
		if _, err = e.Step(ctx, "yahoo"); err != nil {
			t.Fatal(err)
		}
	}
	view, err := db.ResearchRead(ctx, "AAPL")
	if err != nil || newsCalls != 2 || view.Datasets["news"].Data.Records[0]["title"] != "Stored headline" {
		t.Fatal(view, err, newsCalls)
	}
	cfg, _ = db.ResearchConfig(ctx)
	for dataset, v := range cfg.Datasets {
		v.Enabled = false
		cfg.Datasets[dataset] = v
	}
	if _, err = db.SaveResearchConfig(ctx, cfg); err != nil {
		t.Fatal(err)
	}
	if worked, err := e.Step(ctx, "yahoo"); err != nil || worked || newsCalls != 2 {
		t.Fatal("disabled news executed", worked, err, newsCalls)
	}
}

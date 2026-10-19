package market

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"
)

func rssNews(symbol, items string) string {
	return fmt.Sprintf(`<rss version="2.0"><channel><title>Yahoo! Finance: %s News</title><link>http://finance.yahoo.com/q/h?s=%s</link>%s</channel></rss>`, symbol, symbol, items)
}
func newsItem(title, at, link string) string {
	return fmt.Sprintf(`<item><title>%s</title><pubDate>%s</pubDate><link>%s</link><description>&lt;b&gt;Feed snippet&lt;/b&gt; &amp;amp; context</description></item>`, title, at, link)
}
func TestYahooNewsKeylessNormalizedWindow(t *testing.T) {
	body := rssNews("OTHER-B", newsItem("Older", "Sun, 18 Oct 2026 14:00:00 +0000", "https://finance.yahoo.com/news/older.html?utm_source=rss")+newsItem("Latest &amp; update", "Mon, 19 Oct 2026 14:00:00 +0000", "https://finance.yahoo.com/news/latest.html?.tsrc=rss")+newsItem("Duplicate", "Mon, 19 Oct 2026 14:00:00 +0000", "https://finance.yahoo.com/news/latest.html"))
	calls, gates := 0, 0
	c := testClient(t, func(req *http.Request) (int, string) {
		calls++
		if req.URL.Host != yahooNewsHost || req.URL.Query().Get("s") != "OTHER-B" || req.URL.Query().Get("apikey") != "" || req.Header.Get("Authorization") != "" || req.Header.Get("Cookie") != "" {
			t.Fatal("unsafe request")
		}
		return 200, body
	})
	c.Now = func() time.Time { return time.Date(2026, 10, 19, 15, 0, 0, 0, time.UTC) }
	c.Gate = func(_ context.Context, p string) error {
		gates++
		if p != "yahoo" {
			t.Fatal(p)
		}
		return nil
	}
	r, err := c.Collect(context.Background(), Job{Provider: "yahoo", Dataset: "news", Subject: "OTHER.B"})
	if err != nil || calls != 1 || gates != 1 || len(r.Payload.Records) != 2 || r.Payload.Complete || len(r.Evidence) != 1 {
		t.Fatal(r, err, calls, gates)
	}
	first := r.Payload.Records[0]
	if first["title"] != "Latest & update" || first["symbol"] != "OTHER.B" || first["publishedDate"] != "2026-10-19T14:00:00Z" || first["url"] != "https://finance.yahoo.com/news/latest.html" || first["text"] != "Feed snippet & context" {
		t.Fatal(first)
	}
	if string(r.Evidence[0].Body) != body || strings.Contains(r.Evidence[0].URL, "PRIVATE_KEY") {
		t.Fatal("missing/unsafe provenance")
	}
	c.Gate = func(context.Context, string) error { return &Failure{Code: "quota_wait"} }
	if _, err = c.Collect(context.Background(), Job{Provider: "yahoo", Dataset: "news", Subject: "OTHER.B"}); err == nil || calls != 1 {
		t.Fatal("budget bypass", err, calls)
	}
}
func TestYahooNewsRejectsUnsafeFeedsAndDropsInvalidItems(t *testing.T) {
	now := time.Date(2026, 10, 19, 15, 0, 0, 0, time.UTC)
	good := newsItem("Valid", "Mon, 19 Oct 2026 14:00:00 GMT", "https://finance.yahoo.com/news/valid.html")
	for _, raw := range []string{"<html>not RSS</html>", rssNews("OTHER", good), rssNews("AAPL", good) + "<extra/>", "<!DOCTYPE rss [<!ENTITY a SYSTEM 'file:///etc/passwd'>]>" + rssNews("AAPL", good), rssNews("AAPL", good[:len(good)-2]), rssNews("AAPL", strings.Repeat(good, 201)), rssNews("AAPL", newsItem("Too new", "Mon, 19 Oct 2026 16:00:00 GMT", "https://finance.yahoo.com/news/future.html"))} {
		if _, err := parseYahooNews([]byte(raw), "AAPL", "AAPL", now); err == nil {
			t.Fatal("invalid accepted")
		}
	}
	mixed := rssNews("AAPL", good+newsItem("Unsafe", "Mon, 19 Oct 2026 14:00:00 GMT", "https://finance.yahoo.com.attacker.invalid/news/a")+newsItem("Invalid date", "invalid", "https://finance.yahoo.com/news/b")+newsItem("Credential URL", "Mon, 19 Oct 2026 14:00:00 GMT", "https://user@finance.yahoo.com/news/a"))
	p, err := parseYahooNews([]byte(mixed), "AAPL", "AAPL", now)
	if err != nil || len(p.Records) != 1 {
		t.Fatal(p, err)
	}
	empty, err := parseYahooNews([]byte(rssNews("AAPL", "")), "AAPL", "AAPL", now)
	if err != nil || len(empty.Records) != 0 || empty.Records == nil {
		t.Fatal(empty, err)
	}
	c := testClient(t, func(*http.Request) (int, string) { return 200, strings.Repeat("x", (2<<20)+1) })
	if _, err = c.Collect(context.Background(), Job{Provider: "yahoo", Dataset: "news", Subject: "AAPL"}); err == nil {
		t.Fatal("unbounded feed")
	}
	c = testClient(t, func(*http.Request) (int, string) { t.Fatal("invalid symbol made HTTP request"); return 200, "" })
	if _, err = c.Collect(context.Background(), Job{Provider: "yahoo", Dataset: "news", Subject: "AAPL?x=1"}); err == nil {
		t.Fatal("unsafe symbol")
	}
}

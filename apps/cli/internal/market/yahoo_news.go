package market

import (
	"bytes"
	"context"
	"encoding/xml"
	"html"
	"io"
	"net/url"
	"regexp"
	"sort"
	"strings"
	"time"
)

const yahooNewsHost = "feeds.finance.yahoo.com"

var newsTags = regexp.MustCompile(`<[^>]*>`)

func newsText(s string, limit int) string {
	s = strings.Join(strings.Fields(html.UnescapeString(newsTags.ReplaceAllString(s, " "))), " ")
	r := []rune(s)
	if len(r) > limit {
		return string(r[:limit]) + "…"
	}
	return s
}
func validYahooNewsEndpoint(u *url.URL) bool {
	q := u.Query()
	return u.Host == yahooNewsHost && u.Path == "/rss/2.0/headline" && len(q) == 3 && len(q["s"]) == 1 && yahooSymbol.MatchString(q.Get("s")) && q.Get("region") == "US" && q.Get("lang") == "en-US"
}
func (c *Client) yahooNews(ctx context.Context, j Job, r *Result) error {
	symbol, err := yahooTicker(j.Subject)
	if err != nil {
		return err
	}
	endpoint := "https://" + yahooNewsHost + "/rss/2.0/headline?" + url.Values{"s": {symbol}, "region": {"US"}, "lang": {"en-US"}}.Encode()
	raw, err := c.get(ctx, "yahoo", endpoint, &r.Evidence)
	if err != nil {
		return err
	}
	payload, err := parseYahooNews(raw, symbol, j.Subject, c.Now())
	if err != nil {
		return err
	}
	r.Payload = payload
	return nil
}
func parseYahooNews(raw []byte, sourceSymbol, symbol string, now time.Time) (Payload, error) {
	invalid := func() (Payload, error) { return Payload{}, &Failure{Code: "invalid_news_feed"} }
	if len(raw) > 2<<20 || bytes.Contains(bytes.ToUpper(raw), []byte("<!DOCTYPE")) || bytes.Contains(bytes.ToUpper(raw), []byte("<!ENTITY")) {
		return invalid()
	}
	var feed struct {
		XMLName xml.Name `xml:"rss"`
		Channel struct {
			Title string `xml:"title"`
			Link  string `xml:"link"`
			Items []struct {
				Title       string `xml:"title"`
				Link        string `xml:"link"`
				Date        string `xml:"pubDate"`
				Description string `xml:"description"`
				Publisher   string `xml:"source"`
			} `xml:"item"`
		} `xml:"channel"`
	}
	decoder := xml.NewDecoder(bytes.NewReader(raw))
	if decoder.Decode(&feed) != nil {
		return invalid()
	}
	for {
		token, err := decoder.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			return invalid()
		}
		if text, ok := token.(xml.CharData); !ok || strings.TrimSpace(string(text)) != "" {
			return invalid()
		}
	}
	link, err := url.Parse(feed.Channel.Link)
	if err != nil || link.Host != "finance.yahoo.com" || link.User != nil || link.Query().Get("s") != sourceSymbol || feed.Channel.Title != "Yahoo! Finance: "+sourceSymbol+" News" || len(feed.Channel.Items) > 200 {
		return invalid()
	}
	records := []Record{}
	seen := map[string]bool{}
	for _, item := range feed.Channel.Items {
		title := newsText(item.Title, 400)
		published, err := time.Parse(time.RFC1123Z, item.Date)
		if err != nil {
			published, err = time.Parse(time.RFC1123, item.Date)
		}
		u, e := url.Parse(item.Link)
		if title == "" || err != nil || published.After(now.Add(5*time.Minute)) || e != nil || u.Scheme != "https" || u.Host != "finance.yahoo.com" || u.User != nil || u.Path == "" || len(item.Link) > 2048 {
			continue
		}
		u.RawQuery = ""
		u.Fragment = ""
		key := u.String()
		if seen[key] {
			continue
		}
		seen[key] = true
		publisher := newsText(item.Publisher, 100)
		if publisher == "" {
			publisher = "Yahoo Finance"
		}
		records = append(records, Record{"recordKind": "news", "symbol": symbol, "title": title, "publishedDate": published.UTC().Format(time.RFC3339), "publisher": publisher, "url": key, "text": newsText(item.Description, 240)})
	}
	if len(feed.Channel.Items) > 0 && len(records) == 0 {
		return invalid()
	}
	sort.SliceStable(records, func(i, j int) bool { return text(records[i]["publishedDate"]) > text(records[j]["publishedDate"]) })
	return Payload{Records: records, Complete: false, Window: "Latest public ticker RSS window · Headlines and feed-provided snippets"}, nil
}

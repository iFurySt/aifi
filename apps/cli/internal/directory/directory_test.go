package directory

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

const listed = "Symbol|Security Name|Market Category|Test Issue|Financial Status|Round Lot Size|ETF|NextShares\nAAPL|Example - Common Stock|Q|N|N|100|N|N\nZTEST|Test Security|S|Y|N|100|N|N\nEXETF|Example ETF|G|N|N|100|Y|N\nFile Creation Time: 1012202621:31|||||||\n"
const other = "ACT Symbol|Security Name|Exchange|CQS Symbol|ETF|Round Lot Size|Test Issue|NASDAQ Symbol\nCLASS.B|Example Class B|N|CLASS.B|N|100|N|CLASS/B\nFile Creation Time: 1012202621:31||||||\n"

func TestParsePreservesSourceSemantics(t *testing.T) {
	f, e := Parse("nasdaqlisted", []byte(listed))
	if e != nil {
		t.Fatal(e)
	}
	if len(f.Listings) != 3 || f.Generation != "202610122131" || f.Created != "1012202621:31" {
		t.Fatalf("unexpected file: %+v", f)
	}
	if f.Listings[0].Type != "unknown" || !f.Listings[1].Test || f.Listings[2].Type != "etf" {
		t.Fatal("non-ETF is not asserted common stock")
	}
	f, e = Parse("otherlisted", []byte(other))
	if e != nil {
		t.Fatal(e)
	}
	// Current feeds can add exchange codes before the field reference is revised.
	future, err := Parse("otherlisted", []byte(strings.Replace(other, "|N|CLASS.B", "|F|CLASS.B", 1)))
	if err != nil || future.Listings[0].Exchange != "F" {
		t.Fatal("lost new provider exchange code")
	}
	if f.Listings[0].Symbol != "CLASS.B" || f.Listings[0].Fields["NASDAQ Symbol"] != "CLASS/B" {
		t.Fatal("provider conventions must not be flattened")
	}
}
func TestRejectMalformedDirectories(t *testing.T) {
	cases := map[string]string{
		"html": "<html>unavailable</html>", "missing trailer": strings.Split(listed, "File Creation")[0],
		"invalid timestamp": strings.Replace(listed, "1012202621:31", "1332202699:99", 1),
		"duplicate":         strings.Replace(listed, "ZTEST|Test Security", "AAPL|Test Security", 1),
		"bad flag":          strings.Replace(listed, "100|N|N", "100|?|N", 1),
		"short row":         strings.Replace(listed, "|100|N|N", "|100|N", 1),
		"empty":             strings.Split(listed, "\n")[0] + "\nFile Creation Time: 1012202621:31|||||||\n",
		"trailer payload":   strings.Replace(listed, "21:31|||||||", "21:31|junk||||||", 1),
	}
	for name, text := range cases {
		t.Run(name, func(t *testing.T) {
			if _, e := Parse("nasdaqlisted", []byte(text)); e == nil {
				t.Fatal("accepted malformed source")
			}
		})
	}
	if _, e := Parse("nasdaqlisted", []byte(strings.Repeat("x", MaxBytes+1))); e == nil {
		t.Fatal("accepted oversized source")
	}
	if _, e := Parse("otherlisted", []byte(strings.Replace(other, "|N|CLASS.B", "|?|CLASS.B", 1))); e == nil {
		t.Fatal("accepted unknown exchange")
	}
}
func TestFetchFailsClosed(t *testing.T) {
	for _, failure := range []string{"403", "429", "html", "large", "truncated"} {
		t.Run(failure, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path == "/nasdaq" {
					w.Write([]byte(listed))
					return
				}
				switch failure {
				case "403":
					w.WriteHeader(403)
				case "429":
					w.WriteHeader(429)
				case "html":
					w.Write([]byte("<html>error</html>"))
				case "large":
					w.Write([]byte(strings.Repeat("x", MaxBytes+1)))
				case "truncated":
					w.Write([]byte(strings.Split(other, "File Creation")[0]))
				}
			}))
			defer server.Close()
			client := &Client{HTTP: server.Client(), URLs: [2]string{server.URL + "/nasdaq", server.URL + "/other"}}
			if files, e := client.Fetch(context.Background()); e == nil || files != nil {
				t.Fatal("partial batch escaped validation")
			}
		})
	}
}
func TestCancellationAndSuccess(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/nasdaq" {
			w.Write([]byte(listed))
		} else {
			w.Write([]byte(other))
		}
	}))
	defer server.Close()
	client := &Client{HTTP: server.Client(), URLs: [2]string{server.URL + "/nasdaq", server.URL + "/other"}}
	files, e := client.Fetch(context.Background())
	if e != nil || len(files) != 2 {
		t.Fatalf("%v", e)
	}
	if files[0].FetchedAt.IsZero() || files[0].URL == "" || len(files[0].SHA256) != 64 {
		t.Fatal("missing provenance")
	}
	ctx, stop := context.WithDeadline(context.Background(), time.Now().Add(-time.Second))
	defer stop()
	if _, e = client.Fetch(ctx); e == nil {
		t.Fatal("ignored cancellation")
	}
	req, _ := http.NewRequest("GET", "https://evil.example/data", nil)
	if e = NewClient().HTTP.CheckRedirect(req, nil); e == nil {
		t.Fatal("accepted off-host redirect")
	}
}

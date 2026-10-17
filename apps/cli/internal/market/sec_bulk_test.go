package market

import (
	"archive/zip"
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func bulkFixture(t *testing.T, name, body string) []byte {
	t.Helper()
	var out bytes.Buffer
	z := zip.NewWriter(&out)
	w, err := z.Create(name)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = w.Write([]byte(body)); err != nil {
		t.Fatal(err)
	}
	if err = z.Close(); err != nil {
		t.Fatal(err)
	}
	return out.Bytes()
}
func TestSECBulkDownloadReuseIdentityAndNormalizer(t *testing.T) {
	raw := `{"cik":320193,"entityName":"Apple","facts":{"us-gaap":{"NetIncomeLoss":{"units":{"USD":[{"val":101,"start":"2025-10-01","end":"2026-09-30","filed":"2026-10-10","accn":"amended","fy":2026,"fp":"FY","form":"10-K/A"}]}}}}}`
	archive := bulkFixture(t, "CIK0000320193.json", raw)
	c := testClient(t, func(*http.Request) (int, string) { t.Fatal("unexpected generic request"); return 0, "" })
	calls, gates := 0, 0
	c.Gate = func(context.Context, string) error { gates++; return nil }
	c.HTTP.Transport = roundTrip(func(req *http.Request) (*http.Response, error) {
		calls++
		if req.URL.String() != "https://www.sec.gov/Archives/edgar/daily-index/xbrl/companyfacts.zip" || !strings.Contains(req.Header.Get("User-Agent"), "@") || req.Header.Get("Authorization") != "" {
			t.Fatal("unsafe bulk request")
		}
		return &http.Response{StatusCode: 200, ContentLength: int64(len(archive)), Body: io.NopCloser(bytes.NewReader(archive)), Header: http.Header{}}, nil
	})
	ctx := context.Background()
	dir := t.TempDir()
	b, err := c.DownloadSECBulk(ctx, "facts", dir)
	if err != nil {
		t.Fatal(err)
	}
	job := Job{Provider: "sec", Dataset: "facts", Subject: "cik:0000320193"}
	r, err := c.CollectSECBulk(ctx, job, b)
	if err != nil || len(r.Payload.Facts) != 1 || r.Payload.Facts[0].Value != "101" || !strings.HasSuffix(r.Evidence[0].URL, "#CIK0000320193.json") {
		t.Fatal(r, err)
	}
	b.Close()
	b, err = c.DownloadSECBulk(ctx, "facts", dir)
	if err != nil {
		t.Fatal(err)
	}
	defer b.Close()
	if calls != 1 || gates != 1 {
		t.Fatal("restart downloaded archive again", calls, gates)
	}
	if _, err = c.CollectSECBulk(ctx, Job{Provider: "sec", Dataset: "facts", Subject: "cik:0000000001"}, b); err == nil || err.Error() != "bulk_member_missing" {
		t.Fatal(err)
	}
	info, err := os.Stat(filepath.Join(dir, "sec-facts.zip"))
	if err != nil || info.Mode().Perm()&0077 != 0 {
		t.Fatal("non-private archive", err)
	}
}
func TestSECBulkRejectsWrongIdentityTraversalAndOversize(t *testing.T) {
	for _, tc := range []struct{ name, body, want string }{
		{"../CIK0000320193.json", `{}`, "invalid_bulk_archive"},
		{"CIK0000320193.json", `{"cik":1,"entityName":"Wrong","facts":{}}`, "invalid_bulk_identity"},
	} {
		dir := t.TempDir()
		path := filepath.Join(dir, "test.zip")
		os.WriteFile(path, bulkFixture(t, tc.name, tc.body), 0600)
		b := &SECBulk{URL: "https://www.sec.gov/Archives/edgar/daily-index/xbrl/companyfacts.zip"}
		err := b.open(path)
		if err == nil {
			_, err = NewClient().CollectSECBulk(context.Background(), Job{Provider: "sec", Dataset: "facts", Subject: "cik:0000320193"}, b)
			b.Close()
		}
		if err == nil || err.Error() != tc.want {
			t.Fatal(tc.name, err)
		}
	}
	c := testClient(t, func(*http.Request) (int, string) { return 200, "" })
	c.HTTP.Transport = roundTrip(func(*http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: 200, ContentLength: maxSECBulkBytes + 1, Body: io.NopCloser(strings.NewReader("")), Header: http.Header{}}, nil
	})
	if _, err := c.DownloadSECBulk(context.Background(), "facts", t.TempDir()); err == nil || err.Error() != "bulk_too_large" {
		t.Fatal(err)
	}
}

func TestSECBulkInterruptedDownloadResumesValidatedRange(t *testing.T) {
	archive := bulkFixture(t, "CIK0000320193.json", `{"cik":320193,"entityName":"Apple","facts":{"dei":{}}}`)
	half := len(archive) / 2
	calls := 0
	c := testClient(t, func(*http.Request) (int, string) { return 0, "" })
	c.HTTP.Transport = roundTrip(func(req *http.Request) (*http.Response, error) {
		calls++
		headers := http.Header{"Etag": []string{`"version-one"`}}
		if calls == 1 {
			return &http.Response{StatusCode: 200, ContentLength: int64(len(archive)), Body: io.NopCloser(bytes.NewReader(archive[:half])), Header: headers}, nil
		}
		if req.Header.Get("Range") != fmt.Sprintf("bytes=%d-", half) || req.Header.Get("If-Range") != `"version-one"` {
			t.Fatal("unsafe resume", req.Header)
		}
		headers.Set("Content-Range", fmt.Sprintf("bytes %d-%d/%d", half, len(archive)-1, len(archive)))
		return &http.Response{StatusCode: 206, ContentLength: int64(len(archive) - half), Body: io.NopCloser(bytes.NewReader(archive[half:])), Header: headers}, nil
	})
	dir := t.TempDir()
	if _, err := c.DownloadSECBulk(context.Background(), "facts", dir); err == nil || err.Error() != "incomplete_response" {
		t.Fatal(err)
	}
	b, err := c.DownloadSECBulk(context.Background(), "facts", dir)
	if err != nil {
		t.Fatal(err)
	}
	defer b.Close()
	if b.Bytes != int64(len(archive)) || calls != 2 {
		t.Fatal(b.Bytes, calls)
	}
}

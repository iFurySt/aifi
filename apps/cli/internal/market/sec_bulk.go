package market

import (
	"archive/zip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const maxSECBulkBytes int64 = 3 << 30

// SECBulk retains the official ZIP privately. Members are read individually;
// nothing is extracted to a path supplied by the archive.
type SECBulk struct {
	URL       string    `json:"url"`
	FetchedAt time.Time `json:"fetchedAt"`
	SHA256    string    `json:"sha256"`
	Bytes     int64     `json:"bytes"`
	archive   *zip.ReadCloser
	members   map[string]*zip.File
}

func secBulkURL(dataset string) (string, error) {
	switch dataset {
	case "facts":
		return "https://www.sec.gov/Archives/edgar/daily-index/xbrl/companyfacts.zip", nil
	case "filings":
		return "https://www.sec.gov/Archives/edgar/daily-index/bulkdata/submissions.zip", nil
	}
	return "", &Failure{Code: "unsupported_dataset"}
}

// DownloadSECBulk is an explicit bulk operation, not a page-read side effect.
// Each network request uses the existing SEC contact and durable request gate.
// A complete archive is reusable for 24 hours across interrupted imports.
func (c *Client) DownloadSECBulk(ctx context.Context, dataset, dir string) (*SECBulk, error) {
	endpoint, err := secBulkURL(dataset)
	if err != nil {
		return nil, err
	}
	if err = os.MkdirAll(dir, 0700); err != nil {
		return nil, err
	}
	path := filepath.Join(dir, "sec-"+dataset+".zip")
	metaPath := path + ".json"
	lock, err := os.OpenFile(path+".lock", os.O_CREATE|os.O_RDWR, 0600)
	if err != nil {
		return nil, err
	}
	defer lock.Close()
	if err = lockSECBulk(lock); err != nil {
		return nil, &Failure{Code: "bulk_already_running"}
	}

	if info, e := os.Lstat(path); e == nil && info.Mode().IsRegular() && info.Size() <= maxSECBulkBytes {
		var meta SECBulk
		body, e := os.ReadFile(metaPath)
		if e == nil && json.Unmarshal(body, &meta) == nil && meta.URL == endpoint && meta.Bytes == info.Size() && len(meta.SHA256) == 64 && !c.Now().Before(meta.FetchedAt) && c.Now().Sub(meta.FetchedAt) < 24*time.Hour {
			if e = meta.open(path); e == nil {
				return &meta, nil
			}
		}
	}
	n, checksum, err := c.downloadSECArchive(ctx, endpoint, path)
	if err != nil {
		return nil, err
	}
	tmpPath := path + ".part"

	bulk := &SECBulk{URL: endpoint, FetchedAt: c.Now(), SHA256: checksum, Bytes: n}
	// Validate the central directory before publishing the cache filename.
	if err = bulk.open(tmpPath); err != nil {
		return nil, err
	}
	bulk.Close()
	if err = os.Rename(tmpPath, path); err != nil {
		return nil, err
	}
	_ = os.Remove(path + ".part.json")
	body, err := json.Marshal(bulk)
	if err != nil {
		return nil, err
	}
	if err = os.WriteFile(metaPath, body, 0600); err != nil {
		return nil, err
	}
	if err = bulk.open(path); err != nil {
		return nil, err
	}
	return bulk, nil
}

func (b *SECBulk) open(path string) error {
	if err := validateSECBulkDirectory(path); err != nil {
		return err
	}
	z, err := zip.OpenReader(path)
	if err != nil {
		return &Failure{Code: "invalid_bulk_archive"}
	}
	if len(z.File) > maxSECBulkMembers {
		z.Close()
		return &Failure{Code: "invalid_bulk_archive"}
	}
	b.archive = z
	b.members = map[string]*zip.File{}
	for _, file := range z.File {
		name := file.Name
		if len(name) != 18 || !strings.HasPrefix(name, "CIK") || !strings.HasSuffix(name, ".json") || !cikPattern.MatchString(name[3:13]) {
			continue
		}
		if b.members[name] != nil {
			b.Close()
			return &Failure{Code: "ambiguous_bulk_member"}
		}
		b.members[name] = file
	}
	if len(b.members) == 0 {
		b.Close()
		return &Failure{Code: "invalid_bulk_archive"}
	}
	return nil
}

func (b *SECBulk) Close() error {
	if b.archive == nil {
		return nil
	}
	err := b.archive.Close()
	b.archive = nil
	return err
}

// CollectSECBulk reuses the single-company normalizers and fenced store writes.
// Archive membership and body CIK must both identify the requested issuer.
func (c *Client) CollectSECBulk(ctx context.Context, j Job, b *SECBulk) (Result, error) {
	r := Result{Payload: Payload{Complete: true}}
	endpoint, err := secBulkURL(j.Dataset)
	if err != nil || j.Provider != "sec" || b.URL != endpoint {
		return r, &Failure{Code: "invalid_bulk_source"}
	}
	if err = ctx.Err(); err != nil {
		return r, err
	}
	cik := strings.TrimPrefix(j.Subject, "cik:")
	if !cikPattern.MatchString(cik) {
		return r, &Failure{Code: "unmapped"}
	}
	name := "CIK" + cik + ".json"
	file := b.members[name]
	if file == nil {
		return r, &Failure{Code: "bulk_member_missing"}
	}
	if file.UncompressedSize64 > 32<<20 {
		return r, &Failure{Code: "source_window_too_large"}
	}
	reader, err := file.Open()
	if err != nil {
		return r, &Failure{Code: "invalid_bulk_member"}
	}
	defer reader.Close()
	raw, err := io.ReadAll(io.LimitReader(reader, (32<<20)+1))
	if err != nil || len(raw) > 32<<20 {
		return r, &Failure{Code: "invalid_bulk_member"}
	}
	var identity map[string]any
	if decodeJSON(raw, &identity) != nil || fmt.Sprintf("%010d", int64(number(identity["cik"]))) != cik {
		return r, &Failure{Code: "invalid_bulk_identity"}
	}
	r.Evidence = []Evidence{{URL: b.URL + "#" + name, Body: raw, FetchedAt: b.FetchedAt}}
	if j.Dataset == "facts" {
		err = c.parseSECFacts(raw, cik, &r)
	} else {
		err = c.parseSECFilings(raw, cik, &r)
	}
	return r, err
}

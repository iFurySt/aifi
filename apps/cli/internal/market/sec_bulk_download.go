package market

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

type secBulkPartial struct {
	URL       string    `json:"url"`
	Validator string    `json:"validator"`
	Bytes     int64     `json:"bytes"`
	StartedAt time.Time `json:"startedAt"`
}

// Slow first downloads survive cancellation or process exit. Resume requires a
// matching server validator and exact byte range; a changed nightly ZIP starts
// over instead of combining bytes from different publications.
func (c *Client) downloadSECArchive(ctx context.Context, endpoint, path string) (int64, string, error) {
	contact, err := c.SECContact(ctx)
	if err != nil {
		return 0, "", err
	}
	if !strings.Contains(contact, "@") || strings.ContainsAny(contact, "\r\n\x00") {
		return 0, "", &Failure{Code: "needs_contact"}
	}
	part, err := os.OpenFile(path+".part", os.O_CREATE|os.O_RDWR, 0600)
	if err != nil {
		return 0, "", err
	}
	defer part.Close()
	meta := secBulkPartial{}
	body, _ := os.ReadFile(path + ".part.json")
	_ = json.Unmarshal(body, &meta)
	info, err := part.Stat()
	if err != nil {
		return 0, "", err
	}
	offset := info.Size()
	if meta.URL != endpoint || meta.Validator == "" || meta.Bytes <= 0 || meta.Bytes > maxSECBulkBytes || offset > meta.Bytes || c.Now().Before(meta.StartedAt) || c.Now().Sub(meta.StartedAt) > 24*time.Hour {
		offset = 0
		meta = secBulkPartial{}
		if err = part.Truncate(0); err != nil {
			return 0, "", err
		}
	}
	if offset == 0 || offset != meta.Bytes {
		if c.Gate != nil {
			if err = c.Gate(ctx, "sec"); err != nil {
				return 0, "", err
			}
		}
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
		if err != nil {
			return 0, "", err
		}
		req.Header.Set("User-Agent", contact)
		req.Header.Set("Accept", "application/zip")
		if offset > 0 {
			req.Header.Set("Range", "bytes="+strconv.FormatInt(offset, 10)+"-")
			req.Header.Set("If-Range", meta.Validator)
		}
		client := *c.HTTP
		client.Timeout = 12 * time.Hour
		client.CheckRedirect = func(*http.Request, []*http.Request) error { return errors.New("redirect denied") }
		response, err := client.Do(req)
		if err != nil {
			return 0, "", &Failure{Code: "network_error"}
		}
		defer response.Body.Close()
		if response.StatusCode != 200 && response.StatusCode != 206 {
			if response.StatusCode == 429 {
				return 0, "", &Failure{Code: "rate_limited", RetryAfter: 15 * time.Minute}
			}
			return 0, "", &Failure{Code: "bulk_unavailable"}
		}
		total := response.ContentLength
		validator := response.Header.Get("ETag")
		if validator == "" {
			validator = response.Header.Get("Last-Modified")
		}
		if response.StatusCode == 206 {
			var start, end int64
			if _, err = fmt.Sscanf(response.Header.Get("Content-Range"), "bytes %d-%d/%d", &start, &end, &total); err != nil || start != offset || end != total-1 || total != meta.Bytes || validator != meta.Validator {
				return 0, "", &Failure{Code: "invalid_bulk_range"}
			}
		} else if offset > 0 {
			offset = 0
			if err = part.Truncate(0); err != nil {
				return 0, "", err
			}
		}
		if total > maxSECBulkBytes {
			return 0, "", &Failure{Code: "bulk_too_large"}
		}
		if total <= 0 {
			return 0, "", &Failure{Code: "invalid_bulk_length"}
		}
		meta = secBulkPartial{URL: endpoint, Validator: validator, Bytes: total, StartedAt: c.Now()}
		body, err = json.Marshal(meta)
		if err != nil {
			return 0, "", err
		}
		if err = os.WriteFile(path+".part.json", body, 0600); err != nil {
			return 0, "", err
		}
		if _, err = part.Seek(offset, io.SeekStart); err != nil {
			return 0, "", err
		}
		n, copyErr := io.Copy(part, io.LimitReader(response.Body, total-offset+1))
		if err = part.Sync(); err != nil {
			return 0, "", err
		}
		if copyErr != nil || n != total-offset {
			return 0, "", &Failure{Code: "incomplete_response"}
		}
	}
	if _, err = part.Seek(0, io.SeekStart); err != nil {
		return 0, "", err
	}
	hash := sha256.New()
	n, err := io.Copy(hash, io.LimitReader(part, maxSECBulkBytes+1))
	if err != nil {
		return 0, "", err
	}
	if n != meta.Bytes || n > maxSECBulkBytes {
		return 0, "", &Failure{Code: "incomplete_response"}
	}
	return n, hex.EncodeToString(hash.Sum(nil)), nil
}

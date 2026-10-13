package store

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

type Settings struct {
	Revision         int    `json:"revision"`
	DirectoryEnabled bool   `json:"directoryEnabled"`
	Automatic        bool   `json:"automatic"`
	IntervalHours    int    `json:"intervalHours"`
	SECUserAgent     string `json:"secUserAgent"`
}

func (s *Store) Settings(ctx context.Context) (Settings, error) {
	var value Settings
	var raw string
	var revision int
	err := s.db.QueryRowContext(ctx, "SELECT revision,settings_json FROM service_settings WHERE singleton=1").Scan(&revision, &raw)
	if err != nil {
		return value, err
	}
	err = json.Unmarshal([]byte(raw), &value)
	value.Revision = revision
	return value, err
}
func (s *Store) SaveSettings(ctx context.Context, value Settings) (Settings, error) {
	if value.IntervalHours < 1 || value.IntervalHours > 720 || len(value.SECUserAgent) > 255 || strings.ContainsAny(value.SECUserAgent, "\r\n\x00") {
		return value, errors.New("invalid sync interval or SEC identification")
	}
	raw, e := json.Marshal(value)
	if e != nil {
		return value, e
	}
	result, e := s.db.ExecContext(ctx, "UPDATE service_settings SET settings_json=?,revision=revision+1 WHERE singleton=1 AND revision=?", string(raw), value.Revision)
	if e != nil {
		return value, e
	}
	count, e := result.RowsAffected()
	if e != nil {
		return value, e
	}
	if count != 1 {
		return value, errors.New("settings changed; reload and try again")
	}
	return s.Settings(ctx)
}
func (s *Store) RequestSync(ctx context.Context) error {
	_, e := s.db.ExecContext(ctx, "UPDATE directory_requests SET requested=1 WHERE singleton=1")
	return e
}
func (s *Store) Requested(ctx context.Context) (bool, error) {
	var requested bool
	e := s.db.QueryRowContext(ctx, "SELECT requested FROM directory_requests WHERE singleton=1").Scan(&requested)
	return requested, e
}
func (s *Store) ClearRequest(ctx context.Context) error {
	_, e := s.db.ExecContext(ctx, "UPDATE directory_requests SET requested=0 WHERE singleton=1")
	return e
}

type Credential struct {
	Provider string   `json:"provider"`
	Fields   []string `json:"fields"`
}

func ValidCredential(provider, field string) bool {
	return provider == "massive" && field == "apiKey" || provider == "alpaca" && (field == "keyId" || field == "secret")
}
func (s *Store) PutCredentials(ctx context.Context, provider string, values map[string]string) error {
	if len(values) == 0 {
		return errors.New("no credential supplied")
	}
	for field, cipher := range values {
		encoded, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(cipher, "v1:"))
		if !ValidCredential(provider, field) || !strings.HasPrefix(cipher, "v1:") || err != nil || len(encoded) < 29 || len(cipher) > 16384 {
			return errors.New("invalid credential field")
		}
	}
	tx, e := s.db.BeginTx(ctx, nil)
	if e != nil {
		return e
	}
	defer tx.Rollback()
	for field, cipher := range values {
		if _, e = tx.ExecContext(ctx, "INSERT INTO credential_blobs VALUES(?,?,?) ON CONFLICT(provider,field) DO UPDATE SET ciphertext=excluded.ciphertext", provider, field, cipher); e != nil {
			return e
		}
	}
	return tx.Commit()
}
func (s *Store) RemoveCredentials(ctx context.Context, provider string) error {
	if provider != "massive" && provider != "alpaca" {
		return errors.New("unknown credential provider")
	}
	_, e := s.db.ExecContext(ctx, "DELETE FROM credential_blobs WHERE provider=?", provider)
	return e
}
func (s *Store) Credentials(ctx context.Context) ([]Credential, error) {
	result := []Credential{}
	rows, e := s.db.QueryContext(ctx, "SELECT provider,field FROM credential_blobs ORDER BY provider,field")
	if e != nil {
		return result, e
	}
	defer rows.Close()
	for rows.Next() {
		var provider, field string
		if e = rows.Scan(&provider, &field); e != nil {
			return nil, e
		}
		if len(result) == 0 || result[len(result)-1].Provider != provider {
			result = append(result, Credential{Provider: provider, Fields: []string{}})
		}
		result[len(result)-1].Fields = append(result[len(result)-1].Fields, field)
	}
	return result, rows.Err()
}
func (s *Store) LastSuccess(ctx context.Context) (time.Time, error) {
	var text string
	e := s.db.QueryRowContext(ctx, "SELECT COALESCE(MAX(finished_at),'') FROM sync_runs WHERE state='succeeded'").Scan(&text)
	if e != nil {
		return time.Time{}, e
	}
	if text == "" {
		return time.Time{}, nil
	}
	return time.Parse(time.RFC3339Nano, text)
}
func (s *Store) RetryAfter(ctx context.Context, lastSuccess time.Time) (time.Time, error) {
	var last string
	var count int
	e := s.db.QueryRowContext(ctx, "SELECT COALESCE(MAX(finished_at),''),COUNT(*) FROM sync_runs WHERE state='failed' AND started_at>?", stamp(lastSuccess)).Scan(&last, &count)
	if e != nil {
		return time.Time{}, e
	}
	if last == "" {
		return time.Time{}, nil
	}
	at, e := time.Parse(time.RFC3339Nano, last)
	if e != nil {
		return time.Time{}, e
	}
	step := 15 * time.Minute
	for count > 1 && step < time.Hour {
		step *= 2
		count--
	}
	return at.Add(step), nil
}
func (s *Store) ActiveLease(ctx context.Context) (time.Time, error) {
	var text string
	e := s.db.QueryRowContext(ctx, "SELECT COALESCE(MAX(lease_until),'') FROM sync_runs WHERE state='running'").Scan(&text)
	if e != nil {
		return time.Time{}, e
	}
	if text == "" {
		return time.Time{}, nil
	}
	return time.Parse(time.RFC3339Nano, text)
}
func (s *Store) DatabaseBytes(ctx context.Context) (int64, error) {
	var pages, size int64
	if e := s.db.QueryRowContext(ctx, "PRAGMA page_count").Scan(&pages); e != nil {
		return 0, e
	}
	if e := s.db.QueryRowContext(ctx, "PRAGMA page_size").Scan(&size); e != nil {
		return 0, e
	}
	if pages < 0 || size < 0 {
		return 0, fmt.Errorf("invalid database size")
	}
	return pages * size, nil
}

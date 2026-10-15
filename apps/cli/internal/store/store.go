// Package store persists immutable, provenance-bearing directory snapshots.
package store

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	_ "embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/ifuryst/aifi/apps/cli/internal/directory"
	_ "modernc.org/sqlite"
)

//go:embed schema.sql
var schema string
var ErrBusy = errors.New("directory sync already running; wait for its bounded lease")
var ErrLease = errors.New("directory sync lease expired or superseded")

type Store struct{ db *sql.DB }

func Open(ctx context.Context, dataDir string) (*Store, error) {
	absolute, err := filepath.Abs(dataDir)
	if err != nil {
		return nil, err
	}
	if err = os.MkdirAll(absolute, 0700); err != nil {
		return nil, err
	}
	file, err := os.OpenFile(filepath.Join(absolute, "aifi.sqlite"), os.O_CREATE|os.O_RDWR, 0600)
	if err != nil {
		return nil, err
	}
	file.Close()
	dsn := url.URL{Scheme: "file", Path: filepath.ToSlash(filepath.Join(absolute, "aifi.sqlite"))}
	q := url.Values{}
	q.Add("_pragma", "foreign_keys(1)")
	q.Add("_pragma", "busy_timeout(5000)")
	q.Set("_txlock", "immediate")
	dsn.RawQuery = q.Encode()
	db, err := sql.Open("sqlite", dsn.String())
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	var tx *sql.Tx
	fail := func(e error) (*Store, error) {
		if tx != nil {
			_ = tx.Rollback()
		}
		db.Close()
		return nil, e
	}
	if _, err = db.ExecContext(ctx, "PRAGMA journal_mode=WAL"); err != nil {
		return fail(err)
	}
	tx, err = db.BeginTx(ctx, nil)
	if err != nil {
		return fail(err)
	}
	defer tx.Rollback()
	// Future versions must be migrated explicitly, never silently opened as the current version.
	if _, err = tx.ExecContext(ctx, "CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY)"); err != nil {
		return fail(err)
	}
	var version int
	if err = tx.QueryRowContext(ctx, "SELECT COALESCE(MAX(version),0) FROM schema_migrations").Scan(&version); err != nil {
		return fail(err)
	}
	if version > 2 {
		return fail(fmt.Errorf("unsupported SQLite schema version %d", version))
	}
	if _, err = tx.ExecContext(ctx, schema); err != nil {
		return fail(err)
	}
	if err = tx.Commit(); err != nil {
		return fail(err)
	}
	return &Store{db: db}, nil
}
func (s *Store) Close() error  { return s.db.Close() }
func stamp(t time.Time) string { return t.UTC().Format("2006-01-02T15:04:05.000000000Z") }
func id() string {
	var b [16]byte
	if _, e := rand.Read(b[:]); e != nil {
		panic(e)
	}
	return hex.EncodeToString(b[:])
}
func (s *Store) Start(ctx context.Context, now time.Time) (string, error) {
	tx, e := s.db.BeginTx(ctx, nil)
	if e != nil {
		return "", e
	}
	defer tx.Rollback()
	if _, e = tx.ExecContext(ctx, "UPDATE sync_runs SET state='interrupted',finished_at=?,error='Lease expired before completion' WHERE state='running' AND lease_until<=?", stamp(now), stamp(now)); e != nil {
		return "", e
	}
	var active int
	if e = tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM sync_runs WHERE state='running'").Scan(&active); e != nil {
		return "", e
	}
	if active > 0 {
		return "", ErrBusy
	}
	run := id()
	if _, e = tx.ExecContext(ctx, "INSERT INTO sync_runs(id,state,started_at,lease_until) VALUES(?,'running',?,?)", run, stamp(now), stamp(now.Add(3*time.Minute))); e != nil {
		return "", e
	}
	return run, tx.Commit()
}
func (s *Store) Fail(ctx context.Context, run string, cause error) error {
	message := cause.Error()
	if len(message) > 2000 {
		message = message[:2000]
	}
	_, e := s.db.ExecContext(ctx, "UPDATE sync_runs SET state='failed',finished_at=?,error=? WHERE id=? AND state='running'", stamp(time.Now()), message, run)
	return e
}

type Result struct {
	RunID      string `json:"runId"`
	SnapshotID string `json:"snapshotId"`
	Changed    bool   `json:"changed"`
	Rows       int    `json:"rows"`
	Candidates int    `json:"candidates"`
}

func (s *Store) Commit(ctx context.Context, run string, files []directory.File, now time.Time) (Result, error) {
	result := Result{RunID: run}
	if len(files) != 2 || files[0].Name != "nasdaqlisted" || files[1].Name != "otherlisted" {
		return result, errors.New("both complete source files required")
	}
	for i, file := range files {
		checked, e := directory.Parse(file.Name, file.Content)
		if e != nil {
			return result, e
		}
		if checked.SHA256 != file.SHA256 || checked.Generation != file.Generation {
			return result, errors.New("source integrity mismatch")
		}
		files[i].Listings = checked.Listings
		files[i].Created = checked.Created
	}
	hash := sha256.Sum256([]byte("nasdaq-directory-v1:" + files[0].SHA256 + ":" + files[1].SHA256))
	result.SnapshotID = hex.EncodeToString(hash[:])
	tx, e := s.db.BeginTx(ctx, nil)
	if e != nil {
		return result, e
	}
	defer tx.Rollback()
	var valid int
	e = tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM sync_runs WHERE id=? AND state='running' AND lease_until>?", run, stamp(now)).Scan(&valid)
	if e != nil {
		return result, e
	}
	if valid != 1 {
		return result, ErrLease
	}
	var head string
	e = tx.QueryRowContext(ctx, "SELECT snapshot_id FROM directory_head WHERE singleton=1").Scan(&head)
	if e != nil && !errors.Is(e, sql.ErrNoRows) {
		return result, e
	}
	for _, file := range files {
		var prior string
		e = tx.QueryRowContext(ctx, "SELECT generation_key FROM snapshot_sources WHERE snapshot_id=? AND name=?", head, file.Name).Scan(&prior)
		if e != nil && !errors.Is(e, sql.ErrNoRows) {
			return result, e
		}
		if prior > file.Generation {
			return result, fmt.Errorf("%s: refusing older directory generation", file.Name)
		}
		result.Rows += len(file.Listings)
		for _, listing := range file.Listings {
			if !listing.Test && !listing.ETF {
				result.Candidates++
			}
		}
	}
	if head != "" {
		var previousCount int
		if e = tx.QueryRowContext(ctx, "SELECT row_count FROM directory_snapshots WHERE id=?", head).Scan(&previousCount); e != nil {
			return result, e
		}
		if result.Rows*2 < previousCount {
			return result, errors.New("refusing directory shrink greater than 50%; cached snapshot retained")
		}
	}
	result.Changed = head != result.SnapshotID
	var exists int
	if e = tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM directory_snapshots WHERE id=?", result.SnapshotID).Scan(&exists); e != nil {
		return result, e
	}
	if exists == 0 {
		if _, e = tx.ExecContext(ctx, "INSERT INTO directory_snapshots(id,imported_at,row_count,candidate_count) VALUES(?,?,?,?)", result.SnapshotID, stamp(now), result.Rows, result.Candidates); e != nil {
			return result, e
		}
		for _, file := range files {
			if _, e = tx.ExecContext(ctx, "INSERT OR IGNORE INTO source_objects(sha256,content) VALUES(?,?)", file.SHA256, file.Content); e != nil {
				return result, e
			}
			if _, e = tx.ExecContext(ctx, "INSERT INTO snapshot_sources VALUES(?,?,?,?,?,?,?)", result.SnapshotID, file.Name, file.SHA256, file.URL, file.Created, file.Generation, stamp(file.FetchedAt)); e != nil {
				return result, e
			}
			for _, l := range file.Listings {
				listingID := id()
				if _, e = tx.ExecContext(ctx, "INSERT INTO listings VALUES(?,?,?,?,?,?) ON CONFLICT(source,source_symbol,exchange_code) DO UPDATE SET last_seen_at=excluded.last_seen_at", listingID, l.Source, l.Symbol, l.Exchange, stamp(now), stamp(now)); e != nil {
					return result, e
				}
				if e = tx.QueryRowContext(ctx, "SELECT id FROM listings WHERE source=? AND source_symbol=? AND exchange_code=?", l.Source, l.Symbol, l.Exchange).Scan(&listingID); e != nil {
					return result, e
				}
				fields, e := json.Marshal(l.Fields)
				if e != nil {
					return result, e
				}
				if _, e = tx.ExecContext(ctx, "INSERT INTO directory_memberships VALUES(?,?,?,?,?,?,?)", result.SnapshotID, listingID, l.Name, l.ETF, l.Test, l.Type, string(fields)); e != nil {
					return result, e
				}
				for _, convention := range []string{"Symbol", "ACT Symbol", "CQS Symbol", "NASDAQ Symbol"} {
					if alias := l.Fields[convention]; alias != "" {
						if _, e = tx.ExecContext(ctx, "INSERT INTO directory_aliases VALUES(?,?,?,?)", result.SnapshotID, listingID, convention, alias); e != nil {
							return result, e
						}
					}
				}
			}
		}
	}
	if _, e = tx.ExecContext(ctx, "INSERT INTO directory_head VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET snapshot_id=excluded.snapshot_id", result.SnapshotID); e != nil {
		return result, e
	}
	if _, e = tx.ExecContext(ctx, "UPDATE sync_runs SET state='succeeded',finished_at=?,snapshot_id=? WHERE id=?", stamp(now), result.SnapshotID, run); e != nil {
		return result, e
	}
	return result, tx.Commit()
}

type ListingView struct {
	ID       string            `json:"id"`
	Symbol   string            `json:"symbol"`
	Name     string            `json:"name"`
	Source   string            `json:"source"`
	Exchange string            `json:"exchangeCode"`
	ETF      bool              `json:"etf"`
	Test     bool              `json:"test"`
	Type     string            `json:"securityType"`
	Fields   map[string]string `json:"sourceFields"`
}
type Page struct {
	Total      int           `json:"total"`
	SnapshotID string        `json:"snapshotId"`
	Scope      string        `json:"scope"`
	Offset     int           `json:"offset"`
	Items      []ListingView `json:"items"`
}

func (s *Store) List(ctx context.Context, query string, limit, offset int, all bool) (Page, error) {
	return s.list(ctx, query, limit, offset, all, false)
}

type Lookup struct {
	SnapshotID string       `json:"snapshotId"`
	Item       *ListingView `json:"item"`
}

func (s *Store) Get(ctx context.Context, symbol string) (Lookup, error) {
	p, err := s.list(ctx, symbol, 1, 0, false, true)
	value := Lookup{SnapshotID: p.SnapshotID}
	if len(p.Items) > 0 {
		value.Item = &p.Items[0]
	}
	return value, err
}

// Contains returns exact current candidate symbols with one snapshot-bound query.
// It is an internal authorization read, without profile fields or page counts.
func (s *Store) Contains(ctx context.Context, symbols []string) ([]string, error) {
	result := []string{}
	if len(symbols) > 50 {
		return nil, errors.New("invalid directory batch")
	}
	if len(symbols) == 0 {
		return result, nil
	}
	placeholders := make([]string, len(symbols))
	args := make([]any, len(symbols))
	for i, symbol := range symbols {
		placeholders[i] = "?"
		args[i] = strings.ToUpper(symbol)
	}
	rows, err := s.db.QueryContext(ctx, `SELECT DISTINCT UPPER(l.source_symbol)
      FROM directory_head h JOIN directory_memberships m ON m.snapshot_id=h.snapshot_id
      JOIN listings l ON l.id=m.listing_id
      WHERE h.singleton=1 AND m.test=0 AND m.etf=0 AND UPPER(l.source_symbol) IN (`+strings.Join(placeholders, ",")+`)`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var symbol string
		if err = rows.Scan(&symbol); err != nil {
			return nil, err
		}
		result = append(result, symbol)
	}
	return result, rows.Err()
}

func (s *Store) list(ctx context.Context, query string, limit, offset int, all, exact bool) (Page, error) {
	p := Page{Items: []ListingView{}, Scope: "candidates", Offset: offset}
	if all {
		p.Scope = "all"
	}
	if limit < 1 || limit > 200 || offset < 0 || offset > 100000 || len(query) > 255 {
		return p, errors.New("list bounds: limit 1–200, offset 0–100000, query up to 255 bytes")
	}
	err := s.db.QueryRowContext(ctx, "SELECT snapshot_id FROM directory_head WHERE singleton=1").Scan(&p.SnapshotID)
	if errors.Is(err, sql.ErrNoRows) {
		return p, nil
	}
	if err != nil {
		return p, err
	}
	// Escape LIKE metacharacters: a user's query always means literal text.
	escaped := strings.NewReplacer("\\", "\\\\", "%", "\\%", "_", "\\_").Replace(query)
	filter := ""
	if !all {
		filter = " AND m.test=0 AND m.etf=0"
	}
	where := ` FROM directory_memberships m JOIN listings l ON l.id=m.listing_id WHERE m.snapshot_id=?` + filter
	args := []any{p.SnapshotID}
	if exact {
		where += ` AND l.source_symbol = ? COLLATE NOCASE`
		args = append(args, query)
	} else {
		where += ` AND (l.source_symbol LIKE ? ESCAPE '\' OR m.name LIKE ? ESCAPE '\')`
		args = append(args, "%"+escaped+"%", "%"+escaped+"%")
	}
	if err = s.db.QueryRowContext(ctx, `SELECT count(*)`+where, args...).Scan(&p.Total); err != nil {
		return p, err
	}
	// Exact tickers lead search results even when many security names match.
	order := ` ORDER BY CASE WHEN l.source_symbol = ? COLLATE NOCASE THEN 0 ELSE 1 END,l.source_symbol,l.source,l.exchange_code LIMIT ? OFFSET ?`
	args = append(args, query, limit, offset)
	rows, err := s.db.QueryContext(ctx, `SELECT l.id,l.source_symbol,m.name,l.source,l.exchange_code,m.etf,m.test,m.security_type,m.fields_json`+where+order, args...)
	if err != nil {
		return p, err
	}
	defer rows.Close()
	for rows.Next() {
		var v ListingView
		var fields string
		if err = rows.Scan(&v.ID, &v.Symbol, &v.Name, &v.Source, &v.Exchange, &v.ETF, &v.Test, &v.Type, &fields); err != nil {
			return p, err
		}
		if err = json.Unmarshal([]byte(fields), &v.Fields); err != nil {
			return p, err
		}
		p.Items = append(p.Items, v)
	}
	return p, rows.Err()
}

type Run struct {
	ID         string `json:"id"`
	State      string `json:"state"`
	StartedAt  string `json:"startedAt"`
	FinishedAt string `json:"finishedAt,omitempty"`
	SnapshotID string `json:"snapshotId,omitempty"`
	Error      string `json:"error,omitempty"`
}
type Status struct {
	SnapshotID string           `json:"snapshotId"`
	Rows       int              `json:"rows"`
	Candidates int              `json:"candidates"`
	Sources    []directory.File `json:"sources"`
	Runs       []Run            `json:"recentRuns"`
}

func (s *Store) Status(ctx context.Context) (Status, error) {
	status := Status{Sources: []directory.File{}, Runs: []Run{}}
	err := s.db.QueryRowContext(ctx, "SELECT d.id,d.row_count,d.candidate_count FROM directory_head h JOIN directory_snapshots d ON d.id=h.snapshot_id WHERE singleton=1").Scan(&status.SnapshotID, &status.Rows, &status.Candidates)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return status, err
	}
	rows, err := s.db.QueryContext(ctx, "SELECT name,url,sha256,file_creation_time,generation_key,fetched_at FROM snapshot_sources WHERE snapshot_id=? ORDER BY name", status.SnapshotID)
	if err != nil {
		return status, err
	}
	for rows.Next() {
		var f directory.File
		var fetched string
		if err = rows.Scan(&f.Name, &f.URL, &f.SHA256, &f.Created, &f.Generation, &fetched); err != nil {
			rows.Close()
			return status, err
		}
		f.FetchedAt, err = time.Parse(time.RFC3339Nano, fetched)
		if err != nil {
			rows.Close()
			return status, err
		}
		status.Sources = append(status.Sources, f)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return status, err
	}
	rows, err = s.db.QueryContext(ctx, "SELECT id,state,started_at,COALESCE(finished_at,''),COALESCE(snapshot_id,''),COALESCE(error,'') FROM sync_runs ORDER BY started_at DESC LIMIT 10")
	if err != nil {
		return status, err
	}
	defer rows.Close()
	for rows.Next() {
		var r Run
		if err = rows.Scan(&r.ID, &r.State, &r.StartedAt, &r.FinishedAt, &r.SnapshotID, &r.Error); err != nil {
			return status, err
		}
		status.Runs = append(status.Runs, r)
	}
	return status, rows.Err()
}

// Sync owns a bounded lease; requests happen outside the database transaction.
func (s *Store) Sync(ctx context.Context, fetcher directory.Fetcher) (Result, error) {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Minute)
	defer cancel()
	run, err := s.Start(ctx, time.Now())
	if err != nil {
		return Result{}, err
	}
	files, err := fetcher.Fetch(ctx)
	var result Result
	if err == nil {
		result, err = s.Commit(ctx, run, files, time.Now())
	}
	if err != nil {
		cleanup, stop := context.WithTimeout(context.Background(), 5*time.Second)
		defer stop()
		if e := s.Fail(cleanup, run, err); e != nil {
			return result, errors.Join(err, fmt.Errorf("persist failed run: %w", e))
		}
	}
	return result, err
}

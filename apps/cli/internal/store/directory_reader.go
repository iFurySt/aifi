package store

import (
	"context"
	"database/sql"
	"net/url"
	"path/filepath"
)

type snapshotReader interface {
	QueryRowContext(context.Context, string, ...any) *sql.Row
}

// Stock reads use their own bounded pool, outside the serialized collector
// writer and expensive research/status reads. Never migrate or collect here.
func openInteractiveReader(ctx context.Context, directory string) (*sql.DB, error) {
	uri := url.URL{Scheme: "file", Path: filepath.ToSlash(filepath.Join(directory, "aifi.sqlite"))}
	uri.RawQuery = "mode=ro&_pragma=query_only(1)&_pragma=busy_timeout(250)"
	db, err := sql.Open("sqlite", uri.String())
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(4)
	db.SetMaxIdleConns(4)
	if err = db.PingContext(ctx); err != nil {
		db.Close()
		return nil, err
	}
	return db, nil
}

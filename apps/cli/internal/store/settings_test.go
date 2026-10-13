package store

import (
	"context"
	"strings"
	"testing"
)

func TestSettingsMigrationAndCAS(t *testing.T) {
	path := t.TempDir()
	ctx := context.Background()
	s, e := Open(ctx, path)
	if e != nil {
		t.Fatal(e)
	}
	commitTest(t, s, fixtures(t, "1012202621:31", true))
	s.db.Exec("DROP TABLE service_settings; DROP TABLE directory_requests; DROP TABLE credential_blobs; DELETE FROM schema_migrations WHERE version=2")
	s.Close()
	s, e = Open(ctx, path)
	if e != nil {
		t.Fatal(e)
	}
	defer s.Close()
	cfg, e := s.Settings(ctx)
	if e != nil || cfg.IntervalHours != 24 || !cfg.Automatic || !cfg.DirectoryEnabled {
		t.Fatal("bad migration defaults")
	}
	status, _ := s.Status(ctx)
	if status.Rows != 5 {
		t.Fatal("migration lost directory")
	}
	stale := cfg
	cfg.IntervalHours = 12
	next, e := s.SaveSettings(ctx, cfg)
	if e != nil || next.Revision != 1 {
		t.Fatal("settings not saved")
	}
	if _, e = s.SaveSettings(ctx, stale); e == nil {
		t.Fatal("stale write overwrote newer settings")
	}
	next.IntervalHours = 0
	if _, e = s.SaveSettings(ctx, next); e == nil {
		t.Fatal("invalid interval persisted")
	}
}
func TestCredentialsMetadataOnly(t *testing.T) {
	s := openTest(t)
	ctx := context.Background()
	cipher := "v1:" + strings.Repeat("A", 80)
	if e := s.PutCredentials(ctx, "massive", map[string]string{"apiKey": cipher}); e != nil {
		t.Fatal(e)
	}
	values, e := s.Credentials(ctx)
	if e != nil || len(values) != 1 || values[0].Fields[0] != "apiKey" {
		t.Fatal("credential metadata missing")
	}
	if e = s.PutCredentials(ctx, "shell", map[string]string{"apiKey": cipher}); e == nil {
		t.Fatal("unknown provider stored")
	}
	if e = s.RemoveCredentials(ctx, "massive"); e != nil {
		t.Fatal(e)
	}
	values, _ = s.Credentials(ctx)
	if len(values) != 0 {
		t.Fatal("credential not removed")
	}
}

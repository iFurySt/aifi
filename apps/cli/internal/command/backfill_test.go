package command

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"path/filepath"
	"testing"
)

func TestBackfillAuditAndFlags(t *testing.T) {
	root := New()
	out := new(bytes.Buffer)
	root.SetOut(out)
	root.SetArgs([]string{"--data-dir", t.TempDir(), "data", "research", "backfill"})
	if err := root.ExecuteContext(context.Background()); err != nil {
		t.Fatal(err)
	}
	var result map[string]any
	if err := json.Unmarshal(out.Bytes(), &result); err != nil || result["universe"] != float64(0) {
		t.Fatal(out.String(), err)
	}
	root = New()
	root.SetOut(new(bytes.Buffer))
	root.SetArgs([]string{"--data-dir", t.TempDir(), "data", "research", "backfill", "--sec-bulk"})
	if err := root.ExecuteContext(context.Background()); err == nil {
		t.Fatal("bulk download without explicit worker run")
	}
}

func TestBackfillRecognizesActualSQLiteWriteContention(t *testing.T) {
	dsn := "file:" + filepath.ToSlash(filepath.Join(t.TempDir(), "busy.sqlite")) + "?_pragma=busy_timeout(1)"
	a, err := sql.Open("sqlite", dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer a.Close()
	b, err := sql.Open("sqlite", dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer b.Close()
	if _, err = a.Exec("CREATE TABLE test_busy(value INTEGER)"); err != nil {
		t.Fatal(err)
	}
	tx, err := a.Begin()
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback()
	if _, err = tx.Exec("INSERT INTO test_busy VALUES(1)"); err != nil {
		t.Fatal(err)
	}
	_, err = b.Exec("INSERT INTO test_busy VALUES(2)")
	if err == nil || backfillFailureCode(fmt.Errorf("bulk write: %w", err)) != "store_busy" {
		t.Fatal("transient writer conflict not resumable", err)
	}
	if backfillFailureCode(errors.New("private error details")) != "bulk_import_failed" {
		t.Fatal("unclassified error details leaked")
	}
	if backfillFailureCode(context.DeadlineExceeded) != "store_timeout" || backfillFailureCode(context.Canceled) == "store_timeout" {
		t.Fatal("bounded write timeout confused with caller cancellation")
	}
}

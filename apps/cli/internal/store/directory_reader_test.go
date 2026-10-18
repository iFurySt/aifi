package store

import (
	"context"
	"strings"
	"testing"
	"time"
)

func TestDirectoryReadsBypassWriterAndSeeOnlyCommittedSnapshots(t *testing.T) {
	s := openTest(t)
	first := commitTest(t, s, fixtures(t, "1012202621:31", true))
	tx, err := s.db.BeginTx(context.Background(), nil)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback()
	if _, err = tx.Exec("UPDATE directory_memberships SET name='Uncommitted' WHERE snapshot_id=?", first.SnapshotID); err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	for _, selection := range []CollectionSelection{{}, {Collection: "nasdaq100"}, {Collection: "sp500"}, {Collection: "watchlist", Symbols: []string{"AAPL"}}} {
		page, err := s.ListCollection(ctx, "", 50, 0, selection)
		if err != nil || page.Total == 0 {
			t.Fatalf("read queued behind writer: %s %+v %v", selection.Collection, page, err)
		}
		for _, item := range page.Items {
			if item.Name == "Uncommitted" {
				t.Fatal("dirty read")
			}
		}
	}
	if _, err := tx.Exec("UPDATE research_config SET config_json='Uncommitted invalid JSON'"); err != nil {
		t.Fatal(err)
	}
	view, err := s.ResearchRead(ctx, "AAPL")
	if err != nil || view.Symbol != "AAPL" {
		t.Fatalf("research waited for writer or read uncommitted config: %+v %v", view, err)
	}
	found, err := s.Contains(ctx, []string{"AAPL", "UNKNOWN"})
	if err != nil || len(found) != 1 || found[0] != "AAPL" {
		t.Fatalf("membership blocked: %v %v", found, err)
	}
	lookup, err := s.Get(ctx, "AAPL")
	if err != nil || lookup.Item == nil || lookup.Item.Name == "Uncommitted" {
		t.Fatalf("lookup blocked or dirty: %+v %v", lookup, err)
	}
	if _, err = s.reads.ExecContext(ctx, "DELETE FROM directory_head"); err == nil {
		t.Fatal("directory reader can write")
	}
	if err = tx.Rollback(); err != nil {
		t.Fatal(err)
	}
	next := commitTest(t, s, fixtures(t, "1013202621:31", false))
	page, err := s.List(ctx, "", 50, 0, false)
	if err != nil || page.SnapshotID != next.SnapshotID || page.Total != 2 {
		t.Fatalf("reader retained old snapshot: %+v %v", page, err)
	}
	for _, item := range page.Items {
		if strings.EqualFold(item.Symbol, "MSFT") {
			t.Fatal("old member retained")
		}
	}
}

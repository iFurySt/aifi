package store

import (
	"context"
	"encoding/json"
	"testing"
	"time"
)

func TestCollectionPagingAndCoverage(t *testing.T) {
	s := openTest(t)
	ctx := context.Background()
	empty, e := s.ListCollection(ctx, "", 50, 0, CollectionSelection{Collection: "sp500"})
	if e != nil || empty.Total != 0 || empty.Collection.MemberCount != 503 || len(empty.Collection.UnresolvedSymbols) != 503 {
		t.Fatal(empty, e)
	}
	commitTest(t, s, fixtures(t, "1012202621:31", true))
	for _, id := range []string{"sp500", "nasdaq100"} {
		first, e := s.ListCollection(ctx, "", 1, 0, CollectionSelection{Collection: id})
		second, err := s.ListCollection(ctx, "", 1, 1, CollectionSelection{Collection: id})
		if e != nil || err != nil || first.Total != 2 || second.Total != 2 || len(first.Items) != 1 || len(second.Items) != 1 || first.Items[0].Symbol == second.Items[0].Symbol {
			t.Fatal(first, second, e, err)
		}
		if first.Collection.AvailableCount != 2 || first.Collection.MemberCount-len(first.Collection.UnresolvedSymbols) != 2 || first.Collection.Source == "" || first.Collection.SnapshotDate == "" {
			t.Fatal(first.Collection)
		}
		searched, e := s.ListCollection(ctx, "software", 50, 0, CollectionSelection{Collection: id})
		if e != nil || searched.Total != 1 || searched.Items[0].Symbol != "MSFT" || searched.Collection.AvailableCount != 2 {
			t.Fatal(searched, e)
		}
		outside, e := s.ListCollection(ctx, "Class", 50, 0, CollectionSelection{Collection: id})
		if e != nil || outside.Total != 0 {
			t.Fatal(outside, e)
		}
	}
	global, e := s.Get(ctx, "CLASS.B")
	if e != nil || global.Item == nil {
		t.Fatal(global, e)
	}
	watch, e := s.ListCollection(ctx, "", 50, 0, CollectionSelection{Collection: "watchlist", Symbols: []string{"CLASS.B", "UNKNOWN", "CLASS.B"}})
	if e != nil || watch.Total != 1 || watch.Items[0].Symbol != "CLASS.B" || watch.Collection.MemberCount != 2 || watch.Collection.AvailableCount != 1 || len(watch.Collection.UnresolvedSymbols) != 1 || watch.Collection.UnresolvedSymbols[0] != "UNKNOWN" {
		t.Fatal(watch, e)
	}
	none, e := s.ListCollection(ctx, "", 50, 0, CollectionSelection{Collection: "watchlist", Symbols: []string{}})
	if e != nil || none.Total != 0 || len(none.Items) != 0 || none.SnapshotID == watch.SnapshotID {
		t.Fatal(none, e)
	}
	for _, input := range []CollectionSelection{{Collection: "custom"}, {Collection: "sp500", Symbols: []string{"AAPL"}}, {Collection: "watchlist", Symbols: []string{"../private"}}, {Collection: "watchlist", Symbols: make([]string, 51)}} {
		if _, e = s.ListCollection(ctx, "", 50, 0, input); e == nil {
			t.Fatal("accepted invalid collection", input)
		}
	}
}

func TestIndexSeedsPreserveNewerHeadsAndRejectPartialPayloads(t *testing.T) {
	ctx := context.Background()
	path := t.TempDir()
	s, e := Open(ctx, path)
	if e != nil {
		t.Fatal(e)
	}
	var seeds []indexSnapshot
	if e = json.Unmarshal(indexSeed, &seeds); e != nil {
		t.Fatal(e)
	}
	before, e := s.ListCollection(ctx, "", 50, 0, CollectionSelection{Collection: "sp500"})
	if e != nil {
		t.Fatal(e)
	}
	seeds[0].Symbols = seeds[0].Symbols[:100]
	invalid, _ := json.Marshal(seeds)
	tx, e := s.db.BeginTx(ctx, nil)
	if e != nil {
		t.Fatal(e)
	}
	if e = seedIndexes(ctx, tx, invalid); e == nil {
		t.Fatal("accepted truncated list")
	}
	tx.Rollback()
	json.Unmarshal(indexSeed, &seeds)
	parsed, _ := time.Parse(time.RFC3339, seeds[0].FetchedAt)
	seeds[0].FetchedAt = parsed.Add(24 * time.Hour).Format(time.RFC3339)
	newer, _ := json.Marshal(seeds)
	tx, e = s.db.BeginTx(ctx, nil)
	if e != nil {
		t.Fatal(e)
	}
	if e = seedIndexes(ctx, tx, newer); e != nil {
		t.Fatal(e)
	}
	if e = tx.Commit(); e != nil {
		t.Fatal(e)
	}
	current, e := s.ListCollection(ctx, "", 50, 0, CollectionSelection{Collection: "sp500"})
	if e != nil || current.Collection.SnapshotID == before.Collection.SnapshotID {
		t.Fatal(current, e)
	}
	s.Close()
	s, e = Open(ctx, path)
	if e != nil {
		t.Fatal(e)
	}
	defer s.Close()
	reopened, e := s.ListCollection(ctx, "", 50, 0, CollectionSelection{Collection: "sp500"})
	if e != nil || reopened.Collection.SnapshotID != current.Collection.SnapshotID {
		t.Fatal("older bundled seed rolled back newer index", reopened, e)
	}
	if count(t, s, "index_snapshots") != 3 {
		t.Fatal("repeat seed duplicated snapshots")
	}
}

func TestCollectionsMigrationPreservesExistingState(t *testing.T) {
	ctx := context.Background()
	path := t.TempDir()
	s, e := Open(ctx, path)
	if e != nil {
		t.Fatal(e)
	}
	commitTest(t, s, fixtures(t, "1012202621:31", true))
	cfg, _ := s.Settings(ctx)
	cfg.IntervalHours = 13
	s.SaveSettings(ctx, cfg)
	if _, e = s.db.Exec(`DROP TABLE index_heads;DROP TABLE index_memberships;DROP TABLE index_snapshots;DELETE FROM schema_migrations WHERE version=3`); e != nil {
		t.Fatal(e)
	}
	s.Close()
	s, e = Open(ctx, path)
	if e != nil {
		t.Fatal(e)
	}
	defer s.Close()
	cfg, e = s.Settings(ctx)
	if e != nil || cfg.IntervalHours != 13 {
		t.Fatal(cfg, e)
	}
	page, e := s.List(ctx, "", 50, 0, false)
	if e != nil || page.Total != 3 {
		t.Fatal(page, e)
	}
	scoped, e := s.ListCollection(ctx, "", 50, 0, CollectionSelection{Collection: "nasdaq100"})
	if e != nil || scoped.Total != 2 || scoped.Collection.MemberCount != 101 {
		t.Fatal(scoped, e)
	}
}

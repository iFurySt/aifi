package store

import (
	"context"
	"errors"
	"github.com/ifuryst/aifi/apps/cli/internal/directory"
	"strings"
	"sync"
	"testing"
	"time"
)

func fixtures(t *testing.T, stamp string, include bool) []directory.File {
	t.Helper()
	nasdaq := "Symbol|Security Name|Market Category|Test Issue|Financial Status|Round Lot Size|ETF|NextShares\nAAPL|Example common stock|Q|N|N|100|N|N\nEXETF|Example ETF|Q|N|N|100|Y|N\nZTEST|Test security|Q|Y|N|100|N|N\n"
	if include {
		nasdaq += "MSFT|Example software|Q|N|N|100|N|N\n"
	}
	nasdaq += "File Creation Time: " + stamp + "|||||||\n"
	other := "ACT Symbol|Security Name|Exchange|CQS Symbol|ETF|Round Lot Size|Test Issue|NASDAQ Symbol\nCLASS.B|Example Class B|N|CLASS.B|N|100|N|CLASS/B\nFile Creation Time: " + stamp + "||||||\n"
	var files []directory.File
	for i, text := range []string{nasdaq, other} {
		name := []string{"nasdaqlisted", "otherlisted"}[i]
		f, e := directory.Parse(name, []byte(text))
		if e != nil {
			t.Fatal(e)
		}
		f.URL = "https://example.invalid/" + name
		f.FetchedAt = time.Now().UTC()
		files = append(files, f)
	}
	return files
}
func openTest(t *testing.T) *Store {
	t.Helper()
	s, e := Open(context.Background(), t.TempDir())
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { s.Close() })
	return s
}
func commitTest(t *testing.T, s *Store, files []directory.File) Result {
	t.Helper()
	ctx := context.Background()
	now := time.Now()
	r, e := s.Start(ctx, now)
	if e != nil {
		t.Fatal(e)
	}
	res, e := s.Commit(ctx, r, files, now)
	if e != nil {
		t.Fatal(e)
	}
	return res
}
func count(t *testing.T, s *Store, table string) int {
	t.Helper()
	var n int
	if e := s.db.QueryRow("SELECT COUNT(*) FROM " + table).Scan(&n); e != nil {
		t.Fatal(e)
	}
	return n
}
func TestSnapshotsDedupAndHistory(t *testing.T) {
	s := openTest(t)
	ctx := context.Background()
	files := fixtures(t, "1012202621:31", true)
	first := commitTest(t, s, files)
	if !first.Changed || first.Rows != 5 || first.Candidates != 3 {
		t.Fatalf("%+v", first)
	}
	page, e := s.List(ctx, "MSFT", 10, 0, false)
	if e != nil || len(page.Items) != 1 {
		t.Fatalf("%+v %v", page, e)
	}
	listingID := page.Items[0].ID
	same := commitTest(t, s, files)
	if same.Changed || same.SnapshotID != first.SnapshotID || count(t, s, "directory_snapshots") != 1 || count(t, s, "directory_memberships") != 5 {
		t.Fatal("repeat inserted duplicate snapshot")
	}
	commitTest(t, s, fixtures(t, "1013202621:31", false))
	page, e = s.List(ctx, "MSFT", 10, 0, false)
	if e != nil || len(page.Items) != 0 {
		t.Fatal("absent row still in current membership")
	}
	if count(t, s, "listings") != 5 {
		t.Fatal("deleted historical listing")
	}
	commitTest(t, s, fixtures(t, "1014202621:31", true))
	page, e = s.List(ctx, "MSFT", 10, 0, false)
	if e != nil || page.Items[0].ID != listingID {
		t.Fatal("reappearance lost listing identity")
	}
	page, e = s.List(ctx, "", 200, 0, false)
	if e != nil || len(page.Items) != 3 {
		t.Fatal("candidate filters failed")
	}
	for _, v := range page.Items {
		if v.Type != "unknown" {
			t.Fatal("inferred common stock from ETF=N")
		}
	}
	page, e = s.List(ctx, "", 200, 0, true)
	if e != nil || len(page.Items) != 5 {
		t.Fatal("all source rows not preserved")
	}
	page, e = s.List(ctx, "%", 20, 0, true)
	if e != nil || len(page.Items) != 0 {
		t.Fatal("LIKE wildcards were not literal")
	}
	status, e := s.Status(ctx)
	if e != nil || len(status.Sources) != 2 || len(status.Runs) != 4 {
		t.Fatalf("%+v %v", status, e)
	}
}
func TestAtomicRollbackAndStaleSource(t *testing.T) {
	s := openTest(t)
	ctx := context.Background()
	first := commitTest(t, s, fixtures(t, "1013202621:31", true))
	files := fixtures(t, "1014202621:31", true)
	// Force a failure after snapshot/source rows have begun writing.
	_, e := s.db.Exec("CREATE TRIGGER reject_membership BEFORE INSERT ON directory_memberships BEGIN SELECT RAISE(ABORT,'test rollback'); END;")
	if e != nil {
		t.Fatal(e)
	}
	run, e := s.Start(ctx, time.Now())
	if e != nil {
		t.Fatal(e)
	}
	if _, e = s.Commit(ctx, run, files, time.Now()); e == nil {
		t.Fatal("expected transaction failure")
	}
	s.Fail(ctx, run, e)
	if count(t, s, "directory_snapshots") != 1 || count(t, s, "source_objects") != 2 {
		t.Fatal("partial writes survived rollback")
	}
	status, e := s.Status(ctx)
	if e != nil || status.SnapshotID != first.SnapshotID || status.Runs[0].State != "failed" {
		t.Fatal("cached head/run not retained")
	}
	s.db.Exec("DROP TRIGGER reject_membership")
	run, e = s.Start(ctx, time.Now())
	if e != nil {
		t.Fatal(e)
	}
	if _, e = s.Commit(ctx, run, fixtures(t, "1012202621:31", true), time.Now()); e == nil {
		t.Fatal("allowed stale feed overwrite")
	}
	s.Fail(ctx, run, e)
}
func TestConcurrentLeaseAndCrashRecovery(t *testing.T) {
	path := t.TempDir()
	ctx := context.Background()
	a, e := Open(ctx, path)
	if e != nil {
		t.Fatal(e)
	}
	defer a.Close()
	b, e := Open(ctx, path)
	if e != nil {
		t.Fatal(e)
	}
	defer b.Close()
	var wait sync.WaitGroup
	var mutex sync.Mutex
	var success, busy int
	for _, s := range []*Store{a, b} {
		wait.Add(1)
		go func(s *Store) {
			defer wait.Done()
			_, e := s.Start(ctx, time.Now())
			mutex.Lock()
			defer mutex.Unlock()
			if e == nil {
				success++
			} else if errors.Is(e, ErrBusy) {
				busy++
			} else {
				t.Errorf("unexpected contention: %v", e)
			}
		}(s)
	}
	wait.Wait()
	if success != 1 || busy != 1 {
		t.Fatalf("winners=%d busy=%d", success, busy)
	}
	// Model a crashed process with an expired durable lease, then recover it.
	var old string
	a.db.QueryRow("SELECT id FROM sync_runs WHERE state='running'").Scan(&old)
	a.db.Exec("UPDATE sync_runs SET lease_until=? WHERE id=?", stamp(time.Now().Add(-time.Second)), old)
	next, e := b.Start(ctx, time.Now())
	if e != nil {
		t.Fatal(e)
	}
	if _, e = a.Commit(ctx, old, fixtures(t, "1012202621:31", true), time.Now()); !errors.Is(e, ErrLease) {
		t.Fatalf("stale owner committed: %v", e)
	}
	if _, e = b.Commit(ctx, next, fixtures(t, "1012202621:31", true), time.Now()); e != nil {
		t.Fatal(e)
	}
}

type failingFetcher struct{}

func (failingFetcher) Fetch(context.Context) ([]directory.File, error) {
	return nil, errors.New("HTTP 403")
}
func TestSyncFailureAndVersionGuard(t *testing.T) {
	s := openTest(t)
	ctx := context.Background()
	first := commitTest(t, s, fixtures(t, "1012202621:31", true))
	if _, e := s.Sync(ctx, failingFetcher{}); e == nil {
		t.Fatal("lost provider error")
	}
	status, e := s.Status(ctx)
	if e != nil || status.SnapshotID != first.SnapshotID || status.Runs[0].State != "failed" || !strings.Contains(status.Runs[0].Error, "403") {
		t.Fatal("failed sync advanced head or lost diagnostics")
	}
	path := t.TempDir()
	v, e := Open(ctx, path)
	if e != nil {
		t.Fatal(e)
	}
	v.db.Exec("INSERT INTO schema_migrations VALUES(99)")
	v.Close()
	if next, e := Open(ctx, path); e == nil {
		next.Close()
		t.Fatal("opened future schema")
	}
}
func TestShrinkAndIntegrityGuard(t *testing.T) {
	s := openTest(t)
	ctx := context.Background()
	commitTest(t, s, fixtures(t, "1012202621:31", true))
	// Simulate much larger prior coverage to verify catastrophic truncation guards.
	s.db.Exec("UPDATE directory_snapshots SET row_count=100")
	run, e := s.Start(ctx, time.Now())
	if e != nil {
		t.Fatal(e)
	}
	if _, e = s.Commit(ctx, run, fixtures(t, "1013202621:31", false), time.Now()); e == nil {
		t.Fatal("accepted massive shrink")
	}
	s.Fail(ctx, run, e)
	files := fixtures(t, "1013202621:31", false)
	files[0].SHA256 = "bad"
	run, e = s.Start(ctx, time.Now())
	if e != nil {
		t.Fatal(e)
	}
	if _, e = s.Commit(ctx, run, files, time.Now()); e == nil {
		t.Fatal("accepted bad checksum")
	}
	s.Fail(ctx, run, e)
}

func TestDirectoryPaginationAndExactLookup(t *testing.T) {
	s := openTest(t)
	ctx := context.Background()
	empty, err := s.Get(ctx, "AAPL")
	if err != nil || empty.Item != nil || empty.SnapshotID != "" {
		t.Fatal("empty store lookup", empty, err)
	}
	commitTest(t, s, fixtures(t, "1012202621:31", true))
	first, err := s.List(ctx, "", 1, 0, false)
	second, e := s.List(ctx, "", 1, 1, false)
	if err != nil || e != nil || first.Total != 3 || second.Total != 3 || len(first.Items) != 1 || len(second.Items) != 1 || first.Items[0].ID == second.Items[0].ID {
		t.Fatal("bad pagination", first, second, err, e)
	}
	byName, err := s.List(ctx, "software", 10, 0, false)
	if err != nil || byName.Total != 1 || byName.Items[0].Symbol != "MSFT" {
		t.Fatal("name search", byName, err)
	}
	for _, sym := range []string{"msft", "CLASS.B"} {
		found, err := s.Get(ctx, sym)
		if err != nil || found.Item == nil || found.SnapshotID != first.SnapshotID {
			t.Fatal("exact lookup", found, err)
		}
	}
	for _, sym := range []string{"software", "MS", "EXETF", "ZTEST", "UNKNOWN"} {
		found, err := s.Get(ctx, sym)
		if err != nil || found.Item != nil {
			t.Fatal("partial, name, excluded or unknown symbol resolved", sym, found, err)
		}
	}
	beyond, err := s.List(ctx, "", 10, 3, false)
	if err != nil || beyond.Total != 3 || len(beyond.Items) != 0 {
		t.Fatal("end of pagination", beyond, err)
	}
}

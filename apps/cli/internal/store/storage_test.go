package store

import (
	"context"
	"testing"
)

func TestStorageAccountsForPagesIndexesAndFreeSpace(t *testing.T) {
	ctx := context.Background()
	db, err := Open(ctx, t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	before, err := db.DatabaseStorage(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = db.db.ExecContext(ctx, `INSERT INTO research_evidence VALUES('fixture','yahoo','https://example.invalid','2026-10-17',zeroblob(200000)); CREATE TABLE storage_fixture(body BLOB); INSERT INTO storage_fixture VALUES(zeroblob(400000)); DROP TABLE storage_fixture;`); err != nil {
		t.Fatal(err)
	}
	after, err := db.DatabaseStorage(ctx)
	if err != nil {
		t.Fatal(err)
	}
	var total int64
	for _, c := range after.Categories {
		if c.Bytes < 0 {
			t.Fatal("negative category", c)
		}
		total += c.Bytes
		if c.ID == "evidence" && c.Bytes < 200000 {
			t.Fatal("evidence missing overflow pages", c)
		}
		if c.ID == "overhead" && c.Bytes < 400000 {
			t.Fatal("free pages missing", c)
		}
	}
	if total != after.Bytes || after.Bytes <= before.Bytes {
		t.Fatalf("invalid page totals: %+v", after)
	}
	var directoryBytes int64
	err = db.db.QueryRowContext(ctx, `SELECT sum(d.pgsize) FROM dbstat d JOIN sqlite_schema s ON s.name=d.name WHERE s.tbl_name IN ('index_heads','index_snapshots','index_memberships')`).Scan(&directoryBytes)
	if err != nil {
		t.Fatal(err)
	}
	if after.Categories[3].Bytes < directoryBytes {
		t.Fatal("indexes not counted")
	}
}

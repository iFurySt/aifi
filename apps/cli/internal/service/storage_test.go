package service

import (
	"context"
	"testing"

	"github.com/ifuryst/aifi/apps/cli/internal/store"
)

func TestStorageReadNeverCollects(t *testing.T) {
	s, fetch := setup(t)
	result, err := s.Dispatch(context.Background(), Request{Method: "storage.database"})
	if err != nil {
		t.Fatal(err)
	}
	if result.(store.DatabaseStorage).Bytes <= 0 {
		t.Fatal("no SQLite pages")
	}
	if fetch.calls.Load() != 0 {
		t.Fatal("storage read fetched source data")
	}
	for _, method := range []string{"storage.reveal", "storage.files", "storage.read"} {
		if _, err := s.Dispatch(context.Background(), Request{Method: method}); err == nil {
			t.Fatalf("host-only method allowed: %s", method)
		}
	}
}

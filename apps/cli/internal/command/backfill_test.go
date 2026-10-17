package command

import (
	"bytes"
	"context"
	"encoding/json"
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

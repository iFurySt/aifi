package command

import (
	"bytes"
	"context"
	"encoding/json"
	"testing"
)

func TestCachedCommandsAndBounds(t *testing.T) {
	path := t.TempDir()
	for _, command := range []string{"list", "status"} {
		root := New()
		out := new(bytes.Buffer)
		root.SetOut(out)
		root.SetArgs([]string{"--data-dir", path, "data", "directory", command})
		if e := root.ExecuteContext(context.Background()); e != nil {
			t.Fatal(e)
		}
		var result map[string]any
		if e := json.Unmarshal(out.Bytes(), &result); e != nil {
			t.Fatal(e)
		}
		if result["snapshotId"] != "" {
			t.Fatal("empty store claimed a snapshot")
		}
	}
	for _, args := range [][]string{{"list", "--limit", "0"}, {"list", "--scope", "common-stock"}, {"sync", "extra"}, {"list", "--offset", "-1"}} {
		root := New()
		root.SetOut(new(bytes.Buffer))
		root.SetArgs(append([]string{"--data-dir", path, "data", "directory"}, args...))
		if e := root.ExecuteContext(context.Background()); e == nil {
			t.Fatalf("accepted invalid args %v", args)
		}
	}
}

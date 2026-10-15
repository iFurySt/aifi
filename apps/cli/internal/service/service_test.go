package service

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/ifuryst/aifi/apps/cli/internal/directory"
	"github.com/ifuryst/aifi/apps/cli/internal/store"
	"io"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

type fakeFetcher struct {
	calls atomic.Int32
	fail  bool
}

func (f *fakeFetcher) Fetch(ctx context.Context) ([]directory.File, error) {
	f.calls.Add(1)
	if f.fail {
		return nil, errors.New("provider unavailable")
	}
	texts := []string{"Symbol|Security Name|Market Category|Test Issue|Financial Status|Round Lot Size|ETF|NextShares\nEXAMPLE|Example security|Q|N|N|100|N|N\nFile Creation Time: 1012202621:31|||||||\n", "ACT Symbol|Security Name|Exchange|CQS Symbol|ETF|Round Lot Size|Test Issue|NASDAQ Symbol\nOTHER|Other security|N|OTHER|N|100|N|OTHER\nFile Creation Time: 1012202621:31||||||\n"}
	var files []directory.File
	for i, text := range texts {
		file, e := directory.Parse([]string{"nasdaqlisted", "otherlisted"}[i], []byte(text))
		if e != nil {
			return nil, e
		}
		file.FetchedAt = time.Now()
		file.URL = "https://example.invalid/directory"
		files = append(files, file)
	}
	return files, ctx.Err()
}
func setup(t *testing.T) (*Service, *fakeFetcher) {
	t.Helper()
	path := t.TempDir()
	db, e := store.Open(context.Background(), path)
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { db.Close() })
	fetch := &fakeFetcher{}
	return New(db, fetch, path, false), fetch
}
func TestFreshStartupAndDynamicInterval(t *testing.T) {
	ctx := context.Background()
	s, f := setup(t)
	if _, e := s.DB.Sync(ctx, f); e != nil {
		t.Fatal(e)
	}
	f.calls.Store(0)
	last, _ := s.DB.LastSuccess(ctx)
	s.Now = func() time.Time { return last.Add(8 * time.Hour) }
	if e := s.Tick(ctx); e != nil {
		t.Fatal(e)
	}
	if f.calls.Load() != 0 {
		t.Fatal("fresh startup spent network calls")
	}
	cfg, _ := s.DB.Settings(ctx)
	cfg.IntervalHours = 6
	if _, e := s.Save(ctx, cfg); e != nil {
		t.Fatal(e)
	}
	if e := s.Tick(ctx); e != nil {
		t.Fatal(e)
	}
	s.work.Wait()
	if f.calls.Load() != 1 {
		t.Fatal("new interval did not take effect")
	}
	cfg, _ = s.DB.Settings(ctx)
	cfg.Automatic = false
	if _, e := s.Save(ctx, cfg); e != nil {
		t.Fatal(e)
	}
	if e := s.Tick(ctx); e != nil {
		t.Fatal(e)
	}
	s.work.Wait()
	if f.calls.Load() != 1 {
		t.Fatal("disabled schedule still fetched")
	}
}
func TestManualRequestPersistsAndSourceDisable(t *testing.T) {
	ctx := context.Background()
	s, f := setup(t)
	cfg, _ := s.DB.Settings(ctx)
	cfg.Automatic = false
	s.Save(ctx, cfg)
	if e := s.Request(ctx); e != nil {
		t.Fatal(e)
	}
	again := New(s.DB, f, s.DataDir, false)
	state, e := again.State(ctx)
	if e != nil || !state.Queued {
		t.Fatal("lost request across service recreation")
	}
	if e = again.Tick(ctx); e != nil {
		t.Fatal(e)
	}
	again.work.Wait()
	state, _ = again.State(ctx)
	if state.Queued || f.calls.Load() != 1 {
		t.Fatal("manual request did not complete")
	}
	cfg, _ = s.DB.Settings(ctx)
	cfg.DirectoryEnabled = false
	s.Save(ctx, cfg)
	if e = s.Request(ctx); e == nil {
		t.Fatal("disabled source accepted request")
	}
	again.Tick(ctx)
	again.work.Wait()
	if f.calls.Load() != 1 {
		t.Fatal("disabled source fetched")
	}
}
func TestEOFShutdownAndProtocolRedaction(t *testing.T) {
	s, _ := setup(t)
	s.Offline = true
	input := strings.NewReader("{\"id\":1,\"method\":\"status\"}\n{\"id\":2,\"method\":\"arbitrary.shell\",\"params\":{\"secret\":\"never-echo-this\"}}\n")
	var output strings.Builder
	if e := s.Serve(context.Background(), input, &output); e != nil {
		t.Fatal(e)
	}
	if strings.Contains(output.String(), "never-echo-this") {
		t.Fatal("protocol echoed request data")
	}
	decoder := json.NewDecoder(strings.NewReader(output.String()))
	var messages []map[string]any
	for {
		var value map[string]any
		e := decoder.Decode(&value)
		if e == io.EOF {
			break
		}
		if e != nil {
			t.Fatal(e)
		}
		messages = append(messages, value)
	}
	if len(messages) != 3 || messages[0]["event"] != "ready" || messages[2]["error"] == nil {
		t.Fatal("bad protocol/EOF completion")
	}
}
func TestRetryAndOffline(t *testing.T) {
	ctx := context.Background()
	s, f := setup(t)
	run, e := s.DB.Start(ctx, time.Now())
	if e != nil {
		t.Fatal(e)
	}
	s.DB.Fail(ctx, run, io.ErrUnexpectedEOF)
	state, e := s.State(ctx)
	if e != nil {
		t.Fatal(e)
	}
	at, _ := time.Parse(time.RFC3339Nano, state.NextSync)
	if !at.After(time.Now().Add(14 * time.Minute)) {
		t.Fatal("failed request immediately retried")
	}
	s.Tick(ctx)
	s.work.Wait()
	if f.calls.Load() != 0 {
		t.Fatal("backoff ignored")
	}
	s.Offline = true
	if e = s.Request(ctx); e == nil {
		t.Fatal("offline accepted network request")
	}
}

func TestDirectoryReadRPC(t *testing.T) {
	s, f := setup(t)
	ctx := context.Background()
	if _, e := s.DB.Sync(ctx, f); e != nil {
		t.Fatal(e)
	}
	f.calls.Store(0)
	value, e := s.Dispatch(ctx, Request{Method: "directory.list", Params: json.RawMessage(`{"query":"Example","limit":1,"offset":0}`)})
	if e != nil || value.(store.Page).Total != 1 || len(value.(store.Page).Items) != 1 {
		t.Fatal("list RPC", value, e)
	}
	value, e = s.Dispatch(ctx, Request{Method: "directory.get", Params: json.RawMessage(`{"symbol":"EXAMPLE"}`)})
	if e != nil || value.(store.Lookup).Item == nil {
		t.Fatal("lookup RPC", value, e)
	}
	value, e = s.Dispatch(ctx, Request{Method: "directory.contains", Params: json.RawMessage(`{"symbols":["example","EXAMPLE","UNKNOWN"]}`)})
	if e != nil || len(value.([]string)) != 1 || value.([]string)[0] != "EXAMPLE" {
		t.Fatal("membership RPC", value, e)
	}
	value, e = s.Dispatch(ctx, Request{Method: "directory.list", Params: json.RawMessage(`{"query":"","limit":50,"offset":0,"collection":"watchlist","symbols":["OTHER"]}`)})
	if e != nil || value.(store.Page).Total != 1 || value.(store.Page).Items[0].Symbol != "OTHER" {
		t.Fatal("scoped RPC", value, e)
	}
	for _, req := range []Request{
		{Method: "directory.list", Params: json.RawMessage(`{"query":"","limit":50,"offset":0,"collection":"sp500","symbols":["EXAMPLE"]}`)},
		{Method: "directory.list", Params: json.RawMessage(`{"query":"","limit":50,"offset":0,"collection":"other"}`)},
		{Method: "directory.contains", Params: json.RawMessage(`{"symbols":["../private"]}`)},
		{Method: "directory.contains", Params: json.RawMessage(`{"symbols":["EXAMPLE"],"path":"/private"}`)},
		{Method: "directory.list", Params: json.RawMessage(`{"query":"","limit":10000,"offset":0}`)},
		{Method: "directory.get", Params: json.RawMessage(`{"symbol":""}`)},
		{Method: "directory.get", Params: json.RawMessage(`{"symbol":"EXAMPLE","path":"/private"}`)},
	} {
		if _, e = s.Dispatch(ctx, req); e == nil {
			t.Fatal("invalid read accepted", req.Method)
		}
	}
	if f.calls.Load() != 0 {
		t.Fatal("cached reads spent network calls")
	}
}

func TestReadStoredDirectoryAfterRestartWithoutProvider(t *testing.T) {
	ctx := context.Background()
	path := t.TempDir()
	db, e := store.Open(ctx, path)
	if e != nil {
		t.Fatal(e)
	}
	source := &fakeFetcher{}
	if _, e = db.Sync(ctx, source); e != nil {
		t.Fatal(e)
	}
	db.Close()
	db, e = store.Open(ctx, path)
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close()
	// Provider unavailable after restart: every UI read must use the durable store.
	unavailable := &fakeFetcher{fail: true}
	service := New(db, unavailable, path, true)
	for _, params := range []string{
		`{"query":"","limit":1,"offset":0}`,
		`{"query":"","limit":1,"offset":1}`,
		`{"query":"Example","limit":50,"offset":0,"collection":"all-us"}`,
		`{"query":"","limit":50,"offset":0,"collection":"watchlist","symbols":["OTHER"]}`,
		`{"query":"","limit":50,"offset":0,"collection":"sp500"}`,
		`{"query":"","limit":50,"offset":0,"collection":"nasdaq100"}`,
	} {
		result, err := service.Dispatch(ctx, Request{Method: "directory.list", Params: json.RawMessage(params)})
		if err != nil || result.(store.Page).SnapshotID == "" {
			t.Fatal("stored list read failed", params, result, err)
		}
	}
	lookup, e := service.Dispatch(ctx, Request{Method: "directory.get", Params: json.RawMessage(`{"symbol":"EXAMPLE"}`)})
	if e != nil || lookup.(store.Lookup).Item == nil {
		t.Fatal("stored exact lookup failed", lookup, e)
	}
	if unavailable.calls.Load() != 0 {
		t.Fatal("a read attempted provider collection")
	}
}

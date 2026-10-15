// Package service owns the app-lifetime scheduler and its private stdio protocol.
package service

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"github.com/ifuryst/aifi/apps/cli/internal/directory"
	"github.com/ifuryst/aifi/apps/cli/internal/research"
	"github.com/ifuryst/aifi/apps/cli/internal/store"
	"io"
	"regexp"
	"strings"
	"sync"
	"time"
)

var directorySymbol = regexp.MustCompile(`(?i)^[A-Z][A-Z0-9.$^/+=-]{0,13}$`)

type State struct {
	Settings      store.Settings     `json:"settings"`
	Directory     store.Status       `json:"directory"`
	Running       bool               `json:"running"`
	Queued        bool               `json:"queued"`
	Offline       bool               `json:"offline"`
	LastSuccess   string             `json:"lastSuccess,omitempty"`
	NextSync      string             `json:"nextSync,omitempty"`
	Credentials   []store.Credential `json:"credentials"`
	DataDir       string             `json:"dataDir"`
	DatabaseBytes int64              `json:"databaseBytes"`
}
type Service struct {
	DB           *store.Store
	Fetcher      directory.Fetcher
	DataDir      string
	Offline      bool
	Now          func() time.Time
	mutex        sync.Mutex
	running      bool
	automaticRun bool
	cancel       context.CancelFunc
	wake         chan struct{}
	work         sync.WaitGroup
}

func New(db *store.Store, fetcher directory.Fetcher, path string, offline bool) *Service {
	return &Service{DB: db, Fetcher: fetcher, DataDir: path, Offline: offline, Now: time.Now, wake: make(chan struct{}, 1)}
}
func (s *Service) Wake() {
	select {
	case s.wake <- struct{}{}:
	default:
	}
}
func (s *Service) State(ctx context.Context) (State, error) {
	state := State{Offline: s.Offline, DataDir: s.DataDir}
	var err error
	if state.Settings, err = s.DB.Settings(ctx); err != nil {
		return state, err
	}
	if state.Directory, err = s.DB.Status(ctx); err != nil {
		return state, err
	}
	if state.Credentials, err = s.DB.Credentials(ctx); err != nil {
		return state, err
	}
	if state.DatabaseBytes, err = s.DB.DatabaseBytes(ctx); err != nil {
		return state, err
	}
	if state.Queued, err = s.DB.Requested(ctx); err != nil {
		return state, err
	}
	last, err := s.DB.LastSuccess(ctx)
	if err != nil {
		return state, err
	}
	if !last.IsZero() {
		state.LastSuccess = last.UTC().Format(time.RFC3339Nano)
	}
	lease, err := s.DB.ActiveLease(ctx)
	if err != nil {
		return state, err
	}
	s.mutex.Lock()
	state.Running = s.running || lease.After(s.Now())
	s.mutex.Unlock()
	if state.Settings.DirectoryEnabled && state.Settings.Automatic && !s.Offline {
		due := last.Add(time.Duration(state.Settings.IntervalHours) * time.Hour)
		if last.IsZero() {
			due = s.Now()
		}
		retry, err := s.DB.RetryAfter(ctx, last)
		if err != nil {
			return state, err
		}
		if retry.After(due) {
			due = retry
		}
		if lease.After(due) {
			due = lease
		}
		state.NextSync = due.UTC().Format(time.RFC3339Nano)
	}
	return state, nil
}
func (s *Service) Tick(ctx context.Context) error {
	state, err := s.State(ctx)
	if err != nil {
		return err
	}
	s.mutex.Lock()
	if s.cancel != nil && (!state.Settings.DirectoryEnabled || !state.Settings.Automatic && s.automaticRun) {
		s.cancel()
	}
	s.mutex.Unlock()
	if s.Offline || !state.Settings.DirectoryEnabled || state.Running {
		return nil
	}
	due := state.Queued
	if !due && state.NextSync != "" {
		at, e := time.Parse(time.RFC3339Nano, state.NextSync)
		if e != nil {
			return e
		}
		due = !at.After(s.Now())
	}
	if !due {
		return nil
	}
	s.mutex.Lock()
	if s.running {
		s.mutex.Unlock()
		return nil
	}
	worker, cancel := context.WithCancel(ctx)
	s.running = true
	s.automaticRun = !state.Queued
	s.cancel = cancel
	s.work.Add(1)
	s.mutex.Unlock()
	go func() {
		defer s.work.Done()
		defer cancel()
		_, err := s.DB.Sync(worker, s.Fetcher)
		if state.Queued && ctx.Err() == nil && !errors.Is(err, store.ErrBusy) {
			cleanup, stop := context.WithTimeout(context.Background(), 5*time.Second)
			_ = s.DB.ClearRequest(cleanup)
			stop()
		}
		s.mutex.Lock()
		s.running = false
		s.cancel = nil
		s.mutex.Unlock()
		s.Wake()
	}()
	return nil
}
func (s *Service) Run(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for {
		if ctx.Err() != nil {
			break
		}
		_ = s.Tick(ctx)
		select {
		case <-ctx.Done():
			s.work.Wait()
			return
		case <-ticker.C:
		case <-s.wake:
		}
	}
	s.work.Wait()
}
func (s *Service) Request(ctx context.Context) error {
	cfg, e := s.DB.Settings(ctx)
	if e != nil {
		return e
	}
	if !cfg.DirectoryEnabled {
		return errors.New("directory source is disabled")
	}
	if s.Offline {
		return errors.New("network is paused")
	}
	lease, e := s.DB.ActiveLease(ctx)
	if e != nil {
		return e
	}
	if lease.After(s.Now()) {
		return nil
	}
	if e = s.DB.RequestSync(ctx); e != nil {
		return e
	}
	s.Wake()
	return nil
}
func (s *Service) Save(ctx context.Context, value store.Settings) (store.Settings, error) {
	updated, e := s.DB.SaveSettings(ctx, value)
	if e != nil {
		return updated, e
	}
	s.mutex.Lock()
	if s.cancel != nil && (!updated.DirectoryEnabled || !updated.Automatic && s.automaticRun) {
		s.cancel()
	}
	s.mutex.Unlock()
	if !updated.DirectoryEnabled {
		_ = s.DB.ClearRequest(ctx)
	}
	_ = s.DB.ResetResearchProvider(ctx, "sec")
	s.Wake()
	return updated, nil
}

type Request struct {
	ID     int64           `json:"id"`
	Method string          `json:"method"`
	Params json.RawMessage `json:"params"`
}
type Response struct {
	ID     int64  `json:"id"`
	Result any    `json:"result,omitempty"`
	Error  string `json:"error,omitempty"`
}

func decode(raw json.RawMessage, target any) error {
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()
	if e := decoder.Decode(target); e != nil {
		return errors.New("invalid request parameters")
	}
	if e := decoder.Decode(new(any)); e != io.EOF {
		return errors.New("extra request data")
	}
	return nil
}
func (s *Service) Dispatch(ctx context.Context, req Request) (any, error) {
	switch req.Method {
	case "research.status":
		return s.DB.ResearchStatus(ctx)
	case "research.settings":
		var value store.ResearchConfig
		if e := decode(req.Params, &value); e != nil {
			return nil, e
		}
		return s.DB.SaveResearchConfig(ctx, value)
	case "research.sync":
		if s.Offline {
			return nil, errors.New("network is paused")
		}
		if e := s.DB.RequestResearchSync(ctx); e != nil {
			return nil, e
		}
		return s.DB.ResearchStatus(ctx)
	case "research.read":
		var value struct {
			Symbol string `json:"symbol"`
		}
		if e := decode(req.Params, &value); e != nil {
			return nil, e
		}
		if !directorySymbol.MatchString(value.Symbol) {
			return nil, errors.New("invalid stock symbol")
		}
		return s.DB.ResearchRead(ctx, strings.ToUpper(value.Symbol))
	case "status":
		return s.State(ctx)
	case "settings.save":
		var value store.Settings
		if e := decode(req.Params, &value); e != nil {
			return nil, e
		}
		return s.Save(ctx, value)
	case "directory.sync":
		if e := s.Request(ctx); e != nil {
			return nil, e
		}
		return s.State(ctx)
	case "directory.list":
		var value struct {
			Query  string `json:"query"`
			Limit  int    `json:"limit"`
			Offset int    `json:"offset"`
			store.CollectionSelection
		}
		if e := decode(req.Params, &value); e != nil {
			return nil, e
		}
		return s.DB.ListCollection(ctx, value.Query, value.Limit, value.Offset, value.CollectionSelection)
	case "directory.contains":
		var value struct {
			Symbols []string `json:"symbols"`
		}
		if e := decode(req.Params, &value); e != nil {
			return nil, e
		}
		if len(value.Symbols) > 50 {
			return nil, errors.New("invalid directory batch")
		}
		for _, symbol := range value.Symbols {
			if !directorySymbol.MatchString(symbol) {
				return nil, errors.New("invalid directory symbol")
			}
		}
		return s.DB.Contains(ctx, value.Symbols)
	case "directory.get":
		var value struct {
			Symbol string `json:"symbol"`
		}
		if e := decode(req.Params, &value); e != nil {
			return nil, e
		}
		if len(value.Symbol) == 0 || len(value.Symbol) > 14 || strings.TrimSpace(value.Symbol) != value.Symbol {
			return nil, errors.New("invalid directory symbol")
		}
		for _, r := range value.Symbol {
			if r < 33 || r > 126 || r == '|' {
				return nil, errors.New("invalid directory symbol")
			}
		}
		return s.DB.Get(ctx, value.Symbol)
	case "vault.put":
		var value struct {
			Provider string            `json:"provider"`
			Values   map[string]string `json:"values"`
		}
		if e := decode(req.Params, &value); e != nil {
			return nil, e
		}
		if e := s.DB.PutCredentials(ctx, value.Provider, value.Values); e != nil {
			return nil, e
		}
		_ = s.DB.ResetResearchProvider(ctx, value.Provider)
		return s.DB.Credentials(ctx)
	case "vault.remove":
		var value struct {
			Provider string `json:"provider"`
		}
		if e := decode(req.Params, &value); e != nil {
			return nil, e
		}
		if e := s.DB.RemoveCredentials(ctx, value.Provider); e != nil {
			return nil, e
		}
		_ = s.DB.ResetResearchProvider(ctx, value.Provider)
		return s.DB.Credentials(ctx)
	default:
		return nil, errors.New("unsupported data method")
	}
}
func (s *Service) Serve(ctx context.Context, input io.Reader, output io.Writer) error {
	ctx, stop := context.WithCancel(ctx)
	defer stop()
	researchDone := make(chan struct{})
	go func() { research.New(s.DB, s.DataDir, s.Offline).Run(ctx); close(researchDone) }()
	defer func() { stop(); <-researchDone }()
	done := make(chan struct{})
	go func() { s.Run(ctx); close(done) }()
	if closer, ok := input.(io.ReadCloser); ok {
		go func() { <-ctx.Done(); _ = closer.Close() }()
	}
	encoder := json.NewEncoder(output)
	if e := encoder.Encode(map[string]any{"event": "ready"}); e != nil {
		stop()
		<-done
		return e
	}
	scanner := bufio.NewScanner(input)
	scanner.Buffer(make([]byte, 4096), 64<<10)
	for scanner.Scan() {
		var req Request
		if e := decode(scanner.Bytes(), &req); e != nil {
			if e = encoder.Encode(Response{Error: "invalid request"}); e != nil {
				break
			}
			continue
		}
		request, finish := context.WithTimeout(ctx, 15*time.Second)
		result, e := s.Dispatch(request, req)
		finish()
		response := Response{ID: req.ID, Result: result}
		if e != nil {
			response.Result = nil
			response.Error = e.Error()
		}
		if e = encoder.Encode(response); e != nil {
			stop()
			<-done
			return e
		}
	}
	stop()
	<-done
	if ctx.Err() != nil {
		return nil
	}
	return scanner.Err()
}

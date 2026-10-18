package service

import (
	"context"
	"encoding/json"
	"io"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestDirectoryRPCBypassesSlowOrderedRequests(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	input, send := io.Pipe()
	output, receive := io.Pipe()
	defer output.Close()
	defer send.Close()
	started := make(chan struct{})
	release := make(chan struct{})
	done := make(chan error, 1)
	var mu sync.Mutex
	var order []string
	go func() {
		done <- serveRequests(ctx, input, receive, func(ctx context.Context, req Request) (any, error) {
			if req.Method == "slow" {
				close(started)
				select {
				case <-release:
				case <-ctx.Done():
					return nil, ctx.Err()
				}
			}
			if req.Method == "slow" || req.Method == "mutation" {
				mu.Lock()
				order = append(order, req.Method)
				mu.Unlock()
			}
			return req.Method, nil
		})
		receive.Close()
	}()
	decoder := json.NewDecoder(output)
	var ready map[string]any
	if err := decoder.Decode(&ready); err != nil || ready["event"] != "ready" {
		t.Fatalf("ready: %v %v", ready, err)
	}
	go func() {
		_, _ = io.WriteString(send, "{\"id\":1,\"method\":\"slow\"}\n{\"id\":2,\"method\":\"mutation\"}\n")
		<-started
		_, _ = io.WriteString(send, "{\"id\":3,\"method\":\"directory.list\"}\n{\"id\":4,\"method\":\"research.read\"}\n")
		_ = send.Close()
	}()
	var response Response
	seen := map[int64]bool{}
	for len(seen) < 2 {
		if err := decoder.Decode(&response); err != nil {
			t.Fatal(err)
		}
		if (response.ID != 3 && response.ID != 4) || response.Error != "" || seen[response.ID] {
			t.Fatalf("stock read waited behind general lane or lost correlation: %+v", response)
		}
		seen[response.ID] = true
	}
	close(release)
	for _, id := range []int64{1, 2} {
		if err := decoder.Decode(&response); err != nil || response.ID != id {
			t.Fatalf("general order changed: %+v %v", response, err)
		}
	}
	if err := <-done; err != nil {
		t.Fatal(err)
	}
	if strings.Join(order, ",") != "slow,mutation" {
		t.Fatal(order)
	}
}

func TestRPCCancellationReleasesWorkerAndClosesInput(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	input, send := io.Pipe()
	defer send.Close()
	var output strings.Builder
	started := make(chan struct{})
	done := make(chan error, 1)
	go func() {
		done <- serveRequests(ctx, input, &output, func(ctx context.Context, req Request) (any, error) {
			close(started)
			<-ctx.Done()
			return nil, ctx.Err()
		})
	}()
	_, _ = io.WriteString(send, "{\"id\":1,\"method\":\"directory.list\"}\n")
	<-started
	cancel()
	select {
	case err := <-done:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(time.Second):
		t.Fatal("cancel did not release RPC workers")
	}
}

type rpcEvents chan []byte

func (events rpcEvents) Write(value []byte) (int, error) {
	events <- append([]byte(nil), value...)
	return len(value), nil
}
func TestRPCQueuesStayBoundedAndOverloadDoesNotBlockDirectory(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	release := make(chan struct{})
	events := make(rpcEvents, 100)
	var lines strings.Builder
	for i := 1; i <= 40; i++ {
		_ = json.NewEncoder(&lines).Encode(Request{ID: int64(i), Method: "slow"})
	}
	_ = json.NewEncoder(&lines).Encode(Request{ID: 41, Method: "directory.get"})
	done := make(chan error, 1)
	go func() {
		done <- serveRequests(ctx, strings.NewReader(lines.String()), events, func(ctx context.Context, req Request) (any, error) {
			if req.Method == "slow" {
				select {
				case <-release:
				case <-ctx.Done():
					return nil, ctx.Err()
				}
			}
			return req.Method, nil
		})
	}()
	seen := map[int64]bool{}
	busy := 0
	for !seen[41] {
		select {
		case value := <-events:
			var response Response
			if err := json.Unmarshal(value, &response); err != nil {
				t.Fatal(err)
			}
			if response.ID == 0 {
				continue
			}
			if seen[response.ID] {
				t.Fatal("duplicate response")
			}
			seen[response.ID] = true
			if response.Error != "" {
				busy++
			}
		case <-ctx.Done():
			t.Fatal("directory blocked behind saturated general queue")
		}
	}
	if busy < 7 {
		t.Fatalf("general queue grew beyond its bound: %d rejected", busy)
	}
	close(release)
	if err := <-done; err != nil {
		t.Fatal(err)
	}
	for len(seen) < 41 {
		select {
		case value := <-events:
			var response Response
			if err := json.Unmarshal(value, &response); err != nil {
				t.Fatal(err)
			}
			if response.ID == 0 || seen[response.ID] {
				t.Fatal("duplicate/missing response")
			}
			seen[response.ID] = true
		default:
			t.Fatalf("accepted work was not drained on EOF: %d responses", len(seen))
		}
	}
}

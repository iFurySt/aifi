package service

import (
	"bufio"
	"context"
	"encoding/json"
	"io"
	"sync"
	"time"
)

type queuedRequest struct {
	request  Request
	deadline time.Time
}

// Query-only directory and research reads bypass the ordered general lane. Requests
// retain their IDs; both queues and worker counts are bounded.
func serveRequests(ctx context.Context, input io.Reader, output io.Writer, dispatch func(context.Context, Request) (any, error)) error {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	if closer, ok := input.(io.ReadCloser); ok {
		go func() { <-ctx.Done(); _ = closer.Close() }()
	}
	encoder := json.NewEncoder(output)
	var outputMu sync.Mutex
	var outputError error
	write := func(value any) {
		outputMu.Lock()
		defer outputMu.Unlock()
		if outputError != nil {
			return
		}
		if err := encoder.Encode(value); err != nil {
			outputError = err
			cancel()
		}
	}
	write(map[string]any{"event": "ready"})
	if outputError != nil {
		return outputError
	}
	general := make(chan queuedRequest, 32)
	research := make(chan queuedRequest, 16)
	directory := make(chan queuedRequest, 32)
	var workers sync.WaitGroup
	worker := func(queue <-chan queuedRequest) {
		defer workers.Done()
		for job := range queue {
			if ctx.Err() != nil {
				return
			}
			request, finish := context.WithDeadline(ctx, job.deadline)
			var result any
			err := request.Err()
			if err == nil {
				result, err = dispatch(request, job.request)
			}
			finish()
			response := Response{ID: job.request.ID, Result: result}
			if err != nil {
				response.Result = nil
				response.Error = err.Error()
			}
			write(response)
		}
	}
	workers.Add(4)
	go worker(general)
	go worker(research)
	go worker(directory)
	go worker(directory)
	scanner := bufio.NewScanner(input)
	scanner.Buffer(make([]byte, 4096), 64<<10)
	for scanner.Scan() {
		if ctx.Err() != nil {
			break
		}
		var req Request
		if err := decode(scanner.Bytes(), &req); err != nil {
			write(Response{Error: "invalid request"})
			continue
		}
		queue := general
		switch req.Method {
		case "research.read":
			queue = research
		case "directory.list", "directory.get", "directory.contains":
			queue = directory
		}
		select {
		case queue <- queuedRequest{req, time.Now().Add(15 * time.Second)}:
		default:
			write(Response{ID: req.ID, Error: "Local data requests busy. Try again."})
		}
	}
	close(general)
	close(research)
	close(directory)
	// EOF drains accepted requests; cancellation stops pending work.
	workers.Wait()
	if outputError != nil {
		return outputError
	}
	if ctx.Err() != nil {
		return nil
	}
	return scanner.Err()
}

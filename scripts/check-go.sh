#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${repo_root}/apps/cli"
export GOWORK=off
format_errors="$(gofmt -l ./cmd ./internal)"
if [[ -n "${format_errors}" ]]; then
  printf 'Go files need formatting:\n%s\n' "${format_errors}" >&2
  exit 1
fi
go vet -mod=readonly ./...
go test -mod=readonly -race ./...
CGO_ENABLED=0 go build -mod=readonly -o "${repo_root}/bin/aifi" ./cmd/aifi

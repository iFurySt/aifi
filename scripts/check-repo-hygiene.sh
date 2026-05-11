#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

required_files=(
  ".gitignore"
  ".editorconfig"
  ".gitattributes"
  "CODEOWNERS"
  "CONTRIBUTING.md"
  "SECURITY.md"
  ".github/PULL_REQUEST_TEMPLATE.md"
  ".github/ISSUE_TEMPLATE/bug_report.yml"
  ".github/ISSUE_TEMPLATE/feature_request.yml"
  ".github/ISSUE_TEMPLATE/config.yml"
  ".github/workflows/ci.yml"
  "scripts/check-action-pinning.sh"
  "scripts/check-skills.sh"
)

failed=0

for path in "${required_files[@]}"; do
  if [[ ! -f "${repo_root}/${path}" ]]; then
    echo "missing required file: ${path}"
    failed=1
  fi
done

if grep -q $'\r' "${repo_root}/README.md"; then
  echo "README.md contains CRLF line endings"
  failed=1
fi

if ! grep -q "make ci" "${repo_root}/CONTRIBUTING.md"; then
  echo "CONTRIBUTING.md should mention make ci"
  failed=1
fi

if [[ "${failed}" -ne 0 ]]; then
  exit 1
fi

echo "repo hygiene check passed"

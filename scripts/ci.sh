#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"${repo_root}/scripts/check-docs.sh"
"${repo_root}/scripts/check-repo-hygiene.sh"
"${repo_root}/scripts/check-skills.sh"
"${repo_root}/scripts/check-action-pinning.sh"

while IFS= read -r file; do
  bash -n "$file"
done < <(find "${repo_root}/scripts" -type f -name '*.sh' | sort)

while IFS= read -r file; do
  python3 - "$file" <<'PY'
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
compile(path.read_text(encoding="utf-8"), str(path), "exec")
PY
done < <(find "${repo_root}/scripts" "${repo_root}/skills" -type f -name '*.py' | sort)

if [[ -f "${repo_root}/package.json" ]]; then
  (cd "${repo_root}" && pnpm check && pnpm test && pnpm build)
fi

if [[ -f "${repo_root}/apps/cli/go.mod" ]]; then
  "${repo_root}/scripts/check-go.sh"
fi

if [[ "${AIFI_UI_ACTIVITY:-0}" == "1" ]]; then
  (cd "${repo_root}" && pnpm smoke:stock-activity)
fi

echo "aifi CI checks passed"

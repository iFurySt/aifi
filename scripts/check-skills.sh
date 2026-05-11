#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
skills_dir="${repo_root}/skills"
failed=0
skill_count=0

if [[ ! -d "${skills_dir}" ]]; then
  echo "missing skills directory"
  exit 1
fi

while IFS= read -r -d '' dir; do
  skill_count=$((skill_count + 1))
  skill_name="$(basename "${dir}")"
  skill_file="${dir}/SKILL.md"

  if [[ ! -f "${skill_file}" ]]; then
    echo "missing skill entry point: skills/${skill_name}/SKILL.md"
    failed=1
    continue
  fi

  if [[ ! -s "${skill_file}" ]]; then
    echo "empty skill entry point: skills/${skill_name}/SKILL.md"
    failed=1
  fi

  if ! grep -Eq '^# .+' "${skill_file}"; then
    echo "skill entry point should include a markdown H1: skills/${skill_name}/SKILL.md"
    failed=1
  fi
done < <(find "${skills_dir}" -mindepth 1 -maxdepth 1 -type d -print0 | sort -z)

if [[ "${skill_count}" -eq 0 ]]; then
  echo "skills directory has no skills"
  failed=1
fi

if [[ "${failed}" -ne 0 ]]; then
  exit 1
fi

echo "skills check passed (${skill_count} skills)"

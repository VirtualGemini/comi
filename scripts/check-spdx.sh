#!/bin/sh
# SPDX-License-Identifier: MIT

set -eu

ROOT=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"

list=$(mktemp)
trap 'rm -f "$list"' EXIT HUP INT TERM

{
  find src tests -name '*.ts'
  find scripts -name '*.sh'
  find .githooks -type f
  find .github/workflows -name '*.yml'
  printf '%s\n' Makefile action.yml vitest.config.ts
} >"$list"

status=0
while IFS= read -r file; do
  if ! head -3 "$file" | grep -q 'SPDX-License-Identifier: MIT'; then
    echo "error: missing SPDX header: $file" >&2
    status=1
  fi
done <"$list"

exit "$status"

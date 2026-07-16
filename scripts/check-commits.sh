#!/bin/sh
# SPDX-License-Identifier: MIT

set -eu

if [ "$#" -ne 2 ]; then
  echo "usage: $0 <base-sha> <head-sha>" >&2
  exit 2
fi

ROOT=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"

temporary_message=$(mktemp)
trap 'rm -f "$temporary_message"' EXIT HUP INT TERM

for commit in $(git rev-list --reverse "$1..$2"); do
  git show -s --format=%B "$commit" >"$temporary_message"
  echo "Validating commit $commit"
  ./scripts/validate-commit-message.sh "$temporary_message"
done

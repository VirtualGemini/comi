#!/bin/sh
# SPDX-License-Identifier: MIT

set -eu

ROOT=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
# shellcheck source=scripts/lib/commit-message.sh
. "$ROOT/scripts/lib/commit-message.sh"

if [ "$#" -ne 1 ]; then
  echo "usage: $0 <commit-message-file>" >&2
  exit 2
fi

message=$(cat "$1")
subject=$(message_subject "$message")
pattern='^(feat|fix|build|refactor|style|chore|test|docs|perf|ci|revert)(\([a-z0-9][a-z0-9._/-]*\))?(!)?: .+'

if ! printf '%s\n' "$subject" | grep -Eq "$pattern"; then
  echo "error: commit subject must follow the repository Conventional Commit format" >&2
  exit 1
fi

signoff=$(message_trailer "$message" Signed-off-by)
if ! printf '%s\n' "$signoff" | grep -Eq '^.+ <[^>]+>$'; then
  echo "error: commit message requires a Signed-off-by trailer" >&2
  exit 1
fi

if message_is_breaking "$message" && [ -z "$(message_trailer "$message" BREAKING-CHANGE)" ]; then
  echo "error: breaking changes require a BREAKING-CHANGE trailer describing the migration" >&2
  exit 1
fi

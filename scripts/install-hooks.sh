#!/bin/sh
# SPDX-License-Identifier: MIT

set -eu

ROOT=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"

git config core.hooksPath .githooks
echo "Installed Git hooks from .githooks."

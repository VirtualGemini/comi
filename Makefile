# SPDX-License-Identifier: MIT

SHELL := /bin/sh

.PHONY: bootstrap hooks-install format format-check lint lint-scripts lint-actions \
	typecheck build test check-spdx check-dist check ci clean

bootstrap:
	corepack enable
	corepack pnpm install

hooks-install:
	./scripts/install-hooks.sh

format:
	corepack pnpm run format

format-check:
	corepack pnpm run format:check

lint:
	corepack pnpm run lint

lint-scripts:
	shellcheck scripts/*.sh scripts/lib/*.sh .githooks/*

lint-actions:
	actionlint

typecheck:
	corepack pnpm run typecheck

build:
	corepack pnpm run build

test:
	corepack pnpm run test

check-spdx:
	./scripts/check-spdx.sh

check-dist: build
	@if ! git diff --quiet -- dist \
		|| [ -n "$$(git ls-files --others --exclude-standard -- dist)" ]; then \
		git status --short -- dist; \
		echo "error: dist is out of date; run 'make build' and commit the result" >&2; \
		exit 1; \
	fi

check: format-check lint typecheck lint-scripts lint-actions check-spdx test check-dist

ci: check

clean:
	rm -rf dist coverage

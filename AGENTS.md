## Agent skills

### Issue tracker

Issues live as local markdown files under `.scratch/<feature>/` in this repo. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary — label strings equal the role names (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — one `CONTEXT.md` plus `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Commit policy

Agents must not create commits, push, or rewrite history in this repository. When changes are ready to commit, stop, report the change list, and wait for the user's feedback; the user runs the commit. See `docs/development.md` §8.

# Project rules (reference copy)

The rules that govern how this repo is released and maintained live in the developer's
agent configuration (`~/.config/cline/rules/` and the `/release` skill) so they are loaded
on demand by the coding agent and never become part of the shipped extension. This folder
keeps an identical copy **for documentation and review purposes only** — when the rules
change, update both.

## Contents

- [releases.md](releases.md) — release invariants: no version bump without a changelog
  entry in the same commit, no release push without an annotated `vX.Y.Z` tag, version
  kept in sync via `npm version`, suites must pass first.
- [changelog.md](changelog.md) — changelog management: Keep a Changelog + SemVer,
  user-facing changes only, the exact subheadings, human-centric writing constraints, and
  the on-demand reading rule (`CHANGELOG.md` itself is read only when preparing a release,
  changing a public API, or modifying user-facing features).
- [changelog-placement.md](changelog-placement.md) — unified rule for *where* the changelog
  lives and how it is consumed: root `CHANGELOG.md` as the single source of truth,
  fetched by absolute URL (raw/jsDelivr/GitHub API) or build-time injection — never
  duplicated — and the README link-only discipline (no pasted history, optional automated
  latest-release snippet between `CHANGELOG-START/END` markers).
- The `/release` skill (`.cline/skills/release/SKILL.md` upstream; mirrored in the agent
  config) — the full step-by-step release checklist.

## Why the live copies are outside the repo

The extension is a browser package: anything under the repo root risks being bundled,
shipped, or scanned as product code. Keeping the operative rules in the agent's own
configuration means they load when the agent works on a release and stay invisible to
`build.mjs`, the test suites and the store zips. This directory is the human-readable
mirror.
